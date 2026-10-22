/**
 * Ladungsleiter einer lokal importierten Herstellerzeile.
 * Jeder Schritt auf 0,1 grain abgerundet, nie über der Maximalladung.
 */

export function floorTenth(value) {
  return Math.floor(Number(value) * 10 + 1e-9) / 10;
}

function tenthIndex(value) {
  return Math.round(floorTenth(value) * 10);
}

/** Start genau bei der Startladung, sonst bei 90 % der Maximalladung. Ende an der Maximalladung. */
export function ladderCharges({ startGrain = null, maxGrain } = {}) {
  const max = Number(maxGrain);
  if (!(max > 0)) return [];
  const end = floorTenth(max);
  if (!(end > 0) || end - max > 1e-9) return [];
  const hasStart = Number.isFinite(Number(startGrain)) && Number(startGrain) > 0;
  let start = hasStart ? floorTenth(Number(startGrain)) : floorTenth(max * 0.9);
  if (!(start > 0)) return [];
  if (start - max > 1e-9) start = end;
  if (start - end > 1e-9) start = end;
  const steps = [];
  for (let tenth = tenthIndex(start); tenth <= tenthIndex(end); tenth += 1) {
    const grain = tenth / 10;
    if (grain - max > 1e-9) break;
    steps.push(grain);
  }
  return steps;
}
