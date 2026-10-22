# BallisticComputer (Demo) – v1.5.2

> ⚠️ **Simulation / Demo – fiktive Werte, keine Ladedaten.**
> Alle Pulver-, Geschoss- und Zündhütchennamen sind erfunden, alle Modellkonstanten unkalibriert.
> Die Oberfläche zeigt Druck in bar und Gewichte in grain. Geschwindigkeit bleibt eine Pseudo-Einheit (sim-m/s).
> Die Ergebnisse haben keinerlei Bezug zu realen Waffen, Pulvern oder Ladedaten
> und dürfen niemals als solche verwendet werden.

BallisticComputer ist eine mobile-first Web-App (PWA, iPhone-Homescreen-fähig) zur
Veranschaulichung eines lehrbuchartigen Innenballistik-Spielzeugmodells.

## Starten (lokal)

```bash
python3 server.py --port 8080            # http://127.0.0.1:8080/
```

Im Verzeichnis des Repositories starten. Kein Build-Schritt, keine Abhängigkeiten (nur Python 3 Standardbibliothek).
Tests: `node tests/model.test.mjs && node tests/userdata.test.mjs && node tests/grtload.test.mjs && node tests/cip.test.mjs && node tests/pressure.test.mjs && node tests/primer.test.mjs && node tests/ladder.test.mjs && node tests/units.test.mjs && node tests/separation.test.mjs`. Links prüfen: `scripts/check-links.sh`. Icons neu erzeugen: `python3 scripts/make_icons.py` (Pillow).

## Ansichten

| Tab | Inhalt |
|---|---|
| **Datenbank** | Acht DemoPowder, sechs Demo-Zündhütchen, acht Demo-Geschosse in grain, Demo-Cartridge-1…4 (Anzeige in bar) |
| **Simulation** | Druckverlauf in bar für Demo-Patrone × Demo-Pulver × Demo-Geschoss × Demo-Zündhütchen × Ladung in grain |
| **Optimierung** | Demo-Ladungsleiter und Setztiefe; Grenze nur die fiktive Demo-Patrone |
| **CIP** (`#/cip`) | Nachschlagewerte Pmax in bar und L6 in mm. Nicht Teil der Simulation |
| **KI-Squad** | Statuskarten der 6 simulierten Agenten aus `log.jsonl` |
| **Meine Daten** (`#/daten`) | Import/Liste/Suche/Vergleich **eigener** Datensätze plus CIP-Prüfung (localStorage) |

## Architektur

```
./
├── index.html            App-Shell, Demo-Banner, Tab-Leiste, PWA-Meta-Tags
├── manifest.webmanifest  PWA-Manifest (standalone)
├── sw.js                 Service Worker (Shell cache-first, data/* network-first)
├── server.py             Mini-Server, Start im Repository-Wurzelverzeichnis
├── css/style.css         Mobile-first, Safe-Area-Insets, Dark Theme
├── js/app.js             Hash-Router inkl. #/cip
├── js/api.js             Laden von db.json / log.jsonl
├── js/model.js           Spielzeugmodell (simulate, sweep) – ohne CIP
├── js/ladder.js          Demo-Leiter in grain und Setztiefe in mm
├── js/cip/               Nachschlagewerte, nur CIP-Ansicht und Meine Daten
├── js/chart.js           Minimaler Canvas-Linienchart
├── js/util.js            DOM-/Format-Helfer
├── js/views/*.js         Je eine Datei pro Ansicht
├── js/userdata/          csv, grtload, cipcheck, primer, mapping, store, sources
├── icons/                apple-touch-icon (180), icon-192, icon-512
├── data/                 Demo-Katalog; data/cip/ ist nur Nachschlagewerk
├── scripts/              make_icons.py, sync-data.sh, check-links.sh, shots-daten.mjs
└── tests/                Modell, Import, CIP, Leiter, Einheiten, Trennung
```

**Datenfluss:** `server.py` liefert die App aus dem Repository-Wurzelverzeichnis.
`/data/db.json` und `/data/log.jsonl` kommen aus dem übergeordneten Ordner, falls die Dateien dort liegen, sonst aus `data/`.
Das Format von `db.json` wird nur erweitert. Felder, die das Modell nutzt:
`powders[].sim_beta`, `powders[].burn_class`, `primers[].sim_ignition`, `bullets[].sim_mass_gr`, `bullets[].sim_ogive`.
Der Demo-Katalog ist erfunden. Interne Druckgrenzen stehen im Feld `max_mpa_sim` und werden in der Oberfläche mit Faktor 10 als bar gezeigt.
CIP-Dateien unter `data/cip/` liest nur die CIP-Tabelle und die Prüfung in Meine Daten.
Log-Zeilen: `{"ts", "event", "note", optional "agent"}` – `agent` ordnet einen
Eintrag eindeutig einem KI-Squad-Agenten zu (ballistics, database, optimization,
validation, safety, reporting); sonst wird über Stichwörter in `event` zugeordnet.

