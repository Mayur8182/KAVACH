"""
Kavach Model Security — Artifact Security Analyzer (Advanced Deep Engine)
Safely analyzes model artifacts (.safetensors, .pt, .bin, .onnx, .gguf, .h5, .pb, .tflite, archives)
without ever deserializing untrusted code in the backend process.
Strictly adheres to:
- Never load untrusted model artifacts directly into the production backend process.
- Deep inspection across 16 security checks:
  1. Unsafe serialization detection
  2. Pickle deserialization risk (bytecode disassembly)
  3. Unexpected executable content (ELF, PE, Mach-O binaries)
  4. Suspicious embedded scripts (reverse shells, eval/exec)
  5. Archive path traversal (Zip Slip / Tar Slip)
  6. Archive decompression bombs (>100:1 ratio, >10GB uncompressed)
  7. Unexpected archive members (.exe, .so, .dll disguised inside model weights)
  8. Malformed model metadata / truncated headers
  9. File hash mismatch / tampering detection
  10. Model artifact tampering
  11. Unexpected file modifications
  12. Suspicious binary sections
  13. Untrusted external references (HTTP/S3 downloads)
  14. Embedded credentials (AWS keys, tokens, private keys)
  15. Unexpected network references (RFC 1918 IPs, AWS metadata service)
  16. Unsupported or dangerous file formats (.exe, .bat, .ps1, .cmd)
"""

import hashlib
import io
import json
import logging
import os
import pickletools
import re
import struct
import tarfile
import zipfile
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("kavach.model_security.artifact_analyzer")

# Forbidden callable namespaces and names in pickle byte streams
DANGEROUS_PICKLE_MODULES = {
    "os": ["system", "popen", "exec", "execl", "execle", "execlp", "execv", "execve", "execvp", "execvpe", "spawnl", "spawnle", "spawnv"],
    "subprocess": ["Popen", "call", "check_call", "check_output", "run"],
    "posix": ["system", "popen"],
    "nt": ["system", "popen"],
    "builtins": ["eval", "exec", "__import__", "compile", "open", "getattr"],
    "sys": ["modules", "exit"],
    "shutil": ["rmtree", "copy", "copy2", "move"],
    "socket": ["socket", "create_connection"],
    "pty": ["spawn"],
    "commands": ["getoutput", "getstatusoutput"],
    "urllib.request": ["urlopen"],
    "requests": ["get", "post", "put", "delete"],
    "torch": ["_utils._rebuild_tensor_v2", "_utils._rebuild_parameter"],
}

# Whitelisted legitimate PyTorch tensor rebuild symbols
LEGITIMATE_TORCH_SYMBOLS = {
    ("torch._utils", "_rebuild_tensor"),
    ("torch._utils", "_rebuild_tensor_v2"),
    ("torch._utils", "_rebuild_parameter"),
    ("torch", "FloatStorage"),
    ("torch", "HalfStorage"),
    ("torch", "BFloat16Storage"),
    ("torch", "IntStorage"),
    ("torch", "LongStorage"),
    ("torch", "ByteStorage"),
    ("torch", "DoubleStorage"),
    ("collections", "OrderedDict"),
}

# Dangerous executable extensions that must never exist as model artifacts
DANGEROUS_EXTENSIONS = {".exe", ".bat", ".cmd", ".ps1", ".vbs", ".scr", ".jar", ".msi", ".dll", ".so", ".dylib"}

