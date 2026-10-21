# Changelog

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/), Versionierung nach SemVer.

## [1.0.0] – 2026-10-21
### Hinzugefügt
- Erste Version von ChamberSim (Demo) als mobile-first PWA für iPhone Safari.
- Ansichten Datenbank, Simulation, Optimierung, KI-Squad mit unterer Tab-Leiste.
- Spielzeug-Innenballistikmodell (Lagrange-artig, unkalibriert, Pseudo-Einheiten) + Parameter-Sweep.
- Canvas-Chart ohne Abhängigkeiten; Demo-Banner auf jeder Ansicht.
- Manifest, Apple-Meta-Tags, Icons (180/192/512), Service Worker für Offline-Caching.
- `server.py` (bildet ../db.json und ../log.jsonl unter /data/ ab), `scripts/sync-data.sh`, Modelltests.
