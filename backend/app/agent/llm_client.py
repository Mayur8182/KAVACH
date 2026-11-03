"""
THING Control Plane — LLM Agent Client
Provides unified LLM reasoning for AI Agents using Google Gemini REST API
with automatic tool calling schema generation and Ollama local fallback.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import get_settings
from app.mcp.schemas import ToolDefinition

logger = logging.getLogger("thing.agent.llm")


class AgentLLMClient:
    """
    Unified LLM Client for Autonomous Security Agents.
    Supports Google Gemini (native function calling) with Ollama fallback.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        ollama_url: Optional[str] = None,
    ):
        settings = get_settings()
        self.api_key = api_key or getattr(settings, "gemini_api_key", None)
        self.gemini_model = model or getattr(settings, "gemini_model", "gemini-2.5-flash-lite")
        self.ollama_url = (ollama_url or getattr(settings, "ollama_base_url", "http://localhost:11434")).rstrip("/")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

        # Candidate Gemini models in order of priority
        self.candidate_models = [
            self.gemini_model,
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-2.5-flash-lite",
        ]
        # Deduplicate while preserving order
        seen = set()
        self.candidate_models = [m for m in self.candidate_models if not (m in seen or seen.add(m))]

    def is_gemini_configured(self) -> bool:
        """Returns True if Gemini API key is configured."""
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def convert_tools_to_gemini_declarations(
        self, tools: List[ToolDefinition]
    ) -> List[Dict[str, Any]]:
        """Converts MCP ToolDefinitions into Gemini functionDeclaration format."""
        declarations = []
        for tool in tools:
            # Clean properties for Gemini schema
            schema = tool.input_schema or {"type": "object", "properties": {}}
            declarations.append({
                "name": tool.name,
                "description": tool.description[:1024] if tool.description else "",
                "parameters": schema,
            })
        return declarations

    async def generate_agent_step(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, Any]],
        available_tools: List[ToolDefinition],
    ) -> Dict[str, Any]:
        """
        Executes a single reasoning step:
        Returns either:
          {"type": "tool_call", "tool_name": "...", "arguments": {...}, "thought": "..."}
        or:
          {"type": "final_response", "content": "...", "thought": "..."}
        """
        if self.is_gemini_configured():
            try:
                return await self._call_gemini_step(system_prompt, conversation_history, available_tools)
            except Exception as exc:
                logger.warning(f"Gemini API call failed: {exc}. Trying Ollama fallback if available.")

        # Ollama / Deterministic Fallback
        return await self._call_ollama_or_fallback(system_prompt, conversation_history, available_tools)

    async def _call_gemini_step(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, Any]],
        available_tools: List[ToolDefinition],
    ) -> Dict[str, Any]:
        """Calls Google Gemini with native function declarations."""
        gemini_tools = []
        if available_tools:
            gemini_tools = [{"functionDeclarations": self.convert_tools_to_gemini_declarations(available_tools)}]

        # Format contents for Gemini multi-turn format
        contents = []
        for msg in conversation_history:
            role = "user" if msg.get("role") in ("user", "human") else "model"
            parts = []
            if msg.get("content"):
                parts.append({"text": str(msg["content"])})
            if msg.get("function_call"):
                parts.append({"functionCall": msg["function_call"]})
            if msg.get("function_response"):
                # Gemini functionResponse message structure
                role = "user"
                parts.append({
                    "functionResponse": {
                        "name": msg["function_response"]["name"],
                        "response": {"result": msg["function_response"]["response"]},
                    }
                })
            if parts:
                contents.append({"role": role, "parts": parts})

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Begin security inspection."}]}]

        payload: Dict[str, Any] = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.9,
                "maxOutputTokens": 2048,
            },
        }
        if gemini_tools:
            payload["tools"] = gemini_tools
            payload["toolConfig"] = {
                "functionCallingConfig": {
                    "mode": "AUTO"
                }
            }

        last_error = None
        async with httpx.AsyncClient(timeout=45.0) as client:
            for model_name in self.candidate_models:
                url = f"{self.base_url}/models/{model_name}:generateContent"
                params = {"key": self.api_key}
                headers = {"Content-Type": "application/json"}

                try:
                    resp = await client.post(url, params=params, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            content = candidates[0].get("content", {})
                            parts = content.get("parts", [])
                            for part in parts:
                                # Check for functionCall
                                if "functionCall" in part:
                                    fn_call = part["functionCall"]
                                    return {
                                        "type": "tool_call",
                                        "tool_name": fn_call.get("name"),
                                        "arguments": fn_call.get("args") or {},
                                        "thought": part.get("text") or "Invoking tool through MCP Gateway.",
                                        "engine": f"Gemini ({model_name})",
                                    }
                                if "text" in part:
                                    text_val = part["text"]
                                    # Fallback check if text is raw JSON tool call
                                    if "tool_name" in text_val and "arguments" in text_val:
                                        try:
                                            parsed = json.loads(text_val)
                                            if "tool_name" in parsed:
                                                return {
                                                    "type": "tool_call",
                                                    "tool_name": parsed["tool_name"],
                                                    "arguments": parsed.get("arguments", {}),
                                                    "thought": parsed.get("thought", "Dispatched tool call."),
                                                    "engine": f"Gemini ({model_name})",
                                                }
                                        except Exception:
                                            pass
                                    return {
                                        "type": "final_response",
                                        "content": text_val,
                                        "thought": "Reasoning complete.",
                                        "engine": f"Gemini ({model_name})",
                                    }
                    else:
                        last_error = f"{model_name} returned {resp.status_code}: {resp.text[:200]}"
                except Exception as exc:
                    last_error = f"{model_name} error: {str(exc)}"

        raise RuntimeError(f"All candidate Gemini models failed. Last error: {last_error}")

    async def _call_ollama_or_fallback(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, Any]],
        available_tools: List[ToolDefinition],
    ) -> Dict[str, Any]:
        """Ollama / Deterministic fallback when Gemini is unavailable."""
        tool_names = [t.name for t in available_tools]

        # Try Ollama endpoint
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.ollama_url}/api/tags")
                if resp.status_code == 200:
                    # Ollama is live, send structured completion
                    tools_desc = "\n".join([f"- {t.name}: {t.description}" for t in available_tools])
                    prompt = f"""{system_prompt}

AVAILABLE TOOLS:
{tools_desc}

CONVERSATION:
{json.dumps(conversation_history, indent=2)}

Decide the next action. Output strict JSON:
If you need a tool:
{{"type": "tool_call", "tool_name": "<name>", "arguments": {{...}}, "thought": "<reason>"}}
If you are finished:
{{"type": "final_response", "content": "<summary>", "thought": "<reason>"}}"""

                    gen_resp = await client.post(
                        f"{self.ollama_url}/api/generate",
                        json={"model": "llama3.2", "prompt": prompt, "format": "json", "stream": False},
                    )
                    if gen_resp.status_code == 200:
                        data = gen_resp.json()
                        result = json.loads(data.get("response", "{}"))
                        result["engine"] = "Ollama (llama3.2)"
                        return result
        except Exception:
            pass

        # Deterministic Safe Fallback
        # If scan tool is available, invoke security scan as standard initial action
        if "run_security_scan" in tool_names:
            return {
                "type": "tool_call",
                "tool_name": "run_security_scan",
                "arguments": {"project_id": "default"},
                "thought": "Deterministic fallback: Initiating baseline security scan via MCP Gateway.",
                "engine": "Deterministic Fallback",
            }

        return {
            "type": "final_response",
            "content": "No LLM provider was reachable and safe deterministic fallback concluded without actions.",
            "thought": "LLM offline.",
            "engine": "Deterministic Fallback",
        }
