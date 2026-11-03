import os
import subprocess
import asyncio
from typing import List, Optional, Tuple


async def run_command_async(
    cmd: List[str],
    cwd: Optional[str] = None,
    env: Optional[dict] = None,
    timeout: float = 300.0,
) -> Tuple[int, bytes, bytes]:
    """
    Executes an external command non-blockingly in a worker thread.
    Avoids asyncio.create_subprocess_exec which raises NotImplementedError
    on Windows when running with SelectorEventLoop (e.g. Uvicorn reloader).
    
    Returns:
        (returncode, stdout_bytes, stderr_bytes)
    """
    def _execute():
        merged_env = os.environ.copy()
        if env:
            merged_env.update(env)
        return subprocess.run(
            cmd,
            cwd=cwd,
            env=merged_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
        )

    proc = await asyncio.to_thread(_execute)
    return proc.returncode, proc.stdout or b"", proc.stderr or b""
