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
  totalHarvested: number;
  cardUnlocked: boolean;
  cardGilded: boolean;
}

export type BoostKind = "fertilizer" | "sunshine" | "market" | "lucky";

export interface ActiveBoost {
  kind: BoostKind;
  startedAt: number;
  durationMs: number;
}

export type WeatherKind = "sunny" | "rain" | "drought" | "festival" | "storm";

export interface Weather {
  kind: WeatherKind;
  startedAt: number;
  durationMs: number;
}

export interface BoostInventory {
  fertilizer: number;
  sunshine: number;
  market: number;
  lucky: number;
}

export interface GreenhouseState {
  glass: number;
  sprinkler: number;
  compost: number;
  scarecrow: number;
  replanter: number;
}

export interface GemUpgrades {
  magnetDrag: boolean;
  comboMultiplier: boolean;
  luckyCart: boolean;
  gameSpeed: number;
  autoSell: boolean;
  phantomHarvester: boolean;
  weatherInsurance: boolean;
  heirloomSeeds: boolean;
  luckyCharm: number;
  offlineCapStacks: number;
}

export interface GameState {
  coins: number;
  gems: number;
  zones: Record<string, ZoneState>;
  activeZoneId: string;
  dragRadiusLevel: number;
  greenhouse: GreenhouseState;
  gemUpgrades: GemUpgrades;
  boostInventory: BoostInventory;
  activeBoosts: ActiveBoost[];
  weather: Weather;
  lastSaved: number;
}

const STORAGE_KEY = "idle-farm-save-v4";

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

export const GREENHOUSE_GLASS_MAX = 20;
export const GREENHOUSE_GLASS_PER = 0.05;
export const GREENHOUSE_SPRINKLER_MAX = 10;
export const GREENHOUSE_COMPOST_MAX = 20;
export const GREENHOUSE_COMPOST_PER = 0.05;
export const GREENHOUSE_SCARECROW_MAX = 5;
export const GREENHOUSE_REPLANTER_MAX = 10;

const GREENHOUSE_GLASS_COST = (n: number) => Math.floor(500 * Math.pow(1.65, n));
const GREENHOUSE_SPRINKLER_COST = (n: number) => Math.floor(800 * Math.pow(1.8, n));
const GREENHOUSE_COMPOST_COST = (n: number) => Math.floor(1200 * Math.pow(1.7, n));
const GREENHOUSE_REPLANTER_COST = (n: number) => Math.floor(600 * Math.pow(1.7, n));

const GREENHOUSE_SCARECROW_COST = (n: number) => 5 * Math.pow(2, n);

export const BOOST_DURATION_MS: Record<BoostKind, number> = {
  fertilizer: 5 * 60 * 1000,
  sunshine: 5 * 60 * 1000,
  market: 5 * 60 * 1000,
  lucky: 60 * 60 * 1000,
};

export const BOOST_GEM_COST: Record<BoostKind, number> = {
  fertilizer: 8,
  sunshine: 8,
  market: 8,
  lucky: 20,
};

export const GEM_SHOP_COSTS = {
  magnetDrag: 50,
  comboMultiplier: 75,
  luckyCart: 100,
  gameSpeed1: 200,
  gameSpeed2: 500,
  autoSell: 60,
  phantomHarvester: 150,
  weatherInsurance: 120,
  heirloomSeeds: 250,
  luckyCharm: 80,
  offlineCap: 100,
  coins1k: 1,
  coins10k: 5,
  coins100k: 30,
};

const WEATHER_DURATION_MIN_MS = 8 * 60 * 1000;
const WEATHER_DURATION_MAX_MS = 15 * 60 * 1000;

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
    totalHarvested: 0,
    cardUnlocked: false,
    cardGilded: false,
  };
}

function freshGreenhouse(): GreenhouseState {
  return { glass: 0, sprinkler: 0, compost: 0, scarecrow: 0, replanter: 0 };
}

function freshGemUpgrades(): GemUpgrades {
  return {
    magnetDrag: false,
    comboMultiplier: false,
    luckyCart: false,
    gameSpeed: 0,
    autoSell: false,
    phantomHarvester: false,
    weatherInsurance: false,
    heirloomSeeds: false,
    luckyCharm: 0,
    offlineCapStacks: 0,
  };
}