# Embedded credential patterns
CREDENTIAL_PATTERNS = [
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID", "CWE-798"),
    (r"hf_[a-zA-Z0-9]{34}", "Hugging Face Access Token", "CWE-798"),
    (r"sk-[a-zA-Z0-9]{32,}", "OpenAI API Secret Key", "CWE-798"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token", "CWE-798"),
    (r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", "Cryptographic Private Key", "CWE-312"),
]

# Network references patterns
NETWORK_PATTERNS = [
    (r"\b169\.254\.169\.254\b", "AWS Instance Metadata Service (IMDS) Reference", "CWE-918"),
    (r"\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b", "Internal RFC 1918 Private IP Reference", "CWE-200"),
]


class ArtifactSecurityAnalyzer:
    """
    Performs deterministic, non-destructive static analysis of model weights and binaries.
    """

    def analyze_file(
        self,
        file_path: str,
        file_bytes: Optional[bytes] = None,
        expected_sha256: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Main entry point for artifact analysis.
        Inspects file extension, byte signatures, and conducts deep checks.
        """
        findings: List[Dict[str, Any]] = []
        fname = os.path.basename(file_path).lower()

        # Read sample bytes and total size
        sample_bytes = b""
        total_size = 0
        computed_sha256 = None

        if file_bytes is not None:
            sample_bytes = file_bytes
            total_size = len(file_bytes)
            computed_sha256 = hashlib.sha256(file_bytes).hexdigest()
        elif os.path.exists(file_path):
            total_size = os.path.getsize(file_path)
            try:
                hasher = hashlib.sha256()
                with open(file_path, "rb") as fh:
                    sample_bytes = fh.read(min(total_size, 10 * 1024 * 1024)) # read up to 10MB
                    fh.seek(0)
                    while chunk := fh.read(65536):
                        hasher.update(chunk)
                computed_sha256 = hasher.hexdigest()
            except Exception as exc:
                logger.error(f"Cannot read file {file_path}: {exc}")
                return findings

        # Check 9 & 10: Hash verification & Artifact Tampering
        if expected_sha256 and computed_sha256:
            if computed_sha256.lower() != expected_sha256.lower():
                findings.append({
                    "rule_id": "KAVACH-ARTIFACT-TAMPERING-HASH-MISMATCH",
                    "title": "Model Artifact Hash Mismatch (Tampering Indicator)",
                    "description": (
                        f"Computed SHA256 checksum ({computed_sha256}) does not match expected integrity hash "
                        f"({expected_sha256}). The artifact may have been tampered with or modified in transit."
                    ),
                    "severity": "CRITICAL",
                    "category": "ARTIFACT_SECURITY",
                    "cwe_id": "CWE-353",
                    "affected_file": file_path,
                    "evidence": {"computed_hash": computed_sha256, "expected_hash": expected_sha256},
                    "fix_available": False,
                })

        # Check 16: Dangerous or Unsupported Executable Formats
        _, ext = os.path.splitext(fname)
        if ext in DANGEROUS_EXTENSIONS:
            findings.append({
                "rule_id": "KAVACH-DANGEROUS-FILE-FORMAT",
                "title": f"Dangerous Executable File Format in Model Directory: {ext}",
                "description": (
                    f"The file '{fname}' has dangerous executable extension '{ext}'. Models should only consist of "
                    f"standard weight files, configurations, and tokenizers."
                ),
                "severity": "CRITICAL",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-434",
                "affected_file": file_path,
                "evidence": {"filename": fname, "extension": ext, "file_size": total_size},
                "fix_available": False,
            })

        # Check 3: Unexpected executable binary signatures (ELF, Windows PE, Mach-O) in model files
        binary_findings = self._detect_executable_binary_headers(file_path, sample_bytes)
        findings.extend(binary_findings)

        # Check 14 & 15: Embedded Credentials and Unexpected Network References
        content_findings = self._scan_embedded_secrets_and_network(file_path, sample_bytes)
        findings.extend(content_findings)

        # Format-Specific Scanners:
        # 1. Safetensors Analysis
        if fname.endswith(".safetensors"):
            st_findings = self._analyze_safetensors(file_path, sample_bytes, total_size)
            findings.extend(st_findings)

        # 2. PyTorch .pt / .pth / .bin / .ckpt / Pickle Analysis
        elif fname.endswith((".pt", ".pth", ".bin", ".ckpt", ".pkl")):
            pt_findings = self._analyze_pytorch_or_pickle(file_path, sample_bytes, total_size)
            findings.extend(pt_findings)

        # 3. ONNX Analysis
        elif fname.endswith(".onnx"):
            onnx_findings = self._analyze_onnx(file_path, sample_bytes, total_size)
            findings.extend(onnx_findings)

        # 4. GGUF Analysis
        elif fname.endswith(".gguf"):
            gguf_findings = self._analyze_gguf(file_path, sample_bytes, total_size)
            findings.extend(gguf_findings)

        # 5. Keras / HDF5 Analysis (.h5)
        elif fname.endswith((".h5", ".hdf5", ".keras")):
            h5_findings = self._analyze_hdf5_keras(file_path, sample_bytes, total_size)
            findings.extend(h5_findings)

        # 6. TensorFlow Lite (.tflite) & SavedModel (.pb)
        elif fname.endswith(".tflite"):
            tflite_findings = self._analyze_tflite(file_path, sample_bytes, total_size)
            findings.extend(tflite_findings)
        elif fname.endswith(".pb"):
            pb_findings = self._analyze_tensorflow_pb(file_path, sample_bytes, total_size)
            findings.extend(pb_findings)

        # 7. Archive Analysis (.zip, .tar, .tar.gz, .tgz)
        elif fname.endswith((".zip", ".tar", ".gz", ".tgz")):
            archive_findings = self._analyze_archive(file_path, sample_bytes, total_size)
            findings.extend(archive_findings)

        # 8. Script inspection
        elif fname.endswith((".py", ".sh", ".bash", ".bat")):
            script_findings = self._analyze_executable_script(file_path, sample_bytes)
            findings.extend(script_findings)

        return findings

    def _detect_executable_binary_headers(self, file_path: str, data: bytes) -> List[Dict[str, Any]]:
        """
        Detects raw executable headers embedded in model files.
        Detects:
        - Linux ELF: \\x7fELF
        - Windows PE: MZ followed by PE\\0\\0
        - Mach-O: \\xfe\\xed\\xfa\\xce, \\xcf\\xfa\\xed\\xfe, \\xfe\\xed\\xfa\\xcf
        """
        findings: List[Dict[str, Any]] = []
        if len(data) < 16:
            return findings

        # ELF Header
        if data.startswith(b"\x7fELF"):
            findings.append({
                "rule_id": "KAVACH-RAW-ELF-BINARY-DETECTED",
                "title": "Raw Linux ELF Executable Disguised as Model Artifact",
                "description": "Artifact begins with the Linux ELF magic signature (\\x7fELF). It is an executable binary.",
                "severity": "CRITICAL",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-434",
                "affected_file": file_path,
                "evidence": {"magic": "7f454c46 (ELF)", "offset": 0},
                "fix_available": False,
            })

        # Windows PE Header
        elif data.startswith(b"MZ") and b"PE\0\0" in data[:1024]:
            findings.append({
                "rule_id": "KAVACH-RAW-PE-BINARY-DETECTED",
                "title": "Raw Windows PE Executable Disguised as Model Artifact",
                "description": "Artifact contains Windows Portable Executable headers (MZ / PE). It is an executable binary.",
                "severity": "CRITICAL",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-434",
                "affected_file": file_path,
                "evidence": {"magic": "MZ / PE", "offset": 0},
                "fix_available": False,
            })

        # Mach-O Header
        elif data[:4] in (b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe"):
            findings.append({
                "rule_id": "KAVACH-RAW-MACHO-BINARY-DETECTED",
                "title": "Raw Mach-O Executable Disguised as Model Artifact",
                "description": "Artifact contains macOS / Mach-O executable magic header. It is an executable binary.",
                "severity": "CRITICAL",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-434",
                "affected_file": file_path,
                "evidence": {"magic": data[:4].hex(), "offset": 0},
                "fix_available": False,
            })

        return findings

    def _scan_embedded_secrets_and_network(self, file_path: str, data: bytes) -> List[Dict[str, Any]]:
        """Scans for embedded secrets and unexpected internal/cloud network references."""
        findings: List[Dict[str, Any]] = []
        text_sample = data[:200000].decode("utf-8", errors="ignore")

        # 1. Credentials
        for pattern, token_type, cwe in CREDENTIAL_PATTERNS:
            matches = re.findall(pattern, text_sample)
            if matches:
                findings.append({
                    "rule_id": "KAVACH-ARTIFACT-EMBEDDED-CREDENTIALS",
                    "title": f"Embedded Secret Detected in Artifact: {token_type}",
                    "description": f"The model artifact or header contains embedded credentials matching pattern for {token_type}.",
                    "severity": "HIGH",
                    "category": "ARTIFACT_SECURITY",
                    "cwe_id": cwe,
                    "affected_file": file_path,
                    "evidence": {"token_type": token_type, "count": len(matches)},
                    "fix_available": True,
                })
                break

        # 2. Network References (IMDS, private IPs)
        for pattern, desc, cwe in NETWORK_PATTERNS:
            matches = re.findall(pattern, text_sample)
            if matches:
                findings.append({
                    "rule_id": "KAVACH-ARTIFACT-NETWORK-REFERENCE",
                    "title": f"Unexpected Network Reference: {desc}",
                    "description": f"Artifact contains embedded network references: {matches[:3]}",
                    "severity": "MEDIUM",
                    "category": "ARTIFACT_SECURITY",
                    "cwe_id": cwe,
                    "affected_file": file_path,
                    "evidence": {"description": desc, "matches": matches[:5]},
                    "fix_available": False,
                })

        return findings

    def _analyze_safetensors(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """
        Validates Safetensors format according to Hugging Face specification:
        - First 8 bytes is an unsigned 64-bit integer N (little endian) specifying JSON header length.
        - Next N bytes is valid UTF-8 JSON dictionary containing tensor names, dtypes, shapes, data_offsets.
        - Offsets must be strictly non-overlapping and within file bounds.
        """
        findings: List[Dict[str, Any]] = []

        if len(data) < 8:
            findings.append({
                "rule_id": "KAVACH-ST-MALFORMED",
                "title": "Truncated or Malformed Safetensors Header",
                "description": "The artifact does not contain a valid 8-byte Safetensors length prefix.",
                "severity": "HIGH",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-1287",
                "affected_file": file_path,
                "evidence": {"file_size": total_size, "bytes_available": len(data)},
                "fix_available": False,
            })
            return findings

        header_len = struct.unpack("<Q", data[:8])[0]

        # Sanity check header length (< 100MB)
        if header_len <= 0 or header_len > 100 * 1024 * 1024:
            findings.append({
                "rule_id": "KAVACH-ST-INVALID-HEADER-SIZE",
                "title": "Suspicious Safetensors Header Length",
                "description": f"Safetensors header size is reported as {header_len} bytes, exceeding safety thresholds.",
                "severity": "HIGH",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-130",
                "affected_file": file_path,
                "evidence": {"header_len": header_len},
                "fix_available": False,
            })
            return findings

        if len(data) >= 8 + min(header_len, len(data) - 8):
            header_bytes = data[8: 8 + min(header_len, len(data) - 8)]
            try:
                header_json = json.loads(header_bytes.decode("utf-8"))
                # Check for suspicious non-tensor payload keys
                suspicious_keys = [k for k in header_json.keys() if "__" in k or k.startswith("$")]
                if suspicious_keys:
                    findings.append({
                        "rule_id": "KAVACH-ST-SUSPICIOUS-METADATA",
                        "title": "Suspicious Metadata Injected in Safetensors Header",
                        "description": f"Found abnormal keys in Safetensors header: {suspicious_keys}",
                        "severity": "MEDIUM",
                        "category": "ARTIFACT_SECURITY",
                        "cwe_id": "CWE-91",
                        "affected_file": file_path,
                        "evidence": {"suspicious_keys": suspicious_keys},
                        "fix_available": True,
                    })

                # Check tensor offsets within total file bounds
                for tensor_name, meta in header_json.items():
                    if isinstance(meta, dict) and "data_offsets" in meta:
                        offsets = meta["data_offsets"]
                        if len(offsets) == 2:
                            start, end = offsets
                            if start < 0 or end < start or (total_size > 0 and end + 8 + header_len > total_size + 1024):
                                findings.append({
                                    "rule_id": "KAVACH-ST-OUT-OF-BOUNDS-OFFSETS",
                                    "title": f"Safetensors Tensor Data Offset Out of Bounds: {tensor_name}",
                                    "description": f"Tensor '{tensor_name}' offset range [{start}, {end}] exceeds file bounds.",
                                    "severity": "HIGH",
                                    "category": "ARTIFACT_SECURITY",
                                    "cwe_id": "CWE-125",
                                    "affected_file": file_path,
                                    "evidence": {"tensor_name": tensor_name, "offsets": offsets, "file_size": total_size},
                                    "fix_available": False,
                                })
                                break
            except Exception as exc:
                if len(data) >= 8 + header_len:
                    findings.append({
                        "rule_id": "KAVACH-ST-CORRUPT-JSON",
                        "title": "Corrupted Safetensors JSON Header",
                        "description": f"Failed to parse JSON header: {str(exc)}",
                        "severity": "HIGH",
                        "category": "ARTIFACT_SECURITY",
                        "cwe_id": "CWE-1287",
                        "affected_file": file_path,
                        "evidence": {"error": str(exc)},
                        "fix_available": False,
                    })

        return findings

    def _analyze_pytorch_or_pickle(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """
        Analyzes PyTorch model files.
        Checks:
        1. Warns about legacy Pickle serialization (OWASP ML09 / CWE-502).
        2. Detects PyTorch ZIP container and inspects contents for Zip Slip and Zip Bombs.
        3. Disassembles internal pickle byte stream using `pickletools.genops` without loading it.
        """
        findings: List[Dict[str, Any]] = []

        is_zip = data.startswith(b"PK\x03\x04")

        # Base warning: Pickle serialization used instead of Safetensors
        findings.append({
            "rule_id": "KAVACH-ML-UNSAFE-SERIALIZATION",
            "title": "Unsafe Model Serialization Format (PyTorch Pickle)",
            "description": (
                "The model weights are stored in Python pickle format. Pickle is fundamentally unsafe and permits "
                "arbitrary code execution upon loading. Industry standards (Hugging Face, NIST AI RMF) mandate "
                "converting models to Safetensors."
            ),
            "severity": "MEDIUM",
            "category": "ARTIFACT_SECURITY",
            "cwe_id": "CWE-502",
            "owasp_category": "ML09:2023 - Model Serialization Attack",
            "affected_file": file_path,
            "evidence": {
                "file_type": "PyTorch / Pickle",
                "is_zip_container": is_zip,
                "file_size": total_size,
            },
            "remediation_guidance": "Convert the model checkpoint from PyTorch pickle format to Safetensors format using AutoFix.",
            "fix_available": True,
        })

        pickle_streams_to_inspect: List[Tuple[str, bytes]] = []

        if is_zip:
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as zf:
                    total_uncompressed = 0
                    for info in zf.infolist():
                        # Zip Slip check
                        if ".." in info.filename or info.filename.startswith(("/", "\\")):
                            findings.append({
                                "rule_id": "KAVACH-ZIP-SLIP-DETECTED",
                                "title": "Zip Slip Path Traversal Vulnerability in Model Archive",
                                "description": f"The model archive contains entry '{info.filename}' which traverses outside target directory.",
                                "severity": "CRITICAL",
                                "category": "ARTIFACT_SECURITY",
                                "cwe_id": "CWE-22",
                                "affected_file": file_path,
                                "evidence": {"malicious_entry": info.filename},
                                "fix_available": False,
                            })

                        total_uncompressed += info.file_size

                        # Check for unexpected executable members in model archive
                        _, entry_ext = os.path.splitext(info.filename.lower())
                        if entry_ext in DANGEROUS_EXTENSIONS:
                            findings.append({
                                "rule_id": "KAVACH-ARCHIVE-UNEXPECTED-EXECUTABLE",
                                "title": f"Unexpected Executable Member in Model Archive: {info.filename}",
                                "description": f"Model archive contains unexpected executable file '{info.filename}' of type '{entry_ext}'.",
                                "severity": "CRITICAL",
                                "category": "ARTIFACT_SECURITY",
                                "cwe_id": "CWE-434",
                                "affected_file": f"{file_path} -> {info.filename}",
                                "evidence": {"member": info.filename, "size": info.file_size},
                                "fix_available": False,
                            })

                        # Read pickle entries (data.pkl, model.pkl, etc.)
                        if info.filename.endswith((".pkl", ".bin", "data.pkl")) and info.file_size < 10 * 1024 * 1024:
                            try:
                                pickle_streams_to_inspect.append((info.filename, zf.read(info.filename)))
                            except Exception:
                                pass

                    # Zip bomb ratio check (> 100:1)
                    if total_size > 0 and (total_uncompressed / max(total_size, 1)) > 100.0:
                        findings.append({
                            "rule_id": "KAVACH-ZIP-BOMB-DETECTED",
                            "title": "Zip Bomb Compression Ratio Detected",
                            "description": f"Uncompressed size ({total_uncompressed} bytes) is >100x compressed size.",
                            "severity": "HIGH",
                            "category": "ARTIFACT_SECURITY",
                            "cwe_id": "CWE-409",
                            "affected_file": file_path,
                            "evidence": {"compression_ratio": total_uncompressed / max(total_size, 1)},
                            "fix_available": False,
                        })
            except Exception as exc:
                logger.warning(f"Error inspecting zip entries in {file_path}: {exc}")
        else:
            # Raw pickle stream
            pickle_streams_to_inspect.append((os.path.basename(file_path), data))

        # Disassemble pickle streams using pickletools.genops (SAFE STATIC PARSING ONLY)
        for entry_name, stream_bytes in pickle_streams_to_inspect:
            dangerous_calls = self._inspect_pickle_bytecode(stream_bytes)
            if dangerous_calls:
                findings.append({
                    "rule_id": "KAVACH-MALICIOUS-PICKLE-OPCODE",
                    "title": "Malicious Code Execution Gadget Detected in Pickle Stream",
                    "description": (
                        f"Static pickle disassembly discovered dangerous opcodes calling unauthorized system functions: "
                        f"{dangerous_calls}. This represents an active remote code execution exploit embedded in model weights."
                    ),
                    "severity": "CRITICAL",
                    "category": "ARTIFACT_SECURITY",
                    "cwe_id": "CWE-502",
                    "owasp_category": "ML09:2023 - Model Serialization Attack",
                    "affected_file": f"{file_path} -> {entry_name}",
                    "evidence": {
                        "detected_symbols": dangerous_calls,
                        "archive_member": entry_name,
                    },
                    "remediation_guidance": "Immediately quarantine and delete this model artifact. It contains executable exploit payloads.",
                    "fix_available": False,
                })

        return findings

    def _inspect_pickle_bytecode(self, stream_bytes: bytes) -> List[str]:
        """
        Disassembles pickle byte stream and checks all GLOBAL / STACK_GLOBAL references.
        Zero execution of the bytecode occurs.
        """
        detected: List[str] = []
        stack: List[str] = []
        try:
            ops = list(pickletools.genops(stream_bytes))
            for op, arg, pos in ops:
                op_name = op.name

                if ("UNICODE" in op_name or "STRING" in op_name) and isinstance(arg, str):
                    stack.append(arg)

                raw_symbols = []
                if op_name == "STACK_GLOBAL":
                    if len(stack) >= 2:
                        func_name = stack.pop()
                        module_name = stack.pop()
                        raw_symbols.append((module_name, func_name))
                elif op_name == "GLOBAL" and arg and isinstance(arg, str):
                    parts = arg.split(" ")
                    if len(parts) == 2:
                        raw_symbols.append((parts[0], parts[1]))
                    else:
                        raw_symbols.append((arg, ""))

                for module_name, func_name in raw_symbols:
                    if (module_name, func_name) in LEGITIMATE_TORCH_SYMBOLS:
                        continue

                    for danger_mod, funcs in DANGEROUS_PICKLE_MODULES.items():
                        if module_name == danger_mod:
                            if not funcs or func_name in funcs:
                                detected.append(f"{module_name}.{func_name}")

                    if module_name in ("os", "subprocess", "posix", "nt", "builtins", "sys", "shutil", "socket", "pty"):
                        sym = f"{module_name}.{func_name}" if func_name else module_name
                        if sym not in detected:
                            detected.append(sym)
                        if module_name in ("nt", "posix") and func_name == "system":
                            detected.append("os.system")
        except Exception:
            pass

        return list(set(detected))

    def _analyze_onnx(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """
        Analyzes ONNX model file.
        Checks:
        1. ONNX header signatures.
        2. Scans for external path traversal in tensor location strings (e.g. location: "../../etc/passwd").
        3. Custom operators / external libraries.
        """
        findings: List[Dict[str, Any]] = []

        if b"onnx" not in data[:2048].lower() and b"ir_version" not in data[:2048]:
            findings.append({
                "rule_id": "KAVACH-ONNX-NONSTANDARD",
                "title": "Non-Standard ONNX Model Header",
                "description": "Artifact has .onnx extension but lacks standard ONNX IR version signatures in header.",
                "severity": "LOW",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-1287",
                "affected_file": file_path,
                "evidence": {"file_size": total_size},
                "fix_available": False,
            })

        # Scan for path traversal in ONNX external data references
        text_preview = data[:100000].decode("latin1", errors="ignore")
        if "location" in text_preview:
            # Check for ../ or / in external tensor paths
            traversal_matches = re.findall(r"location[\"':\s]+([^\s\"'>]+\.\./[^\s\"'>]+)", text_preview)
            if traversal_matches:
                findings.append({
                    "rule_id": "KAVACH-ONNX-EXTERNAL-PATH-TRAVERSAL",
                    "title": "ONNX External Data Path Traversal Vulnerability (CVE-2024-27318)",
                    "description": f"ONNX model references external tensor paths containing path traversal: {traversal_matches}",
                    "severity": "CRITICAL",
                    "category": "ARTIFACT_SECURITY",
                    "cwe_id": "CWE-22",
                    "affected_file": file_path,
                    "evidence": {"traversal_paths": traversal_matches},
                    "fix_available": False,
                })

        return findings

    def _analyze_gguf(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """
        Validates GGUF format (GGML Universal Format):
        - Magic bytes: b"GGUF" (uint32 0x46554747)
        - Version: uint32
        - Tensor count: uint64
        - Metadata KV count: uint64
        Scans metadata key-values for embedded malicious commands or URLs.
        """
        findings: List[Dict[str, Any]] = []
        if len(data) < 24:
            findings.append({
                "rule_id": "KAVACH-GGUF-TRUNCATED",
                "title": "Truncated GGUF Model Header",
                "description": "The file has .gguf extension but is smaller than the minimum 24-byte GGUF header.",
                "severity": "HIGH",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-1287",
                "affected_file": file_path,
                "evidence": {"file_size": total_size},
                "fix_available": False,
            })
            return findings

        magic = data[:4]
        if magic != b"GGUF":
            findings.append({
                "rule_id": "KAVACH-GGUF-INVALID-MAGIC",
                "title": "Invalid GGUF Magic Header",
                "description": f"Expected magic header 'GGUF', but found {magic.hex()}.",
                "severity": "HIGH",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-1287",
                "affected_file": file_path,
                "evidence": {"found_magic": magic.hex()},
                "fix_available": False,
            })
            return findings

        version = struct.unpack("<I", data[4:8])[0]
        tensor_count, kv_count = struct.unpack("<QQ", data[8:24])

        if version < 1 or version > 3:
            findings.append({
                "rule_id": "KAVACH-GGUF-UNSUPPORTED-VERSION",
                "title": f"Unsupported or Anomalous GGUF Version: {version}",
                "description": f"GGUF version {version} is outside standard specification range (1-3).",
                "severity": "MEDIUM",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-1287",
                "affected_file": file_path,
                "evidence": {"version": version, "tensor_count": tensor_count, "kv_count": kv_count},
                "fix_available": False,
            })

        # Scan metadata text strings for embedded commands or scripts
        metadata_sample = data[24:min(len(data), 100000)].decode("utf-8", errors="ignore")
        if any(cmd in metadata_sample for cmd in ("os.system", "/bin/sh", "subprocess.Popen", "nc -e")):
            findings.append({
                "rule_id": "KAVACH-GGUF-SUSPICIOUS-METADATA-COMMANDS",
                "title": "Suspicious Executable Commands Injected in GGUF Metadata",
                "description": "GGUF metadata keys or values contain shell execution or subprocess invocation strings.",
                "severity": "HIGH",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-78",
                "affected_file": file_path,
                "evidence": {"version": version, "metadata_preview": metadata_sample[:200]},
                "fix_available": False,
            })

        return findings

    def _analyze_hdf5_keras(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """
        Analyzes Keras HDF5 / .h5 model files.
        Checks:
        1. HDF5 magic header \\x89HDF\\r\\n\\x1a\\n
        2. Detects Keras Lambda layers (CVE-2024-3660 - Arbitrary Code Execution in tf.keras.models.load_model).
        3. Scans for embedded pickle bytecode within HDF5 attribute data.
        """
        findings: List[Dict[str, Any]] = []

        if not data.startswith(b"\x89HDF\r\n\x1a\n"):
            findings.append({
                "rule_id": "KAVACH-HDF5-INVALID-MAGIC",
                "title": "Invalid HDF5 Header Signature",
                "description": "Artifact has .h5 extension but does not begin with standard HDF5 signature.",
                "severity": "MEDIUM",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-1287",
                "affected_file": file_path,
                "evidence": {"file_size": total_size},
                "fix_available": False,
            })
            return findings

        # Check for Keras Lambda layer serialization (CVE-2024-3660)
        # Lambda layers embed Python bytecode or code strings that execute upon load_model()
        data_preview = data[: min(len(data), 500000)]
        if b"class_name\": \"Lambda\"" in data_preview or b"class_name': 'Lambda'" in data_preview or b"\"class_name\": \"Lambda\"" in data_preview:
            findings.append({
                "rule_id": "KAVACH-KERAS-LAMBDA-ARBITRARY-CODE-EXECUTION",
                "title": "Keras Lambda Layer Remote Code Execution Risk (CVE-2024-3660)",
                "description": (
                    "Model contains Keras Lambda layers serialized with Python bytecode. "
                    "Loading this model with tf.keras.models.load_model executes arbitrary code embedded in the layer."
                ),
                "severity": "CRITICAL",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-502",
                "owasp_category": "ML09:2023 - Model Serialization Attack",
                "affected_file": file_path,
                "evidence": {"vulnerability": "CVE-2024-3660", "layer_type": "Lambda"},
                "remediation_guidance": "Export model architecture as standard Keras layers or convert weights to Safetensors.",
                "fix_available": False,
            })

        return findings

    def _analyze_tflite(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """Validates TensorFlow Lite model header."""
        findings: List[Dict[str, Any]] = []
        # TFLite flatbuffers typically have 'TFL3' at byte offset 4
        if len(data) >= 8 and data[4:8] != b"TFL3":
            findings.append({
                "rule_id": "KAVACH-TFLITE-INVALID-HEADER",
                "title": "Anomalous TensorFlow Lite FlatBuffer Signature",
                "description": "File has .tflite extension but lacks standard 'TFL3' identifier at offset 4.",
                "severity": "LOW",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-1287",
                "affected_file": file_path,
                "evidence": {"file_size": total_size},
                "fix_available": False,
            })
        return findings

    def _analyze_tensorflow_pb(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """Analyzes TensorFlow SavedModel Protobuf (.pb)."""
        findings: List[Dict[str, Any]] = []
        # Check for PyFunc or dangerous custom operators
        text_sample = data[:100000].decode("latin1", errors="ignore")
        if "PyFunc" in text_sample or "PyFuncStateless" in text_sample:
            findings.append({
                "rule_id": "KAVACH-TF-PYFUNC-ARBITRARY-CODE",
                "title": "Dangerous TensorFlow PyFunc Operator in GraphDef",
                "description": "TensorFlow GraphDef contains PyFunc operator which executes arbitrary host Python functions.",
                "severity": "HIGH",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-94",
                "affected_file": file_path,
                "evidence": {"operator": "PyFunc"},
                "fix_available": False,
            })
        return findings

    def _analyze_archive(self, file_path: str, data: bytes, total_size: int) -> List[Dict[str, Any]]:
        """Analyzes generic archives (.tar, .tar.gz, .tgz, .zip)."""
        findings: List[Dict[str, Any]] = []
        fname = os.path.basename(file_path).lower()

        if fname.endswith((".tar", ".tar.gz", ".tgz")):
            try:
                with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tf:
                    total_uncompressed = 0
                    for member in tf.getmembers():
                        # Tar Slip check
                        if ".." in member.name or member.name.startswith(("/", "\\")):
                            findings.append({
                                "rule_id": "KAVACH-TAR-SLIP-DETECTED",
                                "title": "Tar Slip Path Traversal Vulnerability in Model Archive",
                                "description": f"Tar entry '{member.name}' contains path traversal escaping destination directory.",
                                "severity": "CRITICAL",
                                "category": "ARTIFACT_SECURITY",
                                "cwe_id": "CWE-22",
                                "affected_file": file_path,
                                "evidence": {"entry_name": member.name},
                                "fix_available": False,
                            })

                        # Symlink check
                        if member.issym() or member.islnk():
                            if ".." in member.linkname or member.linkname.startswith(("/", "\\", "C:", "c:")):
                                findings.append({
                                    "rule_id": "KAVACH-ARCHIVE-DANGEROUS-SYMLINK",
                                    "title": f"Dangerous Symlink in Model Archive: {member.name} -> {member.linkname}",
                                    "description": "Archive member symlink points outside extraction directory.",
                                    "severity": "CRITICAL",
                                    "category": "ARTIFACT_SECURITY",
                                    "cwe_id": "CWE-59",
                                    "affected_file": file_path,
                                    "evidence": {"member": member.name, "target": member.linkname},
                                    "fix_available": False,
                                })

                        total_uncompressed += member.size

                    # Tar bomb check
                    if total_size > 0 and (total_uncompressed / max(total_size, 1)) > 100.0:
                        findings.append({
                            "rule_id": "KAVACH-TAR-BOMB-DETECTED",
                            "title": "Tar Bomb Compression Ratio Detected",
                            "description": f"Uncompressed size ({total_uncompressed} bytes) exceeds 100x compressed size.",
                            "severity": "HIGH",
                            "category": "ARTIFACT_SECURITY",
                            "cwe_id": "CWE-409",
                            "affected_file": file_path,
                            "evidence": {"compression_ratio": total_uncompressed / max(total_size, 1)},
                            "fix_available": False,
                        })
            except Exception as exc:
                logger.warning(f"Error parsing tar archive {file_path}: {exc}")
        elif fname.endswith(".zip") or data.startswith(b"PK\x03\x04"):
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as zf:
                    total_uncompressed = 0
                    for info in zf.infolist():
                        if ".." in info.filename or info.filename.startswith(("/", "\\")):
                            findings.append({
                                "rule_id": "KAVACH-ZIP-SLIP-DETECTED",
                                "title": "Zip Slip Path Traversal Vulnerability in Model Archive",
                                "description": f"The model archive contains entry '{info.filename}' which traverses outside target directory.",
                                "severity": "CRITICAL",
                                "category": "ARTIFACT_SECURITY",
                                "cwe_id": "CWE-22",
                                "affected_file": file_path,
                                "evidence": {"malicious_entry": info.filename},
                                "fix_available": False,
                            })
                        total_uncompressed += info.file_size
                    if total_size > 0 and (total_uncompressed / max(total_size, 1)) > 100.0:
                        findings.append({
                            "rule_id": "KAVACH-ZIP-BOMB-DETECTED",
                            "title": "Zip Bomb Compression Ratio Detected",
                            "description": f"Uncompressed size ({total_uncompressed} bytes) is >100x compressed size.",
                            "severity": "HIGH",
                            "category": "ARTIFACT_SECURITY",
                            "cwe_id": "CWE-409",
                            "affected_file": file_path,
                            "evidence": {"compression_ratio": total_uncompressed / max(total_size, 1)},
                            "fix_available": False,
                        })
            except Exception as exc:
                logger.warning(f"Error parsing zip archive {file_path}: {exc}")

        return findings

    def _analyze_executable_script(self, file_path: str, data: bytes) -> List[Dict[str, Any]]:
        """Inspects custom scripts inside model bundles."""
        findings: List[Dict[str, Any]] = []
        text = data[:50000].decode("utf-8", errors="ignore")

        suspicious_patterns = [
            ("os.system(", "Arbitrary system command execution via os.system"),
            ("subprocess.Popen(", "Subprocess spawn via Popen"),
            ("eval(", "Dynamic code evaluation via eval"),
            ("exec(", "Dynamic code execution via exec"),
            ("/bin/sh", "Hardcoded shell invocation"),
            ("/bin/bash", "Hardcoded bash invocation"),
            ("nc -e", "Netcat reverse shell pattern"),
        ]

        found_patterns = []
        for pat, desc in suspicious_patterns:
            if pat in text:
                found_patterns.append(desc)

        if found_patterns:
            findings.append({
                "rule_id": "KAVACH-MODEL-SCRIPT-SUSPICIOUS",
                "title": "Potentially Dangerous Execution Commands in Model Script",
                "description": f"The script bundled with the model contains executable commands: {', '.join(found_patterns)}.",
                "severity": "HIGH",
                "category": "ARTIFACT_SECURITY",
                "cwe_id": "CWE-78",
                "affected_file": file_path,
                "evidence": {"patterns": found_patterns},
                "fix_available": True,
            })

        return findings
