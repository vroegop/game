import { generateLayout } from "./layouts";
import { ZONES } from "./zones";

export interface CropSpot {
  x: number;
  y: number;
  plantedAt: number;
}

export interface Cart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  changeDirT: number;
}

export interface ZoneState {
  unlocked: boolean;
  spots: CropSpot[];
  inventory: number;
  cartLevel: number;
  yieldLevel: number;
  growthLevel: number;
  priceLevel: number;
  carts: Cart[];
}

export interface GameState {
  coins: number;
  zones: Record<string, ZoneState>;
  activeZoneId: string;
  dragRadiusLevel: number;
  lastSaved: number;
}

const STORAGE_KEY = "idle-farm-save-v3";

const CART_BASE_COST = 30;
const CART_COST_MULT = 1.7;
const CART_BASE_SPEED = 0.07;
const CART_BASE_RADIUS = 0.075;

const YIELD_BASE_COST = 25;
const YIELD_COST_MULT = 1.6;
const YIELD_MAX = 50;

const GROWTH_BASE_COST = 40;
const GROWTH_COST_MULT = 1.65;
const GROWTH_MAX = 30;
const GROWTH_PER_LEVEL = 0.03;
const GROWTH_FLOOR = 0.1;

const PRICE_BASE_COST = 60;
const PRICE_COST_MULT = 1.7;
const PRICE_MAX = 50;
const PRICE_PER_LEVEL = 0.05;

const DRAG_BASE_RADIUS = 0.085;
const DRAG_RADIUS_INCREMENT = 0.018;
const DRAG_RADIUS_BASE_COST = 40;
const DRAG_RADIUS_COST_MULT = 2.6;
const DRAG_MAX = 20;

const OFFLINE_CAP_BASE_HOURS = 8;

