import {
  GameState,
  buyCart,
  cartCost,
  createInitialState,
  harvestAllRipe,
  plotIsRipe,
  sellAll,
  setActiveZone,
  tickCarts,
  unlockZone,
} from "../../src/game/state";
import { ZONES } from "../../src/game/zones";

interface SimEvent {
  t: number;
  kind: "start" | "harvest" | "sell" | "buyCart" | "unlock" | "switch";
  detail: string;
}

interface RunResult {
  name: string;
  events: SimEvent[];
  finalState: GameState;
  taps: number;
  durationMs: number;
  coinHistory: number[];
  ripeWaitTotalMs: number;
}

interface Strategy {
  name: string;
  harvestIntervalMs: number;
  forceManualOnNoCart: boolean;
}

const TICK_MS = 100;
const COIN_HISTORY_INTERVAL_MS = 10_000;
const MAX_CART_LEVEL = 6;

const STRATEGIES: Strategy[] = [
  { name: "afk", harvestIntervalMs: Infinity, forceManualOnNoCart: true },
  { name: "casual-3s", harvestIntervalMs: 3000, forceManualOnNoCart: true },
  { name: "active-1s", harvestIntervalMs: 1000, forceManualOnNoCart: true },
];

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, "0");
  const dec = (Math.floor(ms / 100) % 10).toString();
  return `${m}:${sec}.${dec}`;
}

function run(strategy: Strategy, durationMs: number): RunResult {
  const state = createInitialState();
  for (const z of ZONES) {
    for (const p of state.zones[z.id].spots) p.plantedAt = 0;
  }
  state.lastSaved = 0;
  const events: SimEvent[] = [{ t: 0, kind: "start", detail: strategy.name }];
  const coinHistory: number[] = [];
  let taps = 0;
  let now = 0;
  let lastManualHarvest = -Infinity;
  let ripeWaitTotalMs = 0;

  while (now < durationMs) {
    for (const z of ZONES) {
      if (!state.zones[z.id].unlocked && state.coins >= z.unlockCost) {
        if (unlockZone(state, z.id, now)) {
          taps++;
          events.push({ t: now, kind: "unlock", detail: z.name });
          setActiveZone(state, z.id);
          events.push({ t: now, kind: "switch", detail: z.name });
        }
      }
    }

    const activeDef = ZONES.find((z) => z.id === state.activeZoneId)!;
    const activeZone = state.zones[activeDef.id];

    const ripeCount = activeZone.spots.filter((p) => plotIsRipe(p, activeDef.growMs, now)).length;
    ripeWaitTotalMs += ripeCount * TICK_MS;

    const wantManual =
      ripeCount > 0 &&
      (strategy.forceManualOnNoCart && activeZone.cartLevel === 0
        ? true
        : now - lastManualHarvest >= strategy.harvestIntervalMs);
    if (wantManual) {
      const n = harvestAllRipe(state, activeDef.id, now);
      if (n > 0) {
        taps++;
        lastManualHarvest = now;
        events.push({ t: now, kind: "harvest", detail: `${n}x ${activeDef.name}` });
      }
    }

    const cost = cartCost(activeZone.cartLevel);
    if (
      state.coins + activeZone.inventory * activeDef.sellPrice >= cost &&
      activeZone.cartLevel < MAX_CART_LEVEL
    ) {
      if (activeZone.inventory > 0) {
        const earned = sellAll(state, activeDef.id);
        taps++;
        events.push({ t: now, kind: "sell", detail: `+${earned}` });
      }
      if (state.coins >= cartCost(activeZone.cartLevel) && buyCart(state, activeDef.id)) {
        taps++;
        events.push({ t: now, kind: "buyCart", detail: `${activeDef.name} Lv${activeZone.cartLevel}` });
      }
    }

    const nextZoneCost = ZONES.find((z) => !state.zones[z.id].unlocked)?.unlockCost ?? Infinity;
    const sellThreshold = Math.min(nextZoneCost, 25);
    if (activeZone.inventory * activeDef.sellPrice >= sellThreshold) {
      const earned = sellAll(state, activeDef.id);
      taps++;
      events.push({ t: now, kind: "sell", detail: `+${earned}` });
    }

    tickCarts(state, now, TICK_MS);

    if (now % COIN_HISTORY_INTERVAL_MS < TICK_MS) {
      coinHistory.push(Math.floor(state.coins));
    }

    now += TICK_MS;
  }

  for (const z of ZONES) {
    if (state.zones[z.id].inventory > 0) sellAll(state, z.id);
  }

  return { name: strategy.name, events, finalState: state, taps, durationMs, coinHistory, ripeWaitTotalMs };
}

