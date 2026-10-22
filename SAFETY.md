# Sicherheitshinweis / Safety notice

**DE:** BallisticComputer ist ein freies Lern- und Demo-Projekt. Das Simulationsmodell nutzt fiktive, unkalibrierte Werte und liefert **keine Ladedaten**. Wiederladen ist gefährlich. Verwende ausschließlich aktuelle, veröffentlichte Ladedaten der Pulver- und Geschosshersteller und beginne immer mit den Startladungen. Nutzung auf eigene Verantwortung.

**EN:** BallisticComputer is a free learning/demo project. The simulation model uses fictional, uncalibrated values and provides **no load data**. Handloading is dangerous. Only use current published data from powder and bullet manufacturers and always start low. Use at your own risk.

## Project rules (also for AI contributors)
- Never add proprietary databases (e.g. QuickLOAD, GRT) or copied published load tables.
- The demo simulation must only use fictional components; never let it predict pressures for real powders.
- User-imported data stays on the user's device and is only displayed, never extrapolated.
- A user's own Gordon's Reloading Tool project (`*.grtload`) may be parsed in the browser for display on that device only. Do not copy those files or their values into the repository, do not import GRT powder-model parameters, and do not feed imported records into the demo simulation.
- CIP Pmax and L6 values are lookup numbers only. They may appear in the CIP table and in the checks on Meine Daten. The simulation and the optimizer must not import or apply them. Ladder limits stay on the fictional demo cartridges.
- Pressure units other than bar and PSI are not supported.
- The powder catalog is names only: no burn rates and no loads. The simulation, the ladder and the optimizer must not load it.

**DE (CIP):** CIP-Pmax und CIP-L6 sind nur Nachschlagewerte in der CIP-Tabelle und in den Prüfungen unter Meine Daten. Simulation und Optimierung dürfen sie nicht lesen und nicht verwenden. Die Ladungsleiter bleibt an den fiktiven Demo-Grenzen. Druckeinheiten außer bar und PSI werden nicht unterstützt.

**DE (Pulvernamen):** Der Pulverkatalog enthält nur Namen, keine Abbrandgeschwindigkeit und keine Ladungen. Simulation, Leiter und Optimierung dürfen ihn nicht laden.

- Manufacturer load tables are never committed. A user may import them only on the device (`bc.mfrloads.v1`). They are excluded from backup and export. The charge ladder may use a row only when cartridge, powder, bullet weight, bullet type, primer and COAL match exactly, and no step may exceed the stated maximum. The toy model pressure is not shown for those rows. The stated pressure may be compared with CIP Pmax. Pressure units other than bar and PSI drop the whole row. The file `samples/fictional-manufacturer-loads.json` is fictional.

**DE (Herstellerzeilen):** Herstellerladungen gehören nicht ins Repository. Ein Import bleibt auf dem Gerät und fehlt im Backup. Die Leiter nutzt eine Zeile nur bei exakter Kombination und nie über der angegebenen Maximalladung. Der Spielzeugdruck wird dafür nicht angezeigt. Der angegebene Druck darf mit CIP-Pmax verglichen werden. Andere Druckeinheiten als bar und PSI verwerfen die ganze Zeile. `samples/fictional-manufacturer-loads.json` ist fiktiv.