function hashStr(s: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

function makePRNG(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function generateSpots(zoneId: string): CropSpot[] {
  const def = ZONES.find((z) => z.id === zoneId);
  if (!def) return [];
  const rng = makePRNG(hashStr(zoneId));
  const positions = generateLayout(def.layoutPreset, rng);
  return positions.map(([x, y]) => ({ x, y, plantedAt: 0 }));
}

function freshZoneState(z: { id: string; unlockCost: number }): ZoneState {
  return {
    unlocked: z.unlockCost === 0,
    spots: generateSpots(z.id),
    inventory: 0,
    cartLevel: 0,
    yieldLevel: 0,
    growthLevel: 0,
    priceLevel: 0,
    carts: [],
  };
}

export function createInitialState(): GameState {
  const now = Date.now();
  const zones: Record<string, ZoneState> = {};
  for (const z of ZONES) {
    zones[z.id] = freshZoneState(z);
  }
  return {
    coins: 0,
    zones,
    activeZoneId: ZONES[0].id,
    dragRadiusLevel: 0,
    lastSaved: now,
  };
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState;
    for (const z of ZONES) {
      if (!parsed.zones[z.id]) {
        parsed.zones[z.id] = freshZoneState(z);
      }
      const zone = parsed.zones[z.id];
      if (!zone.spots || zone.spots.length === 0) zone.spots = generateSpots(z.id);
      if (!Array.isArray(zone.carts)) zone.carts = [];
      if (typeof zone.yieldLevel !== "number") zone.yieldLevel = 0;
      if (typeof zone.growthLevel !== "number") zone.growthLevel = 0;
      if (typeof zone.priceLevel !== "number") zone.priceLevel = 0;
    }
    if (!parsed.activeZoneId || !parsed.zones[parsed.activeZoneId]?.unlocked) {
      parsed.activeZoneId = ZONES[0].id;
    }
    if (typeof parsed.dragRadiusLevel !== "number") parsed.dragRadiusLevel = 0;
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

export function effectiveGrowMs(baseGrowMs: number, growthLevel: number): number {
  const factor = Math.max(GROWTH_FLOOR, 1 - growthLevel * GROWTH_PER_LEVEL);
  return baseGrowMs * factor;
}

export function effectiveYield(yieldLevel: number): number {
  return 1 + yieldLevel;
}

export function effectivePriceMult(priceLevel: number): number {
  return 1 + priceLevel * PRICE_PER_LEVEL;
}

export function plotIsRipe(spot: CropSpot, growMs: number, now: number): boolean {
  return now - spot.plantedAt >= growMs;
}

export function plotProgress(spot: CropSpot, growMs: number, now: number): number {
  return Math.min(1, (now - spot.plantedAt) / growMs);
}

export function harvestInRadius(
  state: GameState,
  zoneId: string,
  cx: number,
  cy: number,
  r: number,
  now: number,
): number {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return 0;
  const zone = state.zones[zoneId];
  if (!zone.unlocked) return 0;
  const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel);
  const yieldPer = effectiveYield(zone.yieldLevel);
  const r2 = r * r;
  let n = 0;
  for (const spot of zone.spots) {
    if (!plotIsRipe(spot, grow, now)) continue;
    const dx = spot.x - cx;
    const dy = spot.y - cy;
    if (dx * dx + dy * dy <= r2) {
      spot.plantedAt = now;
      zone.inventory += yieldPer;
      n += 1;
    }
  }
  return n;
}

export function harvestAllRipe(state: GameState, zoneId: string, now: number): number {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return 0;
  const zone = state.zones[zoneId];
  if (!zone.unlocked) return 0;
  const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel);
  const yieldPer = effectiveYield(zone.yieldLevel);
  let n = 0;
  for (const spot of zone.spots) {
    if (plotIsRipe(spot, grow, now)) {
      spot.plantedAt = now;
      zone.inventory += yieldPer;
      n += 1;
    }
  }
  return n;
}

export function sellAll(state: GameState, zoneId: string): number {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return 0;
  const zone = state.zones[zoneId];
  const priceMult = effectivePriceMult(zone.priceLevel);
  const earned = Math.floor(zone.inventory * zoneDef.sellPrice * priceMult);
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
  for (const spot of zone.spots) spot.plantedAt = now;
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

export function cartSpeed(level: number): number {
  return CART_BASE_SPEED * (1 + 0.15 * Math.max(0, level - 1));
}

export function cartRadius(level: number): number {
  return CART_BASE_RADIUS * (1 + 0.07 * Math.max(0, level - 1));
}

export function cartCountFor(level: number): number {
  if (level <= 0) return 0;
  if (level < 12) return 1;
  if (level < 24) return 2;
  if (level < 40) return 3;
  return 4;
}

export function buyCart(state: GameState, zoneId: string): boolean {
  const zone = state.zones[zoneId];
  if (!zone || !zone.unlocked) return false;
  const cost = cartCost(zone.cartLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  zone.cartLevel += 1;
  const targetCount = cartCountFor(zone.cartLevel);
  while (zone.carts.length < targetCount) {
    const angle = Math.random() * Math.PI * 2;
    const speed = cartSpeed(zone.cartLevel);
    zone.carts.push({
      x: 0.2 + Math.random() * 0.6,
      y: 0.2 + Math.random() * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      facing: angle,
      changeDirT: 0,
    });
  }
  return true;
}

export function yieldCost(level: number): number {
  return Math.floor(YIELD_BASE_COST * Math.pow(YIELD_COST_MULT, level));
}

export function buyYield(state: GameState, zoneId: string): boolean {
  const zone = state.zones[zoneId];
  if (!zone || !zone.unlocked) return false;
  if (zone.yieldLevel >= YIELD_MAX) return false;
  const cost = yieldCost(zone.yieldLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  zone.yieldLevel += 1;
  return true;
}

export function growthCost(level: number): number {
  return Math.floor(GROWTH_BASE_COST * Math.pow(GROWTH_COST_MULT, level));
}

export function buyGrowth(state: GameState, zoneId: string): boolean {
  const zone = state.zones[zoneId];
  if (!zone || !zone.unlocked) return false;
  if (zone.growthLevel >= GROWTH_MAX) return false;
  const cost = growthCost(zone.growthLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  zone.growthLevel += 1;
  return true;
}

export function priceCost(level: number): number {
  return Math.floor(PRICE_BASE_COST * Math.pow(PRICE_COST_MULT, level));
}

export function buyPrice(state: GameState, zoneId: string): boolean {
  const zone = state.zones[zoneId];
  if (!zone || !zone.unlocked) return false;
  if (zone.priceLevel >= PRICE_MAX) return false;
  const cost = priceCost(zone.priceLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  zone.priceLevel += 1;
  return true;
}

export function dragRadius(level: number): number {
  return DRAG_BASE_RADIUS + level * DRAG_RADIUS_INCREMENT;
}

export function dragRadiusCost(level: number): number {
  return Math.floor(DRAG_RADIUS_BASE_COST * Math.pow(DRAG_RADIUS_COST_MULT, level));
}

export function buyDragRadius(state: GameState): boolean {
  if (state.dragRadiusLevel >= DRAG_MAX) return false;
  const cost = dragRadiusCost(state.dragRadiusLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  state.dragRadiusLevel += 1;
  return true;
}

export const UPGRADE_CAPS = {
  cart: 100,
  yield: YIELD_MAX,
  growth: GROWTH_MAX,
  price: PRICE_MAX,
  drag: DRAG_MAX,
};

export function tickCarts(state: GameState, now: number, deltaMs: number): void {
  if (deltaMs <= 0) return;
  const zoneDef = ZONES.find((z) => z.id === state.activeZoneId);
  if (!zoneDef) return;
  const zone = state.zones[zoneDef.id];
  if (!zone.unlocked) return;

  const dt = deltaMs / 1000;
  const r = cartRadius(zone.cartLevel);
  const r2 = r * r;
  const speed = cartSpeed(zone.cartLevel);
  const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel);
  const yieldPer = effectiveYield(zone.yieldLevel);

  for (const cart of zone.carts) {
    cart.x += cart.vx * dt;
    cart.y += cart.vy * dt;
    if (cart.x < 0.05) {
      cart.x = 0.05;
      cart.vx = Math.abs(cart.vx);
    }
    if (cart.x > 0.95) {
      cart.x = 0.95;
      cart.vx = -Math.abs(cart.vx);
    }
    if (cart.y < 0.07) {
      cart.y = 0.07;
      cart.vy = Math.abs(cart.vy);
    }
    if (cart.y > 0.93) {
      cart.y = 0.93;
      cart.vy = -Math.abs(cart.vy);
    }

    cart.changeDirT += deltaMs;
    if (cart.changeDirT > 250) {
      cart.changeDirT = 0;
      const nearest = findNearestRipe(zone, cart.x, cart.y, grow, now);
      let angle: number;
      if (nearest) {
        angle = Math.atan2(nearest.y - cart.y, nearest.x - cart.x);
      } else {
        angle = Math.atan2(cart.vy, cart.vx) + (Math.random() - 0.5) * 0.6;
      }
      cart.vx = Math.cos(angle) * speed;
      cart.vy = Math.sin(angle) * speed;
    }
    cart.facing = Math.atan2(cart.vy, cart.vx);

    for (const spot of zone.spots) {
      if (!plotIsRipe(spot, grow, now)) continue;
      const dx = spot.x - cart.x;
      const dy = spot.y - cart.y;
      if (dx * dx + dy * dy <= r2) {
        spot.plantedAt = now;
        zone.inventory += yieldPer;
      }
    }
  }
}

function findNearestRipe(
  zone: ZoneState,
  cx: number,
  cy: number,
  growMs: number,
  now: number,
): CropSpot | null {
  let best: CropSpot | null = null;
  let bestD = Infinity;
  for (const spot of zone.spots) {
    if (!plotIsRipe(spot, growMs, now)) continue;
    const dx = spot.x - cx;
    const dy = spot.y - cy;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = spot;
    }
  }
  return best;
}

function applyOfflineProgress(state: GameState): void {
  const now = Date.now();
  const elapsed = Math.max(0, now - state.lastSaved);
  if (elapsed <= 0) return;
  const cappedMs = Math.min(elapsed, OFFLINE_CAP_BASE_HOURS * 60 * 60 * 1000);

  for (const zoneDef of ZONES) {
    const zone = state.zones[zoneDef.id];
    if (!zone.unlocked) continue;
    const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel);
    const yieldPer = effectiveYield(zone.yieldLevel);
    for (const spot of zone.spots) {
      const since = now - spot.plantedAt;
      if (since >= grow) {
        spot.plantedAt = now;
        zone.inventory += yieldPer;
      }
    }
    if (zoneDef.id === state.activeZoneId && zone.cartLevel > 0) {
      const r = cartRadius(zone.cartLevel);
      const speed = cartSpeed(zone.cartLevel);
      const sweptAreaPerSec = 2 * r * speed;
      const cropDensity = zone.spots.length;
      const harvestsPerSec = sweptAreaPerSec * cropDensity * 0.04;
      const offlineHarvests = Math.floor(
        (cappedMs / 1000) * harvestsPerSec * cartCountFor(zone.cartLevel) * 0.5,
      );
      zone.inventory += offlineHarvests * yieldPer;
    }
  }
}
