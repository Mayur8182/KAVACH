"""
THING Control Plane — Autonomous Agent Runner Engine
Coordinates the complete agent reasoning and execution lifecycle:
Task Prompt -> Context Ingestion -> LLM Reasoning -> MCP Security Gateway -> Real Tool Execution -> Evidence Persistence
Strictly enforces: "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
"""

import uuid
import logging
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agent.llm_client import AgentLLMClient
from app.agent.prompts import get_agent_system_prompt
from app.agent.models import (
    AgentWEntity,
    AgentWSession,
    AgentWAction,
    AgentWAuditEvent,
    AgentWEvidence,
)
from app.models.agent import Agent
from app.mcp.gateway import MCPGateway
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.registry import default_tool_registry

logger = logging.getLogger("thing.agent.runner")


class AgentRunResult:
    """Standardized result returned by the Agent Runner."""
    def __init__(
        self,
        session_id: str,
        agent_id: str,
        agent_name: str,
        status: str,
        task: str,
        steps: List[Dict[str, Any]],
        final_response: str,
        approval_ticket: Optional[Dict[str, Any]] = None,
        duration_ms: int = 0,
        engine: str = "Unknown",
    ):
        self.session_id = session_id
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.status = status  # COMPLETED | WAITING_FOR_APPROVAL | FAILED
        self.task = task
        self.steps = steps
        self.final_response = final_response
        self.approval_ticket = approval_ticket
        self.duration_ms = duration_ms
        self.engine = engine

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "status": self.status,
            "task": self.task,
            "steps_count": len(self.steps),
            "steps": self.steps,
            "final_response": self.final_response,
            "approval_ticket": self.approval_ticket,
            "duration_ms": self.duration_ms,
            "engine": self.engine,
        }


