from __future__ import annotations

import argparse
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


def make_handler(root: Path):
    class SPARequestHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)

        def do_GET(self):
            parsed = urlsplit(self.path)
            request_path = parsed.path.lstrip("/") or "index.html"
            candidate = root / request_path

            if parsed.path.startswith("/static/") and candidate.exists():
                return super().do_GET()

            if candidate.exists() and candidate.is_file():
                return super().do_GET()

            self.path = "/index.html"
            return super().do_GET()

        def log_message(self, format, *args):
            return

    return SPARequestHandler


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1] / "build"))
    args = parser.parse_args()

    root = Path(args.root).resolve()
    os.chdir(root)

    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(root))
    print(f"Serving {root} on http://127.0.0.1:{args.port}", flush=True)
    try:
      server.serve_forever()
    except KeyboardInterrupt:
      pass
    finally:
      server.server_close()


if __name__ == "__main__":
    main()
