# Changelog

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/), Versionierung nach SemVer.

## [1.5.0] – 2026-10-22
### Hinzugefügt
- CIP-Tabelle (`#/cip`): Nachschlagewerte Pmax in bar und L6 in mm, Quelle C.I.P., abgerufen 21.10.2026. Suche nur über den exakten Patronennamen oder feste Aliase (u. a. „9 mm“ → „9 mm Luger“). Das Suchfeld bleibt beim Tippen stehen.
- Meine Daten: CIP-Zuordnung, Druckprüfung in bar (gelb ab 0,9×Pmax bis Pmax, rot darüber oder bei einem Schuss über 1,15×Pmax), PSI ohne Vergleich, L6-Hinweis in mm. Numerischer GRT-Schussdruck wird von MPa mit Faktor 10 in bar übernommen.
- Sechs fiktive Demo-Zündhütchen mit erfundenem Zündfaktor nur für das Spielzeugmodell. In Meine Daten ist das Zündhütchen Freitext ohne Leistungswerte; ändert es sich, erscheint ein gelber Hinweis.
- Demo-Ladungsleiter in grain (Start 90 % der Demo-Grenze, Schritte 0,8 %, Ende an der Grenze, nie darüber). Setztiefe in mm. Ogivenform je Demo-Geschoss.
- Identische Backup-Zeilen werden beim zweiten Import derselben Datei übersprungen.
### Behoben
- Leere CIP-Hinweise und optionale Karten schreiben nicht mehr das Wort „null“ in die Ansicht.
### Geändert
- Demo-Geschossmassen stehen als `sim_mass_gr` (grain). Die Anzeige von Gewichten ist grain, Drücke der Demo sind bar. GRT-Gewichte werden mit 1 grain = 0,06479891 g umgerechnet und als „aus Gramm umgerechnet“ gekennzeichnet.
- Service Worker `CACHE_VERSION` → `ballisticcomputer-v1.5.0`.
### Bewusst nicht enthalten
- Keine echten Ladedaten. CIP-Pmax und CIP-L6 gehen nicht in Simulation oder Optimierung. Die Leiter nutzt nur die fiktive Demo-Grenze.

## [1.4.0] – 2026-10-21
### Geändert
- JSON-Backup aus **Meine Daten** wird beim erneuten Import strukturiert übernommen; verschachtelte `.grtload`-Ladungen bleiben erhalten.
- DemoPowder-Ränge 1–8 sind absteigend nach Abbrand sortiert (Rang 1 am schnellsten), gleich wie `data/db.json`.
- Schüsse mit Geschwindigkeit 0, leer oder negativ zählen nicht in Mittelwert, SD und ES.
- Optimierung rechnet den Sweep nicht mehr bei jeder Auswahl sofort, sondern gebündelt und in kleinen Schritten.
- Service Worker `CACHE_VERSION` → `ballisticcomputer-v1.4.0`.

## [1.3.0] – 2026-10-21
### Hinzugefügt
- Demo-Katalog: fünf weitere `DemoPowder` (extrafast, mediumfast, mediumslow, extraslow, plateau), sechs weitere Demo-Geschosse mit verschiedenen Gewichten, `Demo-Cartridge-2` bis `Demo-Cartridge-4` mit fiktiven Grenzen in sim-MPa.
- Simulation: Auswahl der Demo-Patrone. Optimierung: Limit je Patrone; Diagramm je Geschoss; Liste aller Pulver×Geschoss-Kombinationen.
### Geändert
- Service Worker `CACHE_VERSION` → `ballisticcomputer-v1.3.0`.

## [1.2.0] – 2026-10-21
### Hinzugefügt
- **Meine Daten:** Import einer eigenen Gordon's-Reloading-Tool-Projektdatei (`.grtload`, XML) per `DOMParser`.
  Anzeige von Titel, Kaliber, Hülsenvolumen, `pMaxZul` mit Verfahren, Geschoss (Name, g/grain, Länge),
  Pulvername, Ladungen (kg in der Datei, Anzeige in g und grain) inklusive Ladungsnotiz und
  gemessenen Geschwindigkeiten mit Mittelwert, SD und ES je Serie. Nur localStorage, keine Simulation.
### Geändert
- Service Worker `CACHE_VERSION` → `ballisticcomputer-v1.2.0` (`js/userdata/grtload.js` im Cache).
### Bewusst nicht enthalten
- Keine Pulvermodell-Parameter aus GRT und keine Beispielwerte aus Fremddateien.

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
