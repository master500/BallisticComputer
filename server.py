#!/usr/bin/env python3
"""BallisticComputer – minimaler lokaler Server (DEMO).

Liefert die statische App aus diesem Verzeichnis aus und bildet die
Live-Daten der Status-Routine aus dem übergeordneten Ordner ab:

    /data/db.json    -> ../db.json      (simulierte Demo-Datenbank)
    /data/log.jsonl  -> ../log.jsonl    (Ereignisprotokoll)

Nur lesend. Start:  python3 server.py [--port 8080] [--host 127.0.0.1]
"""
import argparse
import http.server
import os
import socketserver

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(APP_DIR, ".."))
DATA_MAP = {
    "/data/db.json": os.path.join(DATA_DIR, "db.json"),
    "/data/log.jsonl": os.path.join(DATA_DIR, "log.jsonl"),
}
EXTRA_TYPES = {
    ".webmanifest": "application/manifest+json",
    ".jsonl": "application/x-ndjson",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **EXTRA_TYPES}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean in DATA_MAP and os.path.exists(DATA_MAP[clean]):
            return DATA_MAP[clean]
        return super().translate_path(path)

    def end_headers(self):
        clean = self.path.split("?", 1)[0]
        if clean.startswith("/data/") or clean.endswith("sw.js"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    ap = argparse.ArgumentParser(description="BallisticComputer Demo-Server")
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8080)))
    ap.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    args = ap.parse_args()
    with Server((args.host, args.port), Handler) as httpd:
        print(f"BallisticComputer (DEMO) läuft auf http://{args.host}:{args.port}/", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
