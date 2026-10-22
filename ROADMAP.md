# ROADMAP – nächste Verbesserungen (priorisiert)

Leitplanken für alle Iterationen (auch autonome): nur fiktive Namen und
unkalibrierte Konstanten, Demo-Banner bleibt auf jeder Ansicht, keine echten
Pulver-/Ladedaten, `db.json`-Format nur erweitern, nie brechen. Jede Änderung
in CHANGELOG.md eintragen und als eigener Git-Commit festhalten.
Eigene Nutzerdaten (Tab „Meine Daten“) bleiben strikt getrennt: nie in Modell,
Simulation oder Optimierung einspeisen, nie extrapolieren oder Drücke prognostizieren,
keine fremden Ladedaten-Datenbanken (GRT/QuickLOAD/Handbücher) einbinden oder scrapen.

## P1 – als Nächstes
1. **Hosting & Daten-Sync** – statisches Deploy (GitHub Pages/Netlify/Cloudflare Pages) vorbereiten, `sync-data.sh` in einen Deploy-Schritt einbauen, damit die App auf dem iPhone installierbar ist.
2. **Strukturiertes Log-Schema** – Status-Routine schreibt `agent`, `status`, `metrics` (z. B. Spitzendruck, v) in log.jsonl; KI-Squad zeigt Verlauf/Sparklines je Agent.
3. **Optimierungsergebnis zurückschreiben** – Ergebnis des Sweeps als `last_optimization` (Format dokumentieren) übernehmen und in Datenbank/KI-Squad anzeigen; Abgleich mit dem Wert der Routine.

## P1b – Meine Daten
- Synthetische GRT-/QuickLOAD-Fixtures (keine echten Exporte) als Test-Fixtures; Aliasliste erweitern.
- Gespeicherte Zuordnungsprofile je Exportformat; Duplikaterkennung beim Import.
- Einzelne Datensätze bearbeiten; CSV-Export; Einheitenhinweis (grain, m/s, mm, bar) nur zur Anzeige.
- `scripts/check-links.sh` regelmäßig laufen lassen und tote Links in Offizielle Quellen ersetzen.

## P2
4. Vergleichsmodus: zwei bis drei Simulationen übereinander im Chart.
5. Geschwindigkeit-über-Weg-Kurve und Abbrand z(t) als zusätzliche Charts.
6. Besserer Integrator (RK4) + Konvergenztest in tests/.
7. Sicherheitsmonitor-Logik in der App: Warn-Badge am Tab, wenn simulierter Druck nahe/über Limit.
8. Einstellungen: Pseudo-Konstanten (K, A, n …) in einem „Experten“-Panel variieren (nur Demo).

## P3
9. Mehrere Druckgrenzen/Demo-Cartridges auswählbar; Sweep-Schrittweite einstellbar.
10. Hell/Dunkel-Theme, Barrierefreiheit (ARIA, Kontraste) prüfen.
11. Export (CSV/PNG) der Simulationsergebnisse mit Demo-Wasserzeichen.
12. Automatisierte UI-Tests (Headless-Chrome-Screenshots je View) in einem `scripts/check.sh`.
