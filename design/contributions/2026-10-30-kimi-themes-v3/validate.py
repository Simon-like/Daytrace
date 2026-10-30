from pathlib import Path
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:7100"
server = subprocess.Popen(
    ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "7100", "--strictPort"],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

try:
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE, timeout=1).read()
            break
        except Exception:
            time.sleep(0.25)
    else:
        raise RuntimeError("Preview server did not start")
    subprocess.run(["node", "validate.mjs"], cwd=ROOT, check=True)
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait(timeout=5)
