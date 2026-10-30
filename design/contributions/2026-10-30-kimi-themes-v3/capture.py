from pathlib import Path
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parent
PREVIEWS = ROOT / "previews"
PREVIEWS.mkdir(exist_ok=True)
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

    for theme in ("margin", "grid", "folio"):
        shots = (
            ("home", "desktop", "1440,1000"),
            ("article", "mobile", "390,844"),
        )
        for page, label, viewport in shots:
            url = f"{BASE}/?theme={theme}&page={page}&clean=1"
            output = PREVIEWS / f"{theme}-{label}.png"
            subprocess.run(
                [
                    "npx", "--yes", "playwright", "screenshot",
                    "--viewport-size", viewport,
                    "--lang", "zh-CN",
                    "--wait-for-selector", "main",
                    "--wait-for-timeout", "300",
                    url,
                    str(output),
                ],
                cwd=ROOT,
                check=True,
            )
            print(output.relative_to(ROOT))
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait(timeout=5)
