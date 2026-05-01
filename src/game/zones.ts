export interface ZoneDef {
  id: string;
  name: string;
  emoji: string;
  growMs: number;
  sellPrice: number;
  unlockCost: number;
  color: number;
}

export const ZONES: ZoneDef[] = [
  {
    id: "wheat",
    name: "Meadow (Wheat)",
    emoji: "🌾",
    growMs: 5_000,
    sellPrice: 1,
    unlockCost: 0,
    color: 0xc9a648,
  },
  {
    id: "carrots",
    name: "Vegetable Patch (Carrots)",
    emoji: "🥕",
    growMs: 15_000,
    sellPrice: 5,
    unlockCost: 50,
    color: 0xe07a3c,
  },
];

export const PLOTS_PER_ZONE = 4;
