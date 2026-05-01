export interface ZoneDef {
  id: string;
  name: string;
  emoji: string;
  growMs: number;
  sellPrice: number;
  unlockCost: number;
  color: number;
  spriteYoung: string;
  spriteRipe: string;
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
    spriteYoung: "wheat-young",
    spriteRipe: "wheat-ripe",
  },
  {
    id: "carrots",
    name: "Vegetable Patch (Carrots)",
    emoji: "🥕",
    growMs: 15_000,
    sellPrice: 5,
    unlockCost: 50,
    color: 0xe07a3c,
    spriteYoung: "carrot-young",
    spriteRipe: "carrot-ripe",
  },
];

export const PLOTS_PER_ZONE = 4;