function summarize(r: RunResult): void {
  const e = r.events;
  const find = (kind: SimEvent["kind"], pred?: (ev: SimEvent) => boolean) =>
    e.find((ev) => ev.kind === kind && (!pred || pred(ev)));

  const totalCartLv = ZONES.reduce((s, z) => s + r.finalState.zones[z.id].cartLevel, 0);

  console.log("");
  console.log(`=============== Strategy: ${r.name} ===============`);
  console.log(`Duration:        ${fmtTime(r.durationMs)}`);
  console.log(`Total taps:      ${r.taps}  (${(r.taps / (r.durationMs / 60_000)).toFixed(1)}/min)`);
  console.log(`Final coins:     ${Math.floor(r.finalState.coins)}`);
  console.log(`Total cart lvls: ${totalCartLv}`);
  console.log(`Ripe wait time:  ${(r.ripeWaitTotalMs / 1000).toFixed(0)}s (lower = less wasted potential)`);
  console.log("");
  console.log("Milestones:");
  const milestones: Array<[string, SimEvent | undefined]> = [
    ["First harvest", find("harvest")],
    ["First sell", find("sell")],
    ["First cart Lv1", find("buyCart")],
    ["Wheat cart Lv2", e.find((ev) => ev.kind === "buyCart" && ev.detail.includes("Wheat") && ev.detail.includes("Lv2"))],
    ["Carrots unlocked", find("unlock", (ev) => ev.detail.toLowerCase().includes("carrot"))],
    ["First Carrot harvest", find("harvest", (ev) => ev.detail.toLowerCase().includes("carrot"))],
    ["Carrot cart Lv1", find("buyCart", (ev) => ev.detail.toLowerCase().includes("carrot"))],
    ["Carrot cart Lv3", e.find((ev) => ev.kind === "buyCart" && ev.detail.includes("Carrot") && ev.detail.includes("Lv3"))],
  ];
  for (const [label, ev] of milestones) {
    console.log(`  ${label.padEnd(24)} ${ev ? fmtTime(ev.t) : "(not reached)"}`);
  }

  console.log("");
  console.log("Coins over time (every 10s):");
  const max = Math.max(...r.coinHistory, 1);
  for (let i = 0; i < r.coinHistory.length; i += 6) {
    const v = r.coinHistory[i];
    const bar = "█".repeat(Math.floor((v / max) * 50));
    console.log(`  ${fmtTime(i * COIN_HISTORY_INTERVAL_MS).padStart(8)}  ${v.toString().padStart(6)}  ${bar}`);
  }

  console.log("");
  console.log("Stagnant periods (>30s gap between meaningful events):");
  let last = 0;
  const stagnant: Array<[number, number]> = [];
  for (const ev of e) {
    if (ev.kind === "switch" || ev.kind === "start") continue;
    if (ev.t - last > 30_000) stagnant.push([last, ev.t]);
    last = ev.t;
  }
  if (stagnant.length === 0) console.log("  none");
  else for (const [a, b] of stagnant) console.log(`  ${fmtTime(a)} -> ${fmtTime(b)} (${Math.floor((b - a) / 1000)}s)`);
}

const minutes = Number(process.argv[2] ?? 15);
for (const s of STRATEGIES) {
  summarize(run(s, minutes * 60 * 1000));
}