**Modell (js/model.js):** Verbrannter Anteil z, Weg x, Geschwindigkeit v;
`p = K·c·z/(V0+x)`, `dz/dt = β·pⁿ·(1−z)^(2/3)`, `dv/dt = A·p/(m + c·mc/3)`
(Lagrange-artige Korrektur), explizites Euler-Verfahren. Konstanten erfunden.

## Meine Daten (Import eigener Daten)

> **Eigene Daten – Verantwortung beim Nutzer. Immer mit aktuellen Herstellerangaben abgleichen.**

- Import per Dateiauswahl (CSV/JSON/`.grtload`) oder eingefügtem Text; vor dem Speichern
  Spaltenzuordnung + Vorschau. Gespeichert wird nur im `localStorage` des Geräts
  (Schlüssel `bc.userdata.v1`), mit JSON-Backup-Export, Einzel- und Komplettlöschung.
- Eine eigene GRT-Projektdatei (`.grtload`, XML) wird mit `DOMParser` im Browser gelesen.
  Angezeigt werden Titel, Kaliber, Hülsenvolumen, zulässiger Druck (`pMaxZul` in bar und Verfahren),
  Geschoss (Name, Gewicht in grain, Länge in mm), Pulvername, Ladungen in grain
  („aus Gramm umgerechnet“) mit Ladungsnotiz sowie gemessene Schussgeschwindigkeiten
  mit Mittelwert, Standardabweichung und Extremstreuung je Serie, falls vorhanden.
  Ein numerischer Schussdruck aus der Datei wird mit Faktor 10 in bar gezeigt.
  Pulvermodell-Parameter werden nicht übernommen. Nur Anzeige, kein Upload, keine Simulation.
- Jeder Datensatz trägt `origin = "Eigene Daten / Import: <Dateiname>"`.
- **Strikte Trennung:** Simulation/Optimierung verwenden ausschließlich die fiktiven
  Demo-Pulver aus `db.json`. `js/model.js` und die Demo-Views lesen keine Nutzerdaten
  (per Test abgesichert). Nutzerdaten werden nur angezeigt – keine Berechnung,
  Extrapolation oder Druckprognose; der Vergleichschart zeigt nur Messpunkte.
- Die App enthält **keine** Ladedaten aus GRT, QuickLOAD oder Handbüchern und lädt
  auch keine herunter. „Offizielle Quellen“ verlinkt nur auf die Herstellerseiten.

### Generisches CSV-Schema

Trennzeichen `;`, `,` oder Tab (automatisch erkannt), erste Zeile = Spaltennamen,
Dezimalkomma oder -punkt. Einheiten werden nicht umgerechnet – bitte pro Datei einheitlich.

| Spalte | Typ | Bedeutung |
|---|---|---|
| `cartridge` | Text | Patrone |
| `powder` | Text | Pulver |
| `bullet` | Text | Geschoss |
| `bullet_weight` | Zahl | Geschossgewicht (Einheit wie gemessen) |
| `charge` | Zahl | Ladung (Einheit wie gemessen) |
| `coal` | Zahl | Patronenlänge |
| `measured_velocity` | Zahl | **selbst gemessene** Geschwindigkeit |
| `notes` (oder `pressure_source`) | Text | Druckquelle/Notizen |
| `source` | Text | Quelle (z. B. „eigene Messung“, Handbuch-Seite) |

JSON: Array solcher Objekte oder `{ "records": [...] }` (eigenes Backup ist wieder importierbar).

### GRT-/QuickLOAD-CSV-Exporte (Best Effort)

Spalten werden anhand der Kopfzeile zugeordnet (z. B. `Cartridge`/`Patrone`,
`Powder`/`Pulver`, `Projectile`, `Projectile Mass [gr]`, `Charge [gr]`, `COAL [mm]`,
`Notes`). **Berechnete Spalten** (z. B. `Velocity`, `v0`, `Pmax`, alles mit
`pred`/`calc`/`berechn`/`sim`) werden **nie automatisch** übernommen – insbesondere
nicht als „gemessene v“. Manuelle Zuordnung ist möglich, mit Warnhinweis.

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

## Lizenz & Sicherheit

MIT-Lizenz (siehe [LICENSE](LICENSE)). Bitte unbedingt [SAFETY.md](SAFETY.md) lesen.

## Mitmachen / Contributing

Menschen und KI-Agenten sind willkommen. Einstieg über die offenen Issues mit den Labels [`good first issue`](https://github.com/master500/BallisticComputer/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) und [`ai-friendly`](https://github.com/master500/BallisticComputer/issues?q=is%3Aissue+is%3Aopen+label%3Aai-friendly).

- [CONTRIBUTING.md](CONTRIBUTING.md) – so läuft ein Beitrag
- [SAFETY.md](SAFETY.md) – verbindliche Regeln, keine echten Ladedaten
- [CONTRIBUTORS.md](CONTRIBUTORS.md) – Danke; jeder gemergte Pull Request wird dort eingetragen
- KI-Agenten zusätzlich: [AGENTS.md](AGENTS.md)
