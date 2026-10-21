#!/usr/bin/env bash
# Prüft alle URLs aus js/userdata/sources.js per curl (folgt Weiterleitungen).
# Ausgabe: HTTP-Code + End-URL. Nicht-200-Links sollten entfernt/ersetzt werden.
set -uo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
fail=0
for u in $(grep -oE "https://[^']+" js/userdata/sources.js); do
  res=$(curl -sL -A "$UA" -o /dev/null -m 25 -w "%{http_code} %{url_effective}" "$u")
  echo "$res  <- $u"
  [[ $res == 200* ]] || fail=1
done
exit $fail
