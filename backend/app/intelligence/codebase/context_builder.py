"""
Kavach Codebase Intelligence — Step 1.10: Cross-File Context Builder
Assembles multi-file dataflow, call-chains, and code snippets into an authoritative
context bundle for security agents and LLMs.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

from app.intelligence.codebase.symbol_index import SymbolIndex
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine
from app.intelligence.codebase.hybrid_retriever import HybridRetriever


@dataclass
class CrossFileDataflowContext:
    query: str
    summary: str
    total_endpoints_analyzed: int
    dataflow_paths_found: int
    findings: List[Dict[str, Any]] = field(default_factory=list)
    relevant_chunks: List[Dict[str, Any]] = field(default_factory=list)
    formatted_agent_prompt: str = ""


class CrossFileContextBuilder:
    """
    Step 1.10: Cross-File Context Builder for AI Agents.
    """

    def __init__(
        self,
        symbol_index: SymbolIndex,
        dep_graph: DependencyGraphEngine,
        hybrid_retriever: HybridRetriever,
    ):
        self.symbol_index = symbol_index
        self.dep_graph = dep_graph
        self.hybrid_retriever = hybrid_retriever

    def build_cross_file_taint_context(
        self,
        query: str,
        sink_keyword: str = "execute",
    ) -> CrossFileDataflowContext:
        """
        Builds complete multi-file context tracing endpoints to sinks.
        Handles: 'Find all API endpoints where user input reaches an SQL query without sanitization'
        """
        # 1. Trace all dataflow paths in graph
        flow_paths = self.dep_graph.trace_dataflow_to_sinks(sink_keyword)

        # 2. Retrieve relevant hybrid chunks
        chunks = self.hybrid_retriever.retrieve(query, top_k=6)

        # 3. Format structured agent prompt
        lines = [
            f"# KAVACH CODEBASE CROSS-FILE INTELLIGENCE CONTEXT",
            f"Query: {query}",
            f"Detected Cross-File Execution Paths: {len(flow_paths)}",
            "",
            "## CROSS-FILE CALL & DATAFLOW PATHS:",
        ]

        if not flow_paths:
            lines.append("No direct call graph path found between registered endpoints and target sinks.")
        else:
            for idx, fp in enumerate(flow_paths, 1):
                ep_method = fp.get("endpoint_method") or "HTTP"
                ep_path = fp.get("endpoint_path") or fp.get("endpoint_name")
                lines.append(f"### Path #{idx}: {ep_method} {ep_path}")
                lines.append(f"- Entrypoint: `{fp.get('endpoint_name')}` in `{fp.get('endpoint_file')}:{fp.get('endpoint_line')}`")
                lines.append(f"- Sink: `{fp.get('sink_name')}` in `{fp.get('sink_file')}`")
                lines.append("- Call Chain:")
                for step in fp.get("call_chain", []):
                    lines.append(f"    ↳ `{step.get('name')}` ({step.get('file')}:{step.get('line')})")
                lines.append("")

        lines.append("## RELEVANT CODE SNIPPETS:")
        for chk in chunks:
            lines.append(f"### {chk['context_header']}")
            lines.append("```" + chk['language'].lower())
            lines.append(chk['content'][:1500])
            lines.append("```")
            lines.append("")

        prompt_str = "\n".join(lines)

        summary = (
            f"Discovered {len(flow_paths)} cross-file dataflow path(s) reaching '{sink_keyword}' sinks. "
            f"Context assembled from {len(chunks)} relevant code chunks across repository."
        )

        return CrossFileDataflowContext(
            query=query,
            summary=summary,
            total_endpoints_analyzed=len(self.symbol_index.get_endpoints()),
            dataflow_paths_found=len(flow_paths),
            findings=flow_paths,
            relevant_chunks=chunks,
            formatted_agent_prompt=prompt_str,
        )

