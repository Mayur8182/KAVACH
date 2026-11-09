"""
Kavach Codebase Intelligence — Step 1.6: Syntax-Aware Code Chunker
Decomposes source files into semantic, syntactically-bounded code chunks.
Preserves function boundaries, class scopes, line numbers, and context breadcrumbs.
"""

import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

from app.intelligence.codebase.ingestion import IngestedFile
from app.intelligence.codebase.ast_parser import CodeFileAST, ASTFunction, ASTClass


@dataclass
class CodeChunk:
    chunk_id: str
    file_path: str
    language: str
    start_line: int
    end_line: int
    chunk_type: str  # "FUNCTION", "CLASS", "MODULE_HEADER", "GENERIC_BLOCK"
    symbol_name: Optional[str]
    content: str
    context_header: str
    token_estimate: int


class CodeChunker:
    """
    Step 1.6: Syntax-Aware Code Chunker.
    """

    MAX_CHUNK_LINES = 120
    MIN_CHUNK_LINES = 5

    @classmethod
    def chunk_file(cls, file: IngestedFile, ast_obj: Optional[CodeFileAST] = None) -> List[CodeChunk]:
        chunks: List[CodeChunk] = []
        lines = file.content.splitlines()
        total_lines = len(lines)

        if total_lines == 0:
            return []

        # If AST was provided and contains functions/classes, use syntax boundaries
        if ast_obj and (ast_obj.classes or ast_obj.functions):
            covered_lines = set()

            # 1. Chunk module header (imports, globals)
            import_end = max([imp.line_number for imp in ast_obj.imports], default=0)
            if import_end > 0:
                header_lines = lines[:import_end]
                header_text = "\n".join(header_lines)
                cid = cls._generate_chunk_id(file.relative_path, 1, import_end, "MODULE_HEADER")
                chunks.append(CodeChunk(
                    chunk_id=cid,
                    file_path=file.relative_path,
                    language=ast_obj.language,
                    start_line=1,
                    end_line=import_end,
                    chunk_type="MODULE_HEADER",
                    symbol_name="<imports>",
                    content=header_text,
                    context_header=f"// File: {file.relative_path} (Imports & Module Declarations)",
                    token_estimate=len(header_text.split()),
                ))
                for l in range(1, import_end + 1):
                    covered_lines.add(l)

            # 2. Chunk individual functions
            for fn in ast_obj.functions:
                s_line = max(1, fn.line_start)
                e_line = min(total_lines, fn.line_end)
                fn_lines = lines[s_line - 1:e_line]
                fn_text = "\n".join(fn_lines)

                cid = cls._generate_chunk_id(file.relative_path, s_line, e_line, "FUNCTION")
                chunks.append(CodeChunk(
                    chunk_id=cid,
                    file_path=file.relative_path,
                    language=ast_obj.language,
                    start_line=s_line,
                    end_line=e_line,
                    chunk_type="FUNCTION",
                    symbol_name=fn.name,
                    content=fn_text,
                    context_header=f"// File: {file.relative_path} > function {fn.name}() (Lines {s_line}-{e_line})",
                    token_estimate=len(fn_text.split()),
                ))
                for l in range(s_line, e_line + 1):
                    covered_lines.add(l)

            # 3. Chunk class methods / class scopes
            for c in ast_obj.classes:
                for m in c.methods:
                    s_line = max(1, m.line_start)
                    e_line = min(total_lines, m.line_end)
                    m_lines = lines[s_line - 1:e_line]
                    m_text = "\n".join(m_lines)

                    cid = cls._generate_chunk_id(file.relative_path, s_line, e_line, "METHOD")
                    chunks.append(CodeChunk(
                        chunk_id=cid,
                        file_path=file.relative_path,
                        language=ast_obj.language,
                        start_line=s_line,
                        end_line=e_line,
                        chunk_type="METHOD",
                        symbol_name=f"{c.name}.{m.name}",
                        content=m_text,
                        context_header=f"// File: {file.relative_path} > class {c.name} > method {m.name}() (Lines {s_line}-{e_line})",
                        token_estimate=len(m_text.split()),
                    ))
                    for l in range(s_line, e_line + 1):
                        covered_lines.add(l)

            # 4. Handle uncovered lines (e.g. scripts or top-level logic)
            uncovered = sorted(set(range(1, total_lines + 1)) - covered_lines)
            if uncovered:
                # Group contiguous blocks
                blocks = cls._group_contiguous(uncovered)
                for blk in blocks:
                    s_line, e_line = blk[0], blk[-1]
                    blk_lines = lines[s_line - 1:e_line]
                    blk_text = "\n".join(blk_lines).strip()
                    if len(blk_text) > 10:
                        cid = cls._generate_chunk_id(file.relative_path, s_line, e_line, "BLOCK")
                        chunks.append(CodeChunk(
                            chunk_id=cid,
                            file_path=file.relative_path,
                            language=ast_obj.language,
                            start_line=s_line,
                            end_line=e_line,
                            chunk_type="BLOCK",
                            symbol_name=None,
                            content=blk_text,
                            context_header=f"// File: {file.relative_path} (Lines {s_line}-{e_line})",
                            token_estimate=len(blk_text.split()),
                        ))

            return sorted(chunks, key=lambda c: c.start_line)

        # Fallback: Sliding window chunking for non-AST files (e.g. yaml, configs, markdown)
        return cls._sliding_window_chunk(file, lines)

    @classmethod
    def _sliding_window_chunk(cls, file: IngestedFile, lines: List[str]) -> List[CodeChunk]:
        chunks = []
        total_lines = len(lines)
        step = 60
        window = 80

        for i in range(0, total_lines, step):
            s_line = i + 1
            e_line = min(i + window, total_lines)
            chunk_lines = lines[s_line - 1:e_line]
            content = "\n".join(chunk_lines).strip()

            if not content:
                continue

            cid = cls._generate_chunk_id(file.relative_path, s_line, e_line, "GENERIC_BLOCK")
            chunks.append(CodeChunk(
                chunk_id=cid,
                file_path=file.relative_path,
                language=file.extension.replace(".", ""),
                start_line=s_line,
                end_line=e_line,
                chunk_type="GENERIC_BLOCK",
                symbol_name=None,
                content=content,
                context_header=f"// File: {file.relative_path} (Lines {s_line}-{e_line})",
                token_estimate=len(content.split()),
            ))

        return chunks

    @classmethod
    def _group_contiguous(cls, nums: List[int]) -> List[List[int]]:
        if not nums:
            return []
        groups = [[nums[0]]]
        for x in nums[1:]:
            if x == groups[-1][-1] + 1:
                groups[-1].append(x)
            else:
                groups.append([x])
        return groups

    @classmethod
    def _generate_chunk_id(cls, path: str, start: int, end: int, ctype: str) -> str:
        raw = f"{path}:{start}:{end}:{ctype}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