function freshBoostInventory(): BoostInventory {
  return { fertilizer: 0, sunshine: 0, market: 0, lucky: 0 };
}

function freshWeather(now: number): Weather {
  return { kind: "sunny", startedAt: now, durationMs: 10 * 60 * 1000 };
}

export function createInitialState(): GameState {
  const now = Date.now();
  const zones: Record<string, ZoneState> = {};
  for (const z of ZONES) {
    zones[z.id] = freshZoneState(z);
  }
  return {
    coins: 0,
    gems: 0,
    zones,
    activeZoneId: ZONES[0].id,
    dragRadiusLevel: 0,
    greenhouse: freshGreenhouse(),
    gemUpgrades: freshGemUpgrades(),
    boostInventory: freshBoostInventory(),
    activeBoosts: [],
    weather: freshWeather(now),
    lastSaved: now,
  };
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState;
    for (const z of ZONES) {
      if (!parsed.zones[z.id]) parsed.zones[z.id] = freshZoneState(z);
      const zone = parsed.zones[z.id];
      if (!zone.spots || zone.spots.length === 0) zone.spots = generateSpots(z.id);
      if (!Array.isArray(zone.carts)) zone.carts = [];
      if (typeof zone.yieldLevel !== "number") zone.yieldLevel = 0;
      if (typeof zone.growthLevel !== "number") zone.growthLevel = 0;
      if (typeof zone.priceLevel !== "number") zone.priceLevel = 0;
      if (typeof zone.totalHarvested !== "number") zone.totalHarvested = 0;
      if (typeof zone.cardUnlocked !== "boolean") zone.cardUnlocked = false;
      if (typeof zone.cardGilded !== "boolean") zone.cardGilded = false;
    }
    if (!parsed.activeZoneId || !parsed.zones[parsed.activeZoneId]?.unlocked) {
      parsed.activeZoneId = ZONES[0].id;
    }
    if (typeof parsed.dragRadiusLevel !== "number") parsed.dragRadiusLevel = 0;
    if (typeof parsed.gems !== "number") parsed.gems = 0;
    if (!parsed.greenhouse) parsed.greenhouse = freshGreenhouse();
    if (!parsed.gemUpgrades) parsed.gemUpgrades = freshGemUpgrades();
    if (!parsed.boostInventory) parsed.boostInventory = freshBoostInventory();
    if (!Array.isArray(parsed.activeBoosts)) parsed.activeBoosts = [];
    if (!parsed.weather) parsed.weather = freshWeather(Date.now());
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

// ----- Effective stats -----

function activeBoostsActive(state: GameState, now: number): ActiveBoost[] {
  return state.activeBoosts.filter((b) => now - b.startedAt < b.durationMs);
}

export function pruneBoosts(state: GameState, now: number): void {
  state.activeBoosts = activeBoostsActive(state, now);
}

function boostActive(state: GameState, kind: BoostKind, now: number): boolean {
  return state.activeBoosts.some((b) => b.kind === kind && now - b.startedAt < b.durationMs);
}

export function gameSpeedMultiplier(state: GameState): number {
  if (state.gemUpgrades.gameSpeed >= 2) return 2;
  if (state.gemUpgrades.gameSpeed >= 1) return 1.5;
  return 1;
}

export function effectiveGrowMs(
  baseGrowMs: number,
  growthLevel: number,
  state: GameState,
  now: number,
): number {
  const zoneFactor = Math.max(GROWTH_FLOOR, 1 - growthLevel * GROWTH_PER_LEVEL);
  const greenhouseFactor = Math.max(0.2, 1 - state.greenhouse.glass * GREENHOUSE_GLASS_PER);
  let multiplier = 1;
  if (boostActive(state, "sunshine", now)) multiplier *= 0.5;
  const w = state.weather;
  const weatherActive = now - w.startedAt < w.durationMs;
  if (weatherActive && (!state.gemUpgrades.weatherInsurance || isGoodWeather(w.kind))) {
    if (w.kind === "rain") multiplier *= 0.8;
    if (w.kind === "drought") multiplier *= 1.25;
    if (w.kind === "storm") multiplier *= 100;
  }
  const speed = gameSpeedMultiplier(state);
  return (baseGrowMs * zoneFactor * greenhouseFactor * multiplier) / speed;
}

function isGoodWeather(kind: WeatherKind): boolean {
  return kind === "sunny" || kind === "rain" || kind === "festival";
}

export function effectiveYield(yieldLevel: number, state: GameState, now: number): number {
  let y = 1 + yieldLevel + state.greenhouse.sprinkler;
  if (boostActive(state, "fertilizer", now)) y *= 2;
  return y;
}

export function cardYieldMult(zone: ZoneState): number {
  let m = 1;
  if (zone.cardUnlocked) m += 0.1;
  if (zone.cardGilded) m += 0.25;
  return m;
}

export function cardThreshold(zoneIndex: number): number {
  return 100 * (zoneIndex + 1);
}

export function cardGildCost(zoneIndex: number): number {
  return 50 * (zoneIndex + 1);
}

export function gildCard(state: GameState, zoneId: string): boolean {
  const idx = ZONES.findIndex((z) => z.id === zoneId);
  if (idx < 0) return false;
  const zone = state.zones[zoneId];
  if (!zone.cardUnlocked || zone.cardGilded) return false;
  const cost = cardGildCost(idx);
  if (state.gems < cost) return false;
  state.gems -= cost;
  zone.cardGilded = true;
  return true;
}

function recordHarvest(state: GameState, zoneId: string, count: number): void {
  const idx = ZONES.findIndex((z) => z.id === zoneId);
  if (idx < 0) return;
  const zone = state.zones[zoneId];
  zone.totalHarvested += count;
  if (!zone.cardUnlocked && zone.totalHarvested >= cardThreshold(idx)) {
    zone.cardUnlocked = true;
  }
}

export function effectivePriceMult(priceLevel: number, state: GameState, now: number): number {
  let m = 1 + priceLevel * PRICE_PER_LEVEL;
  m += state.greenhouse.compost * GREENHOUSE_COMPOST_PER;
  if (boostActive(state, "market", now)) m *= 2;
  const w = state.weather;
  const weatherActive = now - w.startedAt < w.durationMs;
  if (weatherActive && w.kind === "festival") m *= 1.3;
  return m;
}

export function effectiveGemDropChance(state: GameState, zoneIndex: number, now: number): number {
  const baseRate = 0.0005 * (1 + zoneIndex * 0.4);
  let mult = 1;
  mult *= 1 + state.greenhouse.scarecrow * 0.5;
  mult *= 1 + state.gemUpgrades.luckyCharm;
  if (boostActive(state, "lucky", now)) mult *= 5;
  return Math.min(0.05, baseRate * mult);
}

// ----- Plot helpers -----

export function plotIsRipe(spot: CropSpot, growMs: number, now: number): boolean {
  return now - spot.plantedAt >= growMs;
}

export function plotProgress(spot: CropSpot, growMs: number, now: number): number {
  return Math.min(1, (now - spot.plantedAt) / growMs);
}

// ----- Harvest -----

function maybeDropGem(state: GameState, zoneId: string, now: number): void {
  const idx = ZONES.findIndex((z) => z.id === zoneId);
  if (idx < 0) return;
  const chance = effectiveGemDropChance(state, idx, now);
  if (Math.random() < chance) {
    state.gems += 1;
  }
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
  const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel, state, now);
  const yieldPer = effectiveYield(zone.yieldLevel, state, now) * cardYieldMult(zone);
  const r2 = r * r;
  let n = 0;
  for (const spot of zone.spots) {
    if (!plotIsRipe(spot, grow, now)) continue;
    const dx = spot.x - cx;
    const dy = spot.y - cy;
    if (dx * dx + dy * dy <= r2) {
      spot.plantedAt = now;
      zone.inventory += yieldPer;
      maybeDropGem(state, zoneId, now);
      n += 1;
    }
  }
  if (n > 0) recordHarvest(state, zoneId, n);
  return n;
}

