import {
  GameState,
  buyCart,
  buyDragRadius,
  buyGrowth,
  buyPrice,
  buyYield,
  cartCost,
  createInitialState,
  dragRadius as dragRadiusFn,
  dragRadiusCost,
  effectiveGrowMs,
  effectivePriceMult,
  effectiveYield,
  growthCost,
  harvestAllRipe,
  harvestInRadius,
  plotIsRipe,
  priceCost,
  sellAll,
  setActiveZone,
  tickCarts,
  unlockZone,
  yieldCost,
} from "../../src/game/state";
import { ZONES } from "../../src/game/zones";

interface SimEvent {
  t: number;
  kind:
    | "start"
    | "harvest"
    | "sell"
    | "buyCart"
    | "buyYield"
    | "buyGrowth"
    | "buyPrice"
    | "buyDrag"
    | "unlock"
    | "switch";
  detail: string;
}

interface RunResult {
  name: string;
  events: SimEvent[];
  finalState: GameState;
  taps: number;
  durationMs: number;
  coinHistory: number[];
}

interface Strategy {
  name: string;
  /** ms between simulated drag harvests; Infinity = AFK */
  dragIntervalMs: number;
}

const TICK_MS = 100;
const COIN_HISTORY_INTERVAL_MS = 60_000;

const STRATEGIES: Strategy[] = [
  { name: "afk", dragIntervalMs: Infinity },
  { name: "casual-3s", dragIntervalMs: 3000 },
  { name: "active-1s", dragIntervalMs: 1000 },
];

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d > 0) return `${d}d${h}h${m}m`;
  if (h > 0) return `${h}h${m}m${ss}s`;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function shortMoney(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1_000_000) return (n / 1000).toFixed(1) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n < 1_000_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  return (n / 1_000_000_000_000).toFixed(1) + "T";
}

