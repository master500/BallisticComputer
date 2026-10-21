# BallisticComputer (Demo) – v1.0.0

> ⚠️ **Simulation / Demo – fiktive Werte, keine Ladedaten.**
> Alle Pulver-/Geschossnamen sind erfunden, alle Modellkonstanten unkalibriert,
> alle Einheiten Pseudo-Einheiten (sim-MPa, sim-m/s, Ladungseinheiten „LE“).
> Die Ergebnisse haben keinerlei Bezug zu realen Waffen, Pulvern oder Ladedaten
> und dürfen niemals als solche verwendet werden.

BallisticComputer ist eine mobile-first Web-App (PWA, iPhone-Homescreen-fähig) zur
Veranschaulichung eines lehrbuchartigen Innenballistik-Spielzeugmodells.

## Starten (lokal)

```bash
cd /workspace/chambersim/app
python3 server.py --port 8080            # http://127.0.0.1:8080/
# im Hintergrund:
nohup python3 server.py --port 8080 > ../server.log 2>&1 &
```

Kein Build-Schritt, keine Abhängigkeiten (nur Python 3 Standardbibliothek).
Tests: `node tests/model.test.mjs`. Icons neu erzeugen: `python3 scripts/make_icons.py` (Pillow).

## Ansichten

| Tab | Inhalt |
|---|---|
| **Datenbank** | Pulver, Geschosse, Druckgrenzen aus `db.json` |
| **Simulation** | Druckverlauf über Weg/Zeit + Mündungsgeschwindigkeit für Pulver × Geschoss × Ladung |
| **Optimierung** | Parameter-Sweep: höchste simulierte v mit Spitzendruck ≤ Demo-Limit |
| **KI-Squad** | Statuskarten der 6 simulierten Agenten aus `log.jsonl` |

## Architektur

```
app/
├── index.html            App-Shell, Demo-Banner, Tab-Leiste, PWA-Meta-Tags
├── manifest.webmanifest  PWA-Manifest (standalone)
├── sw.js                 Service Worker (Shell cache-first, data/* network-first)
├── server.py             Mini-Server; bildet /data/db.json + /data/log.jsonl auf ../ ab
├── css/style.css         Mobile-first, Safe-Area-Insets, Dark Theme
├── js/app.js             Hash-Router (#/datenbank, #/simulation, #/optimierung, #/squad)
├── js/api.js             Laden von db.json / log.jsonl
├── js/model.js           Spielzeugmodell (simulate, sweep) – reine Funktionen, testbar
├── js/chart.js           Minimaler Canvas-Linienchart
├── js/util.js            DOM-/Format-Helfer
├── js/views/*.js         Je eine Datei pro Ansicht: render<View>(root, {db, log})
├── icons/                apple-touch-icon (180), icon-192, icon-512
├── data/                 Statische Kopie der Daten für Hosting ohne server.py
├── scripts/              make_icons.py, sync-data.sh
└── tests/model.test.mjs  Plausibilitätstests des Modells
```

**Datenfluss:** Die Status-Routine schreibt `/workspace/chambersim/db.json` und
`log.jsonl`. Lokal liefert `server.py` diese Live-Dateien unter `/data/` aus.
Für statisches Hosting kopiert `scripts/sync-data.sh` sie nach `app/data/`.
Das Format von `db.json` wird nur gelesen; optionale Zusatzfelder, die das Modell
nutzt: `powders[].sim_beta` (Abbrandkoeffizient), `bullets[].sim_mass`.
Log-Zeilen: `{"ts", "event", "note", optional "agent"}` – `agent` ordnet einen
Eintrag eindeutig einem KI-Squad-Agenten zu (ballistics, database, optimization,
validation, safety, reporting); sonst wird über Stichwörter in `event` zugeordnet.

**Modell (js/model.js):** Verbrannter Anteil z, Weg x, Geschwindigkeit v;
`p = K·c·z/(V0+x)`, `dz/dt = β·pⁿ·(1−z)^(2/3)`, `dv/dt = A·p/(m + c·mc/3)`
(Lagrange-artige Korrektur), explizites Euler-Verfahren. Konstanten erfunden.

## Auf den iPhone-Homescreen legen

1. App muss über **HTTPS** erreichbar sein (siehe Hosting unten; `127.0.0.1` auf
   dieser Box ist vom iPhone aus nicht erreichbar).
2. URL in **Safari** öffnen → **Teilen** (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“** → Hinzufügen.
3. App startet danach im Vollbild (standalone); der Service Worker cacht die App-Shell
   für Offline-Nutzung, Daten werden zuletzt geladen gecacht.

## Hosting-Optionen (noch nicht eingerichtet)

Die App ist rein statisch – vor dem Deploy `scripts/sync-data.sh` ausführen.
- **GitHub Pages** – Repo pushen, Pages auf Branch/Ordner aktivieren; kostenlos, HTTPS.
- **Netlify** – Ordner per Drag & Drop oder Git-Anbindung; HTTPS, Deploy-Previews.
- **Cloudflare Pages** – Git-Anbindung oder `wrangler pages deploy`; HTTPS, schnelles CDN.
- Alternativ temporär: Tunnel (z. B. Cloudflare Tunnel / Tailscale Funnel) direkt auf `server.py` – dann mit Live-Daten.

Siehe [ROADMAP.md](ROADMAP.md) und [CHANGELOG.md](CHANGELOG.md).
