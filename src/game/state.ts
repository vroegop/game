import { ZONES, PLOTS_PER_ZONE } from "./zones";

export interface PlotState {
  plantedAt: number;
}

export interface ZoneState {
  unlocked: boolean;
  plots: PlotState[];
  inventory: number;
  cartLevel: number;
  cartChargeMs: number;
}

export interface GameState {
  coins: number;
  zones: Record<string, ZoneState>;
  activeZoneId: string;
  lastSaved: number;
}

const STORAGE_KEY = "idle-farm-save-v1";
const CART_BASE_COST = 25;
const CART_COST_MULT = 3;
const CART_BASE_INTERVAL_MS = 5_000;
const CART_INTERVAL_REDUCTION = 0.7;

export function createInitialState(): GameState {
  const now = Date.now();
  const zones: Record<string, ZoneState> = {};
  for (const z of ZONES) {
    zones[z.id] = {
      unlocked: z.unlockCost === 0,
      plots: Array.from({ length: PLOTS_PER_ZONE }, () => ({ plantedAt: now })),
      inventory: 0,
      cartLevel: 0,
      cartChargeMs: 0,
    };
  }
  return { coins: 0, zones, activeZoneId: ZONES[0].id, lastSaved: now };
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState;
    for (const z of ZONES) {
      if (!parsed.zones[z.id]) {
        parsed.zones[z.id] = {
          unlocked: z.unlockCost === 0,
          plots: Array.from({ length: PLOTS_PER_ZONE }, () => ({ plantedAt: Date.now() })),
          inventory: 0,
          cartLevel: 0,
          cartChargeMs: 0,
        };
      }
      if (parsed.zones[z.id].cartChargeMs === undefined) {
        parsed.zones[z.id].cartChargeMs = 0;
      }
    }
    if (!parsed.activeZoneId || !parsed.zones[parsed.activeZoneId]?.unlocked) {
      parsed.activeZoneId = ZONES[0].id;
    }
    applyOfflineProgress(parsed);
    return parsed;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: GameState): void {
  state.lastSaved = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function plotIsRipe(plot: PlotState, growMs: number, now: number): boolean {
  return now - plot.plantedAt >= growMs;
}

export function plotProgress(plot: PlotState, growMs: number, now: number): number {
  return Math.min(1, (now - plot.plantedAt) / growMs);
}

export function harvestPlot(state: GameState, zoneId: string, plotIndex: number, now: number): boolean {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return false;
  const zone = state.zones[zoneId];
  if (!zone.unlocked) return false;
  const plot = zone.plots[plotIndex];
  if (!plotIsRipe(plot, zoneDef.growMs, now)) return false;
  zone.inventory += 1;
  plot.plantedAt = now;
  return true;
}

export function harvestAllRipe(state: GameState, zoneId: string, now: number): number {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return 0;
  const zone = state.zones[zoneId];
  if (!zone.unlocked) return 0;
  let harvested = 0;
  for (const plot of zone.plots) {
    if (plotIsRipe(plot, zoneDef.growMs, now)) {
      zone.inventory += 1;
      plot.plantedAt = now;
      harvested += 1;
    }
  }
  return harvested;
}

export function sellAll(state: GameState, zoneId: string): number {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return 0;
  const zone = state.zones[zoneId];
  const earned = zone.inventory * zoneDef.sellPrice;
  state.coins += earned;
  zone.inventory = 0;
  return earned;
}

export function unlockZone(state: GameState, zoneId: string, now: number): boolean {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return false;
  const zone = state.zones[zoneId];
  if (zone.unlocked) return false;
  if (state.coins < zoneDef.unlockCost) return false;
  state.coins -= zoneDef.unlockCost;
  zone.unlocked = true;
  zone.plots.forEach((p) => (p.plantedAt = now));
  return true;
}

export function setActiveZone(state: GameState, zoneId: string): boolean {
  const zone = state.zones[zoneId];
  if (!zone || !zone.unlocked) return false;
  state.activeZoneId = zoneId;
  return true;
}

export function cartCost(level: number): number {
  return Math.floor(CART_BASE_COST * Math.pow(CART_COST_MULT, level));
}

export function cartIntervalMs(level: number): number {
  if (level <= 0) return Infinity;
  return CART_BASE_INTERVAL_MS * Math.pow(CART_INTERVAL_REDUCTION, level - 1);
}

export function buyCart(state: GameState, zoneId: string): boolean {
  const zone = state.zones[zoneId];
  if (!zone || !zone.unlocked) return false;
  const cost = cartCost(zone.cartLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  zone.cartLevel += 1;
  return true;
}

export function tickCarts(state: GameState, now: number, deltaMs: number): void {
  if (deltaMs <= 0) return;
  const zoneDef = ZONES.find((z) => z.id === state.activeZoneId);
  if (!zoneDef) return;
  const zone = state.zones[zoneDef.id];
  if (!zone.unlocked || zone.cartLevel <= 0) return;
  const interval = cartIntervalMs(zone.cartLevel);
  zone.cartChargeMs += deltaMs;
  while (zone.cartChargeMs >= interval) {
    zone.cartChargeMs -= interval;
    const ripeIdx = zone.plots.findIndex((p) => plotIsRipe(p, zoneDef.growMs, now));
    if (ripeIdx === -1) {
      zone.cartChargeMs = 0;
      break;
    }
    zone.inventory += 1;
    zone.plots[ripeIdx].plantedAt = now;
  }
}

function applyOfflineProgress(state: GameState): void {
  const now = Date.now();
  const elapsed = Math.max(0, now - state.lastSaved);
  if (elapsed <= 0) return;
  const cappedMs = Math.min(elapsed, 8 * 60 * 60 * 1000);
  const offlineRate = 0.5;
  for (const zoneDef of ZONES) {
    const zone = state.zones[zoneDef.id];
    if (!zone.unlocked) continue;
    for (const plot of zone.plots) {
      const since = now - plot.plantedAt;
      if (since >= zoneDef.growMs) {
        plot.plantedAt = now;
        zone.inventory += 1;
      }
    }
    if (zone.cartLevel > 0 && zoneDef.id === state.activeZoneId) {
      const interval = cartIntervalMs(zone.cartLevel);
      const offlineHarvests = Math.floor((cappedMs * offlineRate) / interval);
      zone.inventory += offlineHarvests;
    }
  }
}
