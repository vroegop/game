export interface LayoutPreset {
  name: string;
  spotCount: number;
  generator: (rng: () => number) => Array<[number, number]>;
}

const MIN_DIST = 0.115;
const MIN_DIST_2 = MIN_DIST * MIN_DIST;

function rejectionSample(
  rng: () => number,
  count: number,
  area: { xMin: number; xMax: number; yMin: number; yMax: number },
  existing: Array<[number, number]> = [],
  attempts = 4000,
): Array<[number, number]> {
  const out: Array<[number, number]> = [...existing];
  const target = existing.length + count;
  let tries = 0;
  while (out.length < target && tries < attempts) {
    tries++;
    const x = area.xMin + rng() * (area.xMax - area.xMin);
    const y = area.yMin + rng() * (area.yMax - area.yMin);
    let ok = true;
    for (const [ex, ey] of out) {
      const dx = ex - x;
      const dy = ey - y;
      if (dx * dx + dy * dy < MIN_DIST_2) {
        ok = false;
        break;
      }
    }
    if (ok) out.push([x, y]);
  }
  return out;
}

function clusterAt(
  rng: () => number,
  cx: number,
  cy: number,
  count: number,
  spread: number,
  existing: Array<[number, number]>,
): Array<[number, number]> {
  return rejectionSample(
    rng,
    count,
    { xMin: cx - spread, xMax: cx + spread, yMin: cy - spread, yMax: cy + spread },
    existing,
    300,
  );
}

function presetSparseMeadow(rng: () => number): Array<[number, number]> {
  let spots: Array<[number, number]> = [];
  spots = clusterAt(rng, 0.25, 0.30, 4, 0.12, spots);
  spots = clusterAt(rng, 0.70, 0.45, 4, 0.13, spots);
  spots = clusterAt(rng, 0.40, 0.75, 4, 0.13, spots);
  return spots;
}

function presetRandomScatter(rng: () => number): Array<[number, number]> {
  return rejectionSample(rng, 16, { xMin: 0.08, xMax: 0.92, yMin: 0.08, yMax: 0.92 });
}

function presetTwoGroves(rng: () => number): Array<[number, number]> {
  let spots: Array<[number, number]> = [];
  spots = clusterAt(rng, 0.27, 0.35, 9, 0.18, spots);
  spots = clusterAt(rng, 0.72, 0.65, 9, 0.18, spots);
  return spots;
}

function presetDiagonalStripe(rng: () => number): Array<[number, number]> {
  const spots: Array<[number, number]> = [];
  let tries = 0;
  while (spots.length < 14 && tries < 3000) {
    tries++;
    const t = rng();
    const cx = 0.15 + t * 0.7;
    const cy = 0.85 - t * 0.7;
    const jx = (rng() - 0.5) * 0.18;
    const jy = (rng() - 0.5) * 0.18;
    const x = Math.max(0.05, Math.min(0.95, cx + jx));
    const y = Math.max(0.05, Math.min(0.95, cy + jy));
    let ok = true;
    for (const [ex, ey] of spots) {
      const dx = ex - x;
      const dy = ey - y;
      if (dx * dx + dy * dy < MIN_DIST_2) {
        ok = false;
        break;
      }
    }
    if (ok) spots.push([x, y]);
  }
  return spots;
}

function presetLShape(rng: () => number): Array<[number, number]> {
  let spots: Array<[number, number]> = [];
  spots = rejectionSample(
    rng,
    8,
    { xMin: 0.08, xMax: 0.45, yMin: 0.08, yMax: 0.92 },
    spots,
  );
  spots = rejectionSample(
    rng,
    8,
    { xMin: 0.08, xMax: 0.92, yMin: 0.65, yMax: 0.92 },
    spots,
  );
  return spots;
}

function presetCornerCluster(rng: () => number): Array<[number, number]> {
  let spots: Array<[number, number]> = [];
  spots = rejectionSample(
    rng,
    14,
    { xMin: 0.08, xMax: 0.55, yMin: 0.08, yMax: 0.55 },
    spots,
  );
  spots = clusterAt(rng, 0.78, 0.78, 4, 0.12, spots);
  spots = clusterAt(rng, 0.78, 0.30, 2, 0.08, spots);
  return spots;
}

export const LAYOUTS: LayoutPreset[] = [
  { name: "Sparse Meadow", spotCount: 12, generator: presetSparseMeadow },
  { name: "Random Scatter", spotCount: 16, generator: presetRandomScatter },
  { name: "Two Groves", spotCount: 18, generator: presetTwoGroves },
  { name: "Diagonal Stripe", spotCount: 14, generator: presetDiagonalStripe },
  { name: "L-Shape", spotCount: 16, generator: presetLShape },
  { name: "Corner Cluster", spotCount: 20, generator: presetCornerCluster },
];

export function generateLayout(presetIndex: number, rng: () => number): Array<[number, number]> {
  const preset = LAYOUTS[presetIndex % LAYOUTS.length];
  return preset.generator(rng);
}
