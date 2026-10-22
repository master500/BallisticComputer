# Sicherheitshinweis / Safety notice

**DE:** BallisticComputer ist ein freies Lern- und Demo-Projekt. Das Simulationsmodell nutzt fiktive, unkalibrierte Werte und liefert **keine Ladedaten**. Wiederladen ist gefährlich. Verwende ausschließlich aktuelle, veröffentlichte Ladedaten der Pulver- und Geschosshersteller und beginne immer mit den Startladungen. Nutzung auf eigene Verantwortung.

**EN:** BallisticComputer is a free learning/demo project. The simulation model uses fictional, uncalibrated values and provides **no load data**. Handloading is dangerous. Only use current published data from powder and bullet manufacturers and always start low. Use at your own risk.

## Project rules (also for AI contributors)
- Never add proprietary databases (e.g. QuickLOAD, GRT) or copied published load tables.
- The demo simulation must only use fictional components; never let it predict pressures for real powders.
- Demo ballistic coefficients `bc_g1` and `bc_g7` are invented. They are not manufacturer coefficients. A user may enter their own coefficient and a measured muzzle velocity only on the device; those entries are not load data and are not committed.
- User-imported data stays on the user's device and is only displayed, never extrapolated.
- A user's own Gordon's Reloading Tool project (`*.grtload`) may be parsed in the browser for display on that device only. Do not copy those files or their values into the repository, do not import GRT powder-model parameters, and do not feed imported records into the demo simulation.
