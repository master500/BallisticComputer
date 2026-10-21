/**
 * Offizielle Quellen – nur offizielle Herstellerdomains, per curl geprüft
 * (Stand siehe CHANGELOG). Prüfen: scripts/check-links.sh
 */
export const OFFICIAL_SOURCES = [
  { group: 'Pulverhersteller – Ladedaten', items: [
    { name: 'Hodgdon Reloading Data Center', note: 'Hodgdon, IMR, Winchester', url: 'https://hodgdonreloading.com/rldc/' },
    { name: 'Accurate (Hodgdon)', url: 'https://hodgdonpowderco.com/accurate/' },
    { name: 'Ramshot (Hodgdon)', url: 'https://hodgdonpowderco.com/ramshot/' },
    { name: 'Vihtavuori Reloading Data Tool', url: 'https://vihtavuori.com/reloading-data/reloading-data-tool/' },
    { name: 'Alliant Powder – Reloader\'s Guide', url: 'https://www.alliantpowder.com/reloaders/' },
    { name: 'Norma – Reloading', url: 'https://www.norma-ammunition.com/reloading' },
    { name: 'Reload Swiss – RS-Ladedaten', url: 'https://www.reload-swiss.com/de/ladedaten/rs-ladedaten' },
  ] },
  { group: 'Geschosshersteller – Ladedaten', items: [
    { name: 'Sierra Bullets – Load Data', url: 'https://sierrabullets.com/load-data/' },
    { name: 'Hornady – Load Data', url: 'https://www.hornady.com/support/load-data/' },
    { name: 'Nosler – Load Data', url: 'https://www.nosler.com/load-data' },
    { name: 'Lapua – Wiederladekomponenten', note: 'Komponenten, keine Ladedaten', url: 'https://www.lapua.com/purpose/reloading/' },
  ] },
  { group: 'Innenballistik-Software (Produktseiten)', items: [
    { name: 'GRT – Gordon\'s Reloading Tool', url: 'https://www.grtools.de/' },
    { name: 'QuickLOAD (Vertrieb UK/Europa)', url: 'https://www.quickload.co.uk/' },
    { name: 'QuickLOAD (Vertrieb Nordamerika, NECO)', url: 'https://www.neconos.com/quickload-ballistic-prediction-software/' },
  ] },
];