class AgentRunner:
    """
    Production-grade Autonomous Agent Execution Runner.
    Dispatches agent actions exclusively through the MCP Security Gateway.
    """

    def __init__(self, db: AsyncSession, llm_client: Optional[AgentLLMClient] = None):
        self.db = db
        self.llm = llm_client or AgentLLMClient()
        self.gateway = MCPGateway(db, default_tool_registry)

    async def _resolve_or_create_agent(
        self,
        project_id: uuid.UUID,
        agent_identifier: str,
    ) -> AgentWEntity:
        """Finds existing agent by name, agent_id, or UUID; seeds standard entity if missing."""
        # 1. Try finding by UUID
        try:
            target_uuid = uuid.UUID(agent_identifier)
            stmt = select(AgentWEntity).where(
                AgentWEntity.id == target_uuid,
                AgentWEntity.project_id == project_id,
            )
            entity = (await self.db.execute(stmt)).scalars().first()
            if entity:
                return entity
        except ValueError:
            pass

        # 2. Try finding by agent_id or name
        stmt = select(AgentWEntity).where(
            (AgentWEntity.agent_id == agent_identifier) | (AgentWEntity.name == agent_identifier),
            AgentWEntity.project_id == project_id,
        )
        entity = (await self.db.execute(stmt)).scalars().first()
        if entity:
            return entity

        # 3. Create default entity for this role
        clean_name = agent_identifier.lower().replace("_", "-")
        new_entity = AgentWEntity(
            id=uuid.uuid4(),
            project_id=project_id,
            name=clean_name,
            agent_id=f"agt_{clean_name}",
            identity_uri=f"agent://security/{clean_name}",
            description=f"Autonomous security agent operating in role {clean_name}",
            status="ACTIVE",
            protection_state="PROTECTED",
            risk_level="MEDIUM",
            capabilities=["READ", "EXECUTE"],
        )
        self.db.add(new_entity)
        await self.db.flush()
        return new_entity

    async def _ensure_mcp_core_agent(
        self,
        project_id: uuid.UUID,
        agent_entity: AgentWEntity,
    ) -> uuid.UUID:
        """
        Ensures a corresponding core `Agent` row exists in the `agents` table
        for MCP session authentication and identity resolution.
        """
        stmt = select(Agent).where(
            Agent.id == agent_entity.id,
            Agent.project_id == project_id,
        )
        core_agent = (await self.db.execute(stmt)).scalars().first()
        if not core_agent:
            core_agent = Agent(
                id=agent_entity.id,
                project_id=project_id,
                name=agent_entity.name,
                agent_type=agent_entity.name,
                description=agent_entity.description,
                status="active",
                trust_level="standard",
            )
            self.db.add(core_agent)
            await self.db.flush()
        return core_agent.id

    async def run(
        self,
        project_id: uuid.UUID,
        agent_identifier: str,
        task_prompt: str,
        max_turns: int = 6,
    ) -> AgentRunResult:
        """
        Executes an autonomous agent task loop.
        Guarantees that every tool invocation passes through the 10-step MCP Gateway.
        """
        start_time = datetime.now(timezone.utc)

        # 1. Resolve Agent Entity
        agent_entity = await self._resolve_or_create_agent(project_id, agent_identifier)
        await self._ensure_mcp_core_agent(project_id, agent_entity)

        # 2. Create Active MCP Session
        mcp_session = await self.gateway.authenticator.create_session(
            agent_id=agent_entity.id,
            project_id=project_id,
            authenticated_principal=f"runner:{agent_entity.name}",
            client_name="thing-autonomous-runner",
            client_version="1.0.0",
        )

        # 3. Create AgentWSession tracking record
        w_session = AgentWSession(
            id=uuid.uuid4(),
            agent_entity_id=agent_entity.id,
            project_id=project_id,
            session_id=str(mcp_session.id),
            trigger=task_prompt[:255],
            trigger_type="TASK_RUNNER",
            environment_id="production",
            status="ACTIVE",
            risk_level=agent_entity.risk_level,
        )
        self.db.add(w_session)
        await self.db.commit()

        # 4. Resolve Permitted Tools
        mcp_context = await self.gateway.authenticator.authenticate_session(mcp_session.id)
        permitted_tools = await self.gateway.list_available_tools(mcp_context)
        if not permitted_tools:
            # Fall back to all enabled tools if agent has baseline permissions
            permitted_tools = default_tool_registry.list_tools()

        # 5. Initialize Conversation & Prompts
        system_prompt = get_agent_system_prompt(agent_entity.name)
        history: List[Dict[str, Any]] = [
            {"role": "user", "content": f"Project ID: {project_id}\nTarget Task: {task_prompt}"}
        ]

        steps: List[Dict[str, Any]] = []
        final_answer = ""
        approval_ticket = None
        current_status = "COMPLETED"
        used_engine = "Unknown"

        # 6. Autonomous ReAct Execution Loop
        for turn in range(max_turns):
            step_result = await self.llm.generate_agent_step(
                system_prompt=system_prompt,
                conversation_history=history,
                available_tools=permitted_tools,
            )
            used_engine = step_result.get("engine", used_engine)

            if step_result.get("type") == "tool_call":
                tool_name = step_result.get("tool_name", "")
                raw_args = step_result.get("arguments", {})
                thought = step_result.get("thought", "")

                # Ensure project_id is populated in arguments
                if isinstance(raw_args, dict) and "project_id" not in raw_args:
                    raw_args["project_id"] = str(project_id)

                step_record = {
                    "turn": turn + 1,
                    "type": "tool_call",
                    "tool": tool_name,
                    "arguments": raw_args,
                    "thought": thought,
                }

                # 7. Dispatched through Gateway (Security Interception)
                try:
                    tool_res: ToolExecutionResult = await self.gateway.invoke_tool(
                        session_id=mcp_session.id,
                        tool_name=tool_name,
                        arguments=raw_args,
                    )
                    step_record["result_status"] = tool_res.status
                    step_record["data"] = tool_res.data
                    step_record["message"] = tool_res.message

                    # Record action audit in DB
                    action_row = AgentWAction(
                        id=uuid.uuid4(),
                        agent_entity_id=agent_entity.id,
                        session_id=w_session.id,
                        project_id=project_id,
                        tool_id=tool_name,
                        tool_name=tool_name,
                        input_payload=raw_args,
                        output_payload=tool_res.data or {"message": tool_res.message},
                        decision="ALLOWED" if tool_res.status != "DENIED" else "BLOCKED",
                        result=tool_res.status,
                    )
                    self.db.add(action_row)
                    await self.db.commit()

                    # Check for mandatory human approval stop
                    if tool_res.status == "REQUIRES_APPROVAL":
                        current_status = "WAITING_FOR_APPROVAL"
                        approval_ticket = {
                            "approval_id": tool_res.approval_id,
                            "tool_name": tool_name,
                            "arguments": raw_args,
                            "reason": tool_res.message,
                        }
                        step_record["requires_approval"] = True
                        steps.append(step_record)
                        final_answer = (
                            f"Action '{tool_name}' requires human operator approval before execution. "
                            f"Approval Ticket ID: {tool_res.approval_id}."
                        )
                        break

                    # Append tool execution observation to LLM history
                    history.append({
                        "role": "model",
                        "function_call": {"name": tool_name, "args": raw_args},
                    })
                    history.append({
                        "role": "function",
                        "function_response": {
                            "name": tool_name,
                            "response": tool_res.data or {"message": tool_res.message},
                        },
                    })
                    steps.append(step_record)

                except Exception as exc:
                    logger.error(f"Gateway tool invocation failed: {exc}", exc_info=True)
                    step_record["result_status"] = "FAILED"
                    step_record["error"] = str(exc)
                    steps.append(step_record)
                    history.append({
                        "role": "user",
                        "content": f"Tool '{tool_name}' failed with error: {str(exc)}. Please summarize findings or adjust strategy.",
                    })

            elif step_result.get("type") == "final_response":
                final_answer = step_result.get("content", "Task completed.")
                steps.append({
                    "turn": turn + 1,
                    "type": "final_response",
                    "content": final_answer,
                    "thought": step_result.get("thought", "Concluded."),
                })
                break

        # If loop ended without explicit final answer
        if not final_answer:
            final_answer = f"Agent completed {len(steps)} action(s). Review audit records for detailed tool outcomes."

        # 8. Update Session Statistics
        end_time = datetime.now(timezone.utc)
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        w_session.status = "COMPLETED" if current_status == "COMPLETED" else "PAUSED"
        w_session.tool_calls = len([s for s in steps if s.get("type") == "tool_call"])
        w_session.last_activity_at = end_time
        await self.db.commit()

        return AgentRunResult(
            session_id=str(w_session.id),
            agent_id=str(agent_entity.id),
            agent_name=agent_entity.name,
            status=current_status,
            task=task_prompt,
            steps=steps,
            final_response=final_answer,
            approval_ticket=approval_ticket,
            duration_ms=duration_ms,
            engine=used_engine,
        )

    async def run_stream(
        self,
        project_id: uuid.UUID,
        agent_identifier: str,
        task_prompt: str,
        max_turns: int = 6,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Asynchronously streams agent execution events in real time.
        Yields structured event dicts: session_init, thought, tool_call, tool_result, approval_required, final_response, done.
        """
        start_time = datetime.now(timezone.utc)

        # 1. Resolve Agent Entity
        agent_entity = await self._resolve_or_create_agent(project_id, agent_identifier)
        await self._ensure_mcp_core_agent(project_id, agent_entity)

        # 2. Create Active MCP Session
        mcp_session = await self.gateway.authenticator.create_session(
            agent_id=agent_entity.id,
            project_id=project_id,
            authenticated_principal=f"stream_runner:{agent_entity.name}",
            client_name="thing-stream-runner",
            client_version="1.0.0",
        )

        # 3. Create AgentWSession tracking record
        w_session = AgentWSession(
            id=uuid.uuid4(),
            agent_entity_id=agent_entity.id,
            project_id=project_id,
            session_id=str(mcp_session.id),
            trigger=task_prompt[:255],
            trigger_type="STREAM_RUNNER",
            environment_id="production",
            status="ACTIVE",
            risk_level=agent_entity.risk_level,
        )
        self.db.add(w_session)
        await self.db.commit()

        yield {
            "event": "session_init",
            "data": {
                "session_id": str(w_session.id),
                "agent_id": str(agent_entity.id),
                "agent_name": agent_entity.name,
                "task": task_prompt,
            },
        }

        # 4. Resolve Permitted Tools
        mcp_context = await self.gateway.authenticator.authenticate_session(mcp_session.id)
        permitted_tools = await self.gateway.list_available_tools(mcp_context)
        if not permitted_tools:
            permitted_tools = default_tool_registry.list_tools()

        # 5. Initialize Conversation & Prompts
        system_prompt = get_agent_system_prompt(agent_entity.name)
        history: List[Dict[str, Any]] = [
            {"role": "user", "content": f"Project ID: {project_id}\nTarget Task: {task_prompt}"}
        ]

        steps: List[Dict[str, Any]] = []
        final_answer = ""
        current_status = "COMPLETED"
        used_engine = "Unknown"

        # 6. Autonomous ReAct Streaming Loop
        for turn in range(max_turns):
            yield {
                "event": "turn_start",
                "data": {"turn": turn + 1, "max_turns": max_turns},
            }

            step_result = await self.llm.generate_agent_step(
                system_prompt=system_prompt,
                conversation_history=history,
                available_tools=permitted_tools,
            )
            used_engine = step_result.get("engine", used_engine)

            if step_result.get("type") == "tool_call":
                tool_name = step_result.get("tool_name", "")
                raw_args = step_result.get("arguments", {})
                thought = step_result.get("thought", "")

                if isinstance(raw_args, dict) and "project_id" not in raw_args:
                    raw_args["project_id"] = str(project_id)

                yield {
                    "event": "thought",
                    "data": {
                        "turn": turn + 1,
                        "thought": thought,
                        "engine": used_engine,
                    },
                }

                yield {
                    "event": "tool_call",
                    "data": {
                        "turn": turn + 1,
                        "tool": tool_name,
                        "arguments": raw_args,
                    },
                }

                # 7. Dispatched through Gateway (Security Interception)
                try:
                    tool_res: ToolExecutionResult = await self.gateway.invoke_tool(
                        session_id=mcp_session.id,
                        tool_name=tool_name,
                        arguments=raw_args,
                    )

                    # Record action audit in DB
                    action_row = AgentWAction(
                        id=uuid.uuid4(),
                        agent_entity_id=agent_entity.id,
                        session_id=w_session.id,
                        project_id=project_id,
                        tool_id=tool_name,
                        tool_name=tool_name,
                        input_payload=raw_args,
                        output_payload=tool_res.data or {"message": tool_res.message},
                        decision="ALLOWED" if tool_res.status != "DENIED" else "BLOCKED",
                        result=tool_res.status,
                    )
                    self.db.add(action_row)
                    await self.db.commit()

                    if tool_res.status == "REQUIRES_APPROVAL":
                        current_status = "WAITING_FOR_APPROVAL"
                        yield {
                            "event": "approval_required",
                            "data": {
                                "turn": turn + 1,
                                "approval_id": tool_res.approval_id,
                                "tool": tool_name,
                                "arguments": raw_args,
                                "reason": tool_res.message,
                            },
                        }
                        break

                    yield {
                        "event": "tool_result",
                        "data": {
                            "turn": turn + 1,
                            "tool": tool_name,
                            "status": tool_res.status,
                            "message": tool_res.message,
                            "data": tool_res.data,
                        },
                    }

                    history.append({
                        "role": "model",
                        "function_call": {"name": tool_name, "args": raw_args},
                    })
                    history.append({
                        "role": "function",
                        "function_response": {
                            "name": tool_name,
                            "response": tool_res.data or {"message": tool_res.message},
                        },
                    })
                    steps.append({"tool": tool_name, "status": tool_res.status})

                except Exception as exc:
                    logger.error(f"Streaming tool invocation failed: {exc}", exc_info=True)
                    yield {
                        "event": "tool_error",
                        "data": {"turn": turn + 1, "tool": tool_name, "error": str(exc)},
                    }
                    history.append({
                        "role": "user",
                        "content": f"Tool '{tool_name}' failed with error: {str(exc)}.",
                    })

            elif step_result.get("type") == "final_response":
                final_answer = step_result.get("content", "Task completed.")
                yield {
                    "event": "final_response",
                    "data": {
                        "turn": turn + 1,
                        "content": final_answer,
                        "thought": step_result.get("thought", ""),
                    },
                }
                break

        end_time = datetime.now(timezone.utc)
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        w_session.status = "COMPLETED" if current_status == "COMPLETED" else "PAUSED"
        w_session.tool_calls = len(steps)
        w_session.last_activity_at = end_time
        await self.db.commit()

        yield {
            "event": "done",
            "data": {
                "session_id": str(w_session.id),
                "status": current_status,
                "duration_ms": duration_ms,
                "steps_count": len(steps),
                "engine": used_engine,
            },
        }

