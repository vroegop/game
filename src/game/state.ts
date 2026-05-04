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
  carts: Cart[];
}

export interface GameState {
  coins: number;
  zones: Record<string, ZoneState>;
  activeZoneId: string;
  dragRadiusLevel: number;
  lastSaved: number;
}

const STORAGE_KEY = "idle-farm-save-v2";
const CART_BASE_COST = 30;
const CART_COST_MULT = 2.8;
const CART_BASE_SPEED = 0.07;
const CART_BASE_RADIUS = 0.08;
const DRAG_BASE_RADIUS = 0.085;
const DRAG_RADIUS_INCREMENT = 0.018;
const DRAG_RADIUS_BASE_COST = 40;
const DRAG_RADIUS_COST_MULT = 2.6;

export const SPOTS_COLS = 7;
export const SPOTS_ROWS = 5;
export const SPOTS_PER_ZONE = SPOTS_COLS * SPOTS_ROWS;

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

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function generateSpots(zoneId: string): CropSpot[] {
  const spots: CropSpot[] = [];
  const rng = makePRNG(hashStr(zoneId));
  for (let r = 0; r < SPOTS_ROWS; r++) {
    for (let c = 0; c < SPOTS_COLS; c++) {
      const baseX = (c + 0.5) / SPOTS_COLS;
      const baseY = (r + 0.5) / SPOTS_ROWS;
      const jitterX = (rng() - 0.5) * 0.04;
      const jitterY = (rng() - 0.5) * 0.025;
      spots.push({
        x: clamp(baseX + jitterX, 0.04, 0.96),
        y: clamp(baseY + jitterY, 0.06, 0.94),
        plantedAt: 0,
      });
    }
  }
  return spots;
}

export function createInitialState(): GameState {
  const now = Date.now();
  const zones: Record<string, ZoneState> = {};
  for (const z of ZONES) {
    zones[z.id] = {
      unlocked: z.unlockCost === 0,
      spots: generateSpots(z.id),
      inventory: 0,
      cartLevel: 0,
      carts: [],
    };
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
        parsed.zones[z.id] = {
          unlocked: z.unlockCost === 0,
          spots: generateSpots(z.id),
          inventory: 0,
          cartLevel: 0,
          carts: [],
        };
      }
      const zone = parsed.zones[z.id];
      if (!zone.spots || zone.spots.length === 0) zone.spots = generateSpots(z.id);
      if (!Array.isArray(zone.carts)) zone.carts = [];
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
  const r2 = r * r;
  let n = 0;
  for (const spot of zone.spots) {
    if (!plotIsRipe(spot, zoneDef.growMs, now)) continue;
    const dx = spot.x - cx;
    const dy = spot.y - cy;
    if (dx * dx + dy * dy <= r2) {
      spot.plantedAt = now;
      zone.inventory += 1;
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
  let n = 0;
  for (const spot of zone.spots) {
    if (plotIsRipe(spot, zoneDef.growMs, now)) {
      spot.plantedAt = now;
      zone.inventory += 1;
      n += 1;
    }
  }
  return n;
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
  return CART_BASE_SPEED * (1 + 0.12 * Math.max(0, level - 1));
}

export function cartRadius(level: number): number {
  return CART_BASE_RADIUS * (1 + 0.08 * Math.max(0, level - 1));
}

export function buyCart(state: GameState, zoneId: string): boolean {
  const zone = state.zones[zoneId];
  if (!zone || !zone.unlocked) return false;
  const cost = cartCost(zone.cartLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  zone.cartLevel += 1;
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
  return true;
}

export function dragRadius(level: number): number {
  return DRAG_BASE_RADIUS + level * DRAG_RADIUS_INCREMENT;
}

export function dragRadiusCost(level: number): number {
  return Math.floor(DRAG_RADIUS_BASE_COST * Math.pow(DRAG_RADIUS_COST_MULT, level));
}

export function buyDragRadius(state: GameState): boolean {
  const cost = dragRadiusCost(state.dragRadiusLevel);
  if (state.coins < cost) return false;
  state.coins -= cost;
  state.dragRadiusLevel += 1;
  return true;
}

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

    cart.facing = Math.atan2(cart.vy, cart.vx);
    cart.changeDirT += deltaMs;
    if (cart.changeDirT > 1800 + Math.random() * 1700) {
      cart.changeDirT = 0;
      const nearest = findNearestRipe(zone, cart.x, cart.y, zoneDef.growMs, now);
      let angle: number;
      if (nearest && Math.random() < 0.7) {
        angle = Math.atan2(nearest.y - cart.y, nearest.x - cart.x);
      } else {
        angle = Math.random() * Math.PI * 2;
      }
      cart.vx = Math.cos(angle) * speed;
      cart.vy = Math.sin(angle) * speed;
    }

    for (const spot of zone.spots) {
      if (!plotIsRipe(spot, zoneDef.growMs, now)) continue;
      const dx = spot.x - cart.x;
      const dy = spot.y - cart.y;
      if (dx * dx + dy * dy <= r2) {
        spot.plantedAt = now;
        zone.inventory += 1;
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
  const cappedMs = Math.min(elapsed, 8 * 60 * 60 * 1000);

  for (const zoneDef of ZONES) {
    const zone = state.zones[zoneDef.id];
    if (!zone.unlocked) continue;
    for (const spot of zone.spots) {
      const since = now - spot.plantedAt;
      if (since >= zoneDef.growMs) {
        spot.plantedAt = now;
        zone.inventory += 1;
      }
    }
    if (zoneDef.id === state.activeZoneId && zone.cartLevel > 0) {
      const r = cartRadius(zone.cartLevel);
      const speed = cartSpeed(zone.cartLevel);
      const sweptAreaPerSec = 2 * r * speed;
      const cropDensity = SPOTS_PER_ZONE / 1.0;
      const harvestsPerSec = sweptAreaPerSec * cropDensity * 0.04;
      const offlineHarvests = Math.floor(
        (cappedMs / 1000) * harvestsPerSec * zone.cartLevel * 0.5,
      );
      zone.inventory += offlineHarvests;
    }
  }
}
