#!/usr/bin/env bash
# Kopiert die Live-Daten der Status-Routine (../db.json, ../log.jsonl) nach ./data/,
# damit die App auch bei statischem Hosting (GitHub Pages, Netlify, Cloudflare Pages)
# Daten findet. Lokal ist das nicht nötig: server.py bildet /data/* direkt ab.
set -euo pipefail
cd "$(dirname "$0")/.."
cp ../db.json data/db.json
cp ../log.jsonl data/log.jsonl
echo "data/ synchronisiert."