function tryUpgradesGreedy(state: GameState, events: SimEvent[], now: number): number {
  let bought = 0;
  while (true) {
    const z = state.zones[state.activeZoneId];
    const zoneDef = ZONES.find((d) => d.id === state.activeZoneId)!;

    type Option = {
      cost: number;
      do: () => boolean;
      label: SimEvent["kind"];
      detail: string;
    };

    const options: Option[] = [];
    if (z.cartLevel < 50) {
      options.push({
        cost: cartCost(z.cartLevel),
        do: () => buyCart(state, zoneDef.id),
        label: "buyCart",
        detail: `${zoneDef.id} Lv${z.cartLevel + 1}`,
      });
    }
    if (z.yieldLevel < 50) {
      options.push({
        cost: yieldCost(z.yieldLevel),
        do: () => buyYield(state, zoneDef.id),
        label: "buyYield",
        detail: `${zoneDef.id} Lv${z.yieldLevel + 1}`,
      });
    }
    if (z.growthLevel < 30) {
      options.push({
        cost: growthCost(z.growthLevel),
        do: () => buyGrowth(state, zoneDef.id),
        label: "buyGrowth",
        detail: `${zoneDef.id} Lv${z.growthLevel + 1}`,
      });
    }
    if (z.priceLevel < 50) {
      options.push({
        cost: priceCost(z.priceLevel),
        do: () => buyPrice(state, zoneDef.id),
        label: "buyPrice",
        detail: `${zoneDef.id} Lv${z.priceLevel + 1}`,
      });
    }
    if (state.dragRadiusLevel < 20) {
      options.push({
        cost: dragRadiusCost(state.dragRadiusLevel),
        do: () => buyDragRadius(state),
        label: "buyDrag",
        detail: `Lv${state.dragRadiusLevel + 1}`,
      });
    }

    if (options.length === 0) return bought;
    options.sort((a, b) => a.cost - b.cost);
    const cheapest = options[0];
    const reservedForUnlock = ZONES.find(
      (d) => !state.zones[d.id].unlocked,
    )?.unlockCost;
    const cap = reservedForUnlock ?? Infinity;
    if (cheapest.cost > state.coins) return bought;
    if (cheapest.cost > cap * 0.4 && state.coins < cap) return bought;
    if (cheapest.do()) {
      events.push({ t: now, kind: cheapest.label, detail: cheapest.detail });
      bought++;
    } else {
      return bought;
    }
  }
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
  let lastDrag = -Infinity;

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
    const grow = effectiveGrowMs(activeDef.growMs, activeZone.growthLevel, state, now);

    if (activeZone.cartLevel === 0) {
      if (activeZone.spots.some((p) => plotIsRipe(p, grow, now))) {
        const n = harvestAllRipe(state, activeDef.id, now);
        if (n > 0) {
          taps++;
          events.push({ t: now, kind: "harvest", detail: `${n}x ${activeDef.id}` });
        }
      }
    } else if (now - lastDrag >= strategy.dragIntervalMs) {
      const n = harvestInRadius(state, activeDef.id, 0.5, 0.5, dragRadiusFn(state), now);
      if (n > 0) {
        taps++;
        lastDrag = now;
        events.push({ t: now, kind: "harvest", detail: `${n}x ${activeDef.id}` });
      }
    }

    const priceMult = effectivePriceMult(activeZone.priceLevel, state, now);
    const sellThreshold = Math.max(10, activeDef.unlockCost * 0.3);
    if (activeZone.inventory * activeDef.sellPrice * priceMult >= sellThreshold) {
      const earned = sellAll(state, activeDef.id);
      if (earned > 0) {
        taps++;
        events.push({ t: now, kind: "sell", detail: `+${shortMoney(earned)}` });
      }
    }

    const bought = tryUpgradesGreedy(state, events, now);
    taps += bought;

    tickCarts(state, now, TICK_MS);

    if (now % COIN_HISTORY_INTERVAL_MS < TICK_MS) {
      coinHistory.push(Math.floor(state.coins));
    }

    now += TICK_MS;
  }

  for (const z of ZONES) {
    if (state.zones[z.id].inventory > 0) sellAll(state, z.id);
  }

  return { name: strategy.name, events, finalState: state, taps, durationMs, coinHistory };
}

function summarize(r: RunResult): void {
  const e = r.events;

  console.log("");
  console.log(`=============== Strategy: ${r.name} ===============`);
  console.log(`Duration:     ${fmtTime(r.durationMs)}`);
  console.log(`Taps:         ${r.taps}`);
  console.log(`Final coins:  ${shortMoney(r.finalState.coins)}`);

  console.log("");
  console.log("Zone unlocks:");
  for (const z of ZONES) {
    const ev = e.find((x) => x.kind === "unlock" && x.detail === z.name);
    const zs = r.finalState.zones[z.id];
    const unlocked = zs.unlocked;
    if (!unlocked && z.unlockCost > 0) continue;
    const t = ev ? fmtTime(ev.t) : "start";
    console.log(
      `  ${z.name.padEnd(22)} ${t.padStart(10)}  cart=${zs.cartLevel.toString().padStart(2)}  yld=${zs.yieldLevel.toString().padStart(2)}  spd=${zs.growthLevel.toString().padStart(2)}  pri=${zs.priceLevel.toString().padStart(2)}`,
    );
  }

  console.log("");
  console.log("Coins per minute:");
  const max = Math.max(...r.coinHistory, 1);
  for (let i = 0; i < r.coinHistory.length; i++) {
    const v = r.coinHistory[i];
    const bar = "█".repeat(Math.floor((v / max) * 50));
    console.log(`  ${fmtTime(i * COIN_HISTORY_INTERVAL_MS).padStart(10)}  ${shortMoney(v).padStart(10)}  ${bar}`);
  }
}

const minutes = Number(process.argv[2] ?? 60);
for (const s of STRATEGIES) {
  summarize(run(s, minutes * 60 * 1000));
}
