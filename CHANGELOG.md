# Changelog

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/), Versionierung nach SemVer.

## [1.1.0] – 2026-10-21
### Hinzugefügt
- Neuer Tab **Meine Daten** (`#/daten`): Import eigener Daten aus CSV/JSON (Datei oder eingefügter Text),
  Spaltenzuordnung mit Vorschau, Best-Effort-Mapper für GRT-/QuickLOAD-CSV-Kopfzeilen
  (berechnete Spalten werden nie automatisch übernommen), Speicherung in localStorage,
  JSON-Backup, Löschen, Suche/Filter, Vergleichstabelle und Punktdiagramm „gemessene v über Ladung“.
- Hinweis „Eigene Daten – Verantwortung beim Nutzer. Immer mit aktuellen Herstellerangaben abgleichen.“
- Abschnitt **Offizielle Quellen** mit 14 per curl geprüften Links (Hersteller-Ladedaten, GRT, QuickLOAD-Vertrieb).
- `scripts/check-links.sh`, `scripts/shots-daten.mjs`, `tests/userdata.test.mjs` (inkl. Trennungstest).
- Chart: Punktmodus (`dots`) und `fitToData`.
### Geändert
- Service Worker `CACHE_VERSION` → `ballisticcomputer-v1.1.0`, neue Dateien im Cache.
- Tab-Leiste mit fünf Einträgen.
### Bewusst nicht enthalten
- Keine Ladedaten aus GRT/QuickLOAD/Handbüchern, kein Scraping; Simulation/Optimierung nutzen weiter nur fiktive Demo-Pulver.
- Nicht verlinkt: RWS (Domain per TLS nicht erreichbar), Rottweil (keine Ladedaten-Seite), 404-Seiten von Lapua/Hornady/Vihtavuori (durch funktionierende ersetzt).

## 1.0.1 – 2026-10-21
- App umbenannt: ChamberSim → BallisticComputer (Titel, Manifest, Home-Bildschirm-Name, Cache-Version).

## [1.0.0] – 2026-10-21
### Hinzugefügt
- Erste Version von ChamberSim (Demo) als mobile-first PWA für iPhone Safari.
- Ansichten Datenbank, Simulation, Optimierung, KI-Squad mit unterer Tab-Leiste.
- Spielzeug-Innenballistikmodell (Lagrange-artig, unkalibriert, Pseudo-Einheiten) + Parameter-Sweep.
- Canvas-Chart ohne Abhängigkeiten; Demo-Banner auf jeder Ansicht.
- Manifest, Apple-Meta-Tags, Icons (180/192/512), Service Worker für Offline-Caching.
- `server.py` (bildet ../db.json und ../log.jsonl unter /data/ ab), `scripts/sync-data.sh`, Modelltests.
