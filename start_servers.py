import subprocess
import sys
import time
import os
import signal
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def main():
    print("================================================================================")
    print("AI-ENABLED INTELLIGENT TEACHER ROBOT - SYSTEM LAUNCHER")
    print("================================================================================")
    print(f"Working Directory: {BASE_DIR}")

    # Determine Python executable
    venv_python = BASE_DIR / "venv" / "Scripts" / "python.exe"
    python_cmd = str(venv_python) if venv_python.exists() else sys.executable

    # 1. Start FastAPI Backend (Port 8000)
    print("\n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_cmd = [
        python_cmd,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000"
    ]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(BASE_DIR)
    )

    # 2. Start Vite Frontend (Port 3000)
    print("[2/2] Starting Vite React Frontend on http://127.0.0.1:3000 ...")
    frontend_dir = BASE_DIR / "frontend"
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "3000"],
        cwd=str(frontend_dir)
    )

    time.sleep(2)
    print("\n--------------------------------------------------------------------------------")
    print("SYSTEM READY:")
    print("  -> Operator Dashboard: http://127.0.0.1:3000/")
    print("  -> FastAPI Documentation: http://127.0.0.1:8000/docs")
    print("  -> WebSocket Telemetry: ws://127.0.0.1:8000/ws/robot")
    print("--------------------------------------------------------------------------------")
    print("Press Ctrl+C to terminate both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Servers stopped cleanly.")

if __name__ == "__main__":
    main()
