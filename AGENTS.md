# Hinweise für KI-Agenten

- Architektur: siehe README.md (Hash-Router in `js/app.js`, Views in `js/views/`, Modell in `js/model.js`).
- Arbeite die ROADMAP von oben nach unten ab, ein Punkt pro Pull Request.
- Halte dich strikt an `SAFETY.md`. Keine echten Ladedaten, keine proprietären Datenbanken.
- Lokal starten: `python3 server.py --port 8080`, Tests: `node tests/model.test.mjs && node tests/userdata.test.mjs`.
- Aktualisiere CHANGELOG.md und erhöhe CACHE_VERSION in sw.js, wenn sich App-Dateien ändern.