export function harvestAllRipe(state: GameState, zoneId: string, now: number): number {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return 0;
  const zone = state.zones[zoneId];
  if (!zone.unlocked) return 0;
  const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel, state, now);
  const yieldPer = effectiveYield(zone.yieldLevel, state, now) * cardYieldMult(zone);
  let n = 0;
  for (const spot of zone.spots) {
    if (plotIsRipe(spot, grow, now)) {
      spot.plantedAt = now;
      zone.inventory += yieldPer;
      maybeDropGem(state, zoneId, now);
      n += 1;
    }
  }
  if (n > 0) recordHarvest(state, zoneId, n);
  return n;
}

export function sellAll(state: GameState, zoneId: string): number {
  const zoneDef = ZONES.find((z) => z.id === zoneId);
  if (!zoneDef) return 0;
  const zone = state.zones[zoneId];
  const priceMult = effectivePriceMult(zone.priceLevel, state, Date.now());
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

// ----- Cart -----

export function cartCost(level: number): number {
  return Math.floor(CART_BASE_COST * Math.pow(CART_COST_MULT, level));
}

export function cartSpeed(level: number, state: GameState): number {
  return CART_BASE_SPEED * (1 + 0.15 * Math.max(0, level - 1)) * gameSpeedMultiplier(state);
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
    const speed = cartSpeed(zone.cartLevel, state);
    zone.carts.push({
      x: 0.2 + Math.random() * 0.6,
      y: 0.2 + Math.random() * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      facing: angle,
      changeDirT: 1000,
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

export function dragRadius(state: GameState): number {
  let r = DRAG_BASE_RADIUS + state.dragRadiusLevel * DRAG_RADIUS_INCREMENT;
  if (state.gemUpgrades.magnetDrag) r *= 1.5;
  return r;
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

// ----- Greenhouse -----

export interface GreenhouseEntry {
  id: keyof GreenhouseState;
  name: string;
  description: string;
  cost: (n: number) => number;
  currency: "coins" | "gems";
  max: number;
}

export const GREENHOUSE_ENTRIES: GreenhouseEntry[] = [
  { id: "glass", name: "Greenhouse Glass", description: "+5% grow speed all zones", cost: GREENHOUSE_GLASS_COST, currency: "coins", max: GREENHOUSE_GLASS_MAX },
  { id: "sprinkler", name: "Sprinkler Network", description: "+1 baseline yield all zones", cost: GREENHOUSE_SPRINKLER_COST, currency: "coins", max: GREENHOUSE_SPRINKLER_MAX },
  { id: "compost", name: "Compost Bin", description: "+5% sell price all zones", cost: GREENHOUSE_COMPOST_COST, currency: "coins", max: GREENHOUSE_COMPOST_MAX },
  { id: "replanter", name: "Auto-Replanter", description: "Unused (reserved)", cost: GREENHOUSE_REPLANTER_COST, currency: "coins", max: GREENHOUSE_REPLANTER_MAX },
  { id: "scarecrow", name: "Scarecrow", description: "+50% gem drop rate", cost: GREENHOUSE_SCARECROW_COST, currency: "gems", max: GREENHOUSE_SCARECROW_MAX },
];

export function buyGreenhouse(state: GameState, id: keyof GreenhouseState): boolean {
  const entry = GREENHOUSE_ENTRIES.find((e) => e.id === id);
  if (!entry) return false;
  const level = state.greenhouse[id];
  if (level >= entry.max) return false;
  const cost = entry.cost(level);
  if (entry.currency === "coins") {
    if (state.coins < cost) return false;
    state.coins -= cost;
  } else {
    if (state.gems < cost) return false;
    state.gems -= cost;
  }
  state.greenhouse[id] = level + 1;
  return true;
}

// ----- Boosts -----

export function activateBoost(state: GameState, kind: BoostKind, now: number): boolean {
  if (state.boostInventory[kind] <= 0) return false;
  state.boostInventory[kind] -= 1;
  state.activeBoosts.push({ kind, startedAt: now, durationMs: BOOST_DURATION_MS[kind] });
  return true;
}

export function buyBoostWithGems(state: GameState, kind: BoostKind): boolean {
  const cost = BOOST_GEM_COST[kind];
  if (state.gems < cost) return false;
  state.gems -= cost;
  state.boostInventory[kind] += 1;
  return true;
}

// ----- Gem shop -----

export type GemShopId =
  | "magnetDrag"
  | "comboMultiplier"
  | "luckyCart"
  | "gameSpeed"
  | "autoSell"
  | "phantomHarvester"
  | "weatherInsurance"
  | "heirloomSeeds"
  | "luckyCharm"
  | "offlineCap"
  | "coins1k"
  | "coins10k"
  | "coins100k";

export interface GemShopItem {
  id: GemShopId;
  name: string;
  description: string;
  cost: number;
  isOwned: (s: GameState) => boolean;
  apply: (s: GameState) => boolean;
}

function buyOnce(set: (s: GameState) => void, get: (s: GameState) => boolean) {
  return {
    isOwned: (s: GameState) => get(s),
    apply: (s: GameState) => {
      if (get(s)) return false;
      set(s);
      return true;
    },
  };
}

export const GEM_SHOP_ITEMS: GemShopItem[] = [
  {
    id: "coins1k",
    name: "Coin Bag",
    description: "+1 000 coins",
    cost: GEM_SHOP_COSTS.coins1k,
    isOwned: () => false,
    apply: (s) => {
      s.coins += 1000;
      return true;
    },
  },
  {
    id: "coins10k",
    name: "Coin Sack",
    description: "+10 000 coins",
    cost: GEM_SHOP_COSTS.coins10k,
    isOwned: () => false,
    apply: (s) => {
      s.coins += 10000;
      return true;
    },
  },
  {
    id: "coins100k",
    name: "Coin Vault",
    description: "+100 000 coins",
    cost: GEM_SHOP_COSTS.coins100k,
    isOwned: () => false,
    apply: (s) => {
      s.coins += 100000;
      return true;
    },
  },
  {
    id: "magnetDrag",
    name: "Magnet Drag",
    description: "Drag radius x1.5",
    cost: GEM_SHOP_COSTS.magnetDrag,
    ...buyOnce(
      (s) => {
        s.gemUpgrades.magnetDrag = true;
      },
      (s) => s.gemUpgrades.magnetDrag,
    ),
  },
  {
    id: "comboMultiplier",
    name: "Combo Multiplier",
    description: "Chain harvests = +5% per step",
    cost: GEM_SHOP_COSTS.comboMultiplier,
    ...buyOnce(
      (s) => {
        s.gemUpgrades.comboMultiplier = true;
      },
      (s) => s.gemUpgrades.comboMultiplier,
    ),
  },
  {
    id: "luckyCart",
    name: "Lucky Cart",
    description: "Carts have 3% chance to find gems",
    cost: GEM_SHOP_COSTS.luckyCart,
    ...buyOnce(
      (s) => {
        s.gemUpgrades.luckyCart = true;
      },
      (s) => s.gemUpgrades.luckyCart,
    ),
  },
  {
    id: "gameSpeed",
    name: "Game Speed",
    description: "All timers run faster (1.5x then 2x)",
    cost: GEM_SHOP_COSTS.gameSpeed1,
    isOwned: (s) => s.gemUpgrades.gameSpeed >= 2,
    apply: (s) => {
      if (s.gemUpgrades.gameSpeed >= 2) return false;
      s.gemUpgrades.gameSpeed += 1;
      return true;
    },
  },
  {
    id: "autoSell",
    name: "Auto-Seller",
    description: "Auto-sells when basket exceeds 100",
    cost: GEM_SHOP_COSTS.autoSell,
    ...buyOnce(
      (s) => {
        s.gemUpgrades.autoSell = true;
      },
      (s) => s.gemUpgrades.autoSell,
    ),
  },
  {
    id: "phantomHarvester",
    name: "Phantom Harvester",
    description: "Inactive zones run at full rate (was 50%)",
    cost: GEM_SHOP_COSTS.phantomHarvester,
    ...buyOnce(
      (s) => {
        s.gemUpgrades.phantomHarvester = true;
      },
      (s) => s.gemUpgrades.phantomHarvester,
    ),
  },
  {
    id: "weatherInsurance",
    name: "Weather Insurance",
    description: "Bad weather no longer affects you",
    cost: GEM_SHOP_COSTS.weatherInsurance,
    ...buyOnce(
      (s) => {
        s.gemUpgrades.weatherInsurance = true;
      },
      (s) => s.gemUpgrades.weatherInsurance,
    ),
  },
  {
    id: "heirloomSeeds",
    name: "Heirloom Seeds",
    description: "1% chance crop is one tier higher",
    cost: GEM_SHOP_COSTS.heirloomSeeds,
    ...buyOnce(
      (s) => {
        s.gemUpgrades.heirloomSeeds = true;
      },
      (s) => s.gemUpgrades.heirloomSeeds,
    ),
  },
  {
    id: "luckyCharm",
    name: "Lucky Charm",
    description: "+100% gem drop rate (stacks 3x)",
    cost: GEM_SHOP_COSTS.luckyCharm,
    isOwned: (s) => s.gemUpgrades.luckyCharm >= 3,
    apply: (s) => {
      if (s.gemUpgrades.luckyCharm >= 3) return false;
      s.gemUpgrades.luckyCharm += 1;
      return true;
    },
  },
  {
    id: "offlineCap",
    name: "Offline Cap +24h",
    description: "+24 hours offline cap (max 3 stacks)",
    cost: GEM_SHOP_COSTS.offlineCap,
    isOwned: (s) => s.gemUpgrades.offlineCapStacks >= 3,
    apply: (s) => {
      if (s.gemUpgrades.offlineCapStacks >= 3) return false;
      s.gemUpgrades.offlineCapStacks += 1;
      return true;
    },
  },
];

export function buyGemShopItem(state: GameState, id: GemShopId): boolean {
  const item = GEM_SHOP_ITEMS.find((it) => it.id === id);
  if (!item) return false;
  if (item.isOwned(state)) return false;
  const cost = item.id === "gameSpeed"
    ? state.gemUpgrades.gameSpeed === 0
      ? GEM_SHOP_COSTS.gameSpeed1
      : GEM_SHOP_COSTS.gameSpeed2
    : item.cost;
  if (state.gems < cost) return false;
  state.gems -= cost;
  return item.apply(state);
}

export function gemShopItemCost(state: GameState, id: GemShopId): number {
  if (id === "gameSpeed") {
    return state.gemUpgrades.gameSpeed === 0
      ? GEM_SHOP_COSTS.gameSpeed1
      : GEM_SHOP_COSTS.gameSpeed2;
  }
  const item = GEM_SHOP_ITEMS.find((it) => it.id === id);
  return item ? item.cost : 0;
}

export const UPGRADE_CAPS = {
  cart: 100,
  yield: YIELD_MAX,
  growth: GROWTH_MAX,
  price: PRICE_MAX,
  drag: DRAG_MAX,
};

// ----- Weather -----

const WEATHER_PROBS: Array<[WeatherKind, number]> = [
  ["sunny", 0.5],
  ["rain", 0.25],
  ["drought", 0.1],
  ["festival", 0.1],
  ["storm", 0.05],
];

function pickWeather(): WeatherKind {
  const r = Math.random();
  let cum = 0;
  for (const [k, p] of WEATHER_PROBS) {
    cum += p;
    if (r < cum) return k;
  }
  return "sunny";
}

export function tickWeather(state: GameState, now: number): boolean {
  const w = state.weather;
  if (now - w.startedAt < w.durationMs) return false;
  state.weather = {
    kind: pickWeather(),
    startedAt: now,
    durationMs:
      WEATHER_DURATION_MIN_MS + Math.random() * (WEATHER_DURATION_MAX_MS - WEATHER_DURATION_MIN_MS),
  };
  return true;
}

// ----- Cart tick -----

export function tickCarts(
  state: GameState,
  now: number,
  deltaMs: number,
  fieldAspect: number = 0.6,
): void {
  if (deltaMs <= 0) return;
  const speed = gameSpeedMultiplier(state);
  pruneBoosts(state, now);
  tickWeather(state, now);

  const dt = (deltaMs / 1000) * speed;
  const inactiveBase = state.gemUpgrades.phantomHarvester ? 1 : 0.5;
  const aspectClamp = Math.max(0.1, fieldAspect);

  for (const zoneDef of ZONES) {
    const zone = state.zones[zoneDef.id];
    if (!zone.unlocked) continue;
    const isActive = zoneDef.id === state.activeZoneId;

    const r = cartRadius(zone.cartLevel);
    const r2 = r * r;
    const cartSpd = cartSpeed(zone.cartLevel, state);
    const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel, state, now);
    const yieldPer = effectiveYield(zone.yieldLevel, state, now) * cardYieldMult(zone);
    const inactiveScale = isActive ? 1 : inactiveBase;
    let cartHarvestCount = 0;

    for (const cart of zone.carts) {
      cart.x += cart.vx * dt * inactiveScale;
      cart.y += cart.vy * dt * inactiveScale;
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
        let pixelAngle: number;
        if (nearest) {
          // Project deltas into pixel-equivalent space so the target angle
          // matches what the player sees on screen.
          const dxPx = nearest.x - cart.x;
          const dyPx = (nearest.y - cart.y) / aspectClamp;
          pixelAngle = Math.atan2(dyPx, dxPx);
        } else {
          const currentPixelAngle = Math.atan2(cart.vy / aspectClamp, cart.vx);
          pixelAngle = currentPixelAngle + (Math.random() - 0.5) * 0.6;
        }
        // Scale vy by aspect so sqrt((vx*W)^2 + (vy*H)^2) stays constant.
        cart.vx = Math.cos(pixelAngle) * cartSpd;
        cart.vy = Math.sin(pixelAngle) * cartSpd * aspectClamp;
      }
      cart.facing = Math.atan2(cart.vy / aspectClamp, cart.vx);

      for (const spot of zone.spots) {
        if (!plotIsRipe(spot, grow, now)) continue;
        const dx = spot.x - cart.x;
        const dy = spot.y - cart.y;
        if (dx * dx + dy * dy <= r2) {
          spot.plantedAt = now;
          zone.inventory += yieldPer * inactiveScale;
          maybeDropGem(state, zoneDef.id, now);
          if (state.gemUpgrades.luckyCart && Math.random() < 0.03) {
            state.gems += 1;
          }
          cartHarvestCount += 1;
        }
      }
    }
    if (cartHarvestCount > 0) recordHarvest(state, zoneDef.id, cartHarvestCount);
  }

  if (state.gemUpgrades.autoSell) {
    const activeDef = ZONES.find((z) => z.id === state.activeZoneId);
    if (activeDef) {
      const zone = state.zones[activeDef.id];
      if (zone.inventory >= 100) sellAll(state, activeDef.id);
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

function offlineCapMs(state: GameState): number {
  return (OFFLINE_CAP_BASE_HOURS + state.gemUpgrades.offlineCapStacks * 24) * 60 * 60 * 1000;
}

function applyOfflineProgress(state: GameState): void {
  const now = Date.now();
  const elapsed = Math.max(0, now - state.lastSaved);
  if (elapsed <= 0) return;
  const cappedMs = Math.min(elapsed, offlineCapMs(state));

  for (const zoneDef of ZONES) {
    const zone = state.zones[zoneDef.id];
    if (!zone.unlocked) continue;
    const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel, state, now);
    const yieldPer = effectiveYield(zone.yieldLevel, state, now) * cardYieldMult(zone);
    let offGrown = 0;
    for (const spot of zone.spots) {
      const since = now - spot.plantedAt;
      if (since >= grow) {
        spot.plantedAt = now;
        zone.inventory += yieldPer;
        offGrown += 1;
      }
    }
    if (offGrown > 0) recordHarvest(state, zoneDef.id, offGrown);
    if (zone.cartLevel > 0) {
      const r = cartRadius(zone.cartLevel);
      const speed = cartSpeed(zone.cartLevel, state);
      const sweptAreaPerSec = 2 * r * speed;
      const cropDensity = zone.spots.length;
      const harvestsPerSec = sweptAreaPerSec * cropDensity * 0.04;
      const isActive = zoneDef.id === state.activeZoneId;
      const inactiveBase = state.gemUpgrades.phantomHarvester ? 1 : 0.5;
      const inactiveScale = isActive ? 1 : inactiveBase;
      const offlineHarvests = Math.floor(
        (cappedMs / 1000) * harvestsPerSec * cartCountFor(zone.cartLevel) * 0.5 * inactiveScale,
      );
      zone.inventory += offlineHarvests * yieldPer;
    }
  }
}
