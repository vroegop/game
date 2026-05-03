import Phaser from "phaser";

export const TILE_W = 32;
export const TILE_H = 32;

const SOIL_BASE = 0x8b6233;
const SOIL_BASE_2 = 0x7a5128;
const SOIL_DARK = 0x5a3a1a;
const SOIL_LIGHT = 0xb88858;
const SOIL_DOT_DARK = 0x432a10;
const SOIL_DOT_LIGHT = 0xc89968;

const PALETTES = {
  wheatStem: 0x8a7220,
  wheatLeaf: 0x6a8a30,
  wheatHead: 0xe8b020,
  wheatHeadHi: 0xfae050,
  wheatHeadLo: 0xa07a10,
  carrotLeaf: 0x4aaa3a,
  carrotLeafHi: 0x6aca5a,
  carrotLeafLo: 0x2a7a2a,
  carrotBody: 0xe07a3c,
  carrotBodyHi: 0xf5a060,
  carrotBodyLo: 0xa05420,
  sproutDark: 0x4a8a30,
  sproutLight: 0x6abc4a,
};

interface PlotSlots {
  positions: Array<[number, number]>;
}

const PLOT_SLOTS: PlotSlots = {
  positions: [
    [6, 10], [16, 9], [26, 11],
    [8, 20], [17, 19], [26, 21],
    [6, 30], [17, 29], [26, 31],
  ],
};

export function generatePixelTextures(scene: Phaser.Scene): void {
  generatePlotTile(scene, "plot-tilled", () => {});

  generatePlotTile(scene, "wheat-s1", drawWheatSprouts);
  generatePlotTile(scene, "wheat-s2", drawWheatGrowing);
  generatePlotTile(scene, "wheat-s3", drawWheatRipe);

  generatePlotTile(scene, "carrot-s1", drawCarrotSprouts);
  generatePlotTile(scene, "carrot-s2", drawCarrotGrowing);
  generatePlotTile(scene, "carrot-s3", drawCarrotRipe);

  generateLockedTile(scene, "plot-locked");

  generateCoin(scene, "coin");

  generatePixelButton(scene, "btn-bg", 0x3d6a3d, 0x5d8a5d, 0x1d3a1d);
  generatePixelButton(scene, "btn-bg-accent", 0x4a8a5a, 0x6aaa7a, 0x2a5a3a);
  generatePixelButton(scene, "btn-bg-warn", 0xc08020, 0xe0a040, 0x804a10);
  generatePixelButton(scene, "btn-bg-disabled", 0x2a3a2a, 0x3a4a3a, 0x1a2a1a);
  generatePixelButton(scene, "tab-bg", 0x2a4a2a, 0x4a6a4a, 0x142414);
  generatePixelButton(scene, "tab-bg-active", 0x5aaa6a, 0x80d088, 0x2a6a3a);
  generatePixelButton(scene, "tab-bg-locked", 0x282828, 0x3a3a3a, 0x141414);

  generatePixelPanel(scene, "panel-bg", 0x223422, 0x3a5a3a, 0x101a10);
  generateRipeBorder(scene, "ripe-border");
  generateGrass(scene, "grass-bg");
  generateFieldFrame(scene, "field-frame");
}

function generatePlotTile(scene: Phaser.Scene, key: string, drawCrops: (g: Phaser.GameObjects.Graphics) => void): void {
  const g = scene.add.graphics();
  drawSoil(g);
  drawCrops(g);
  drawTileBorder(g);
  g.generateTexture(key, TILE_W, TILE_H);
  g.destroy();
}

function drawSoil(g: Phaser.GameObjects.Graphics): void {
  for (let y = 0; y < TILE_H; y++) {
    g.fillStyle(y % 2 === 0 ? SOIL_BASE : SOIL_BASE_2, 1);
    g.fillRect(0, y, TILE_W, 1);
  }

  const furrows = [9, 19, 29];
  for (const y of furrows) {
    g.fillStyle(SOIL_LIGHT, 1);
    g.fillRect(1, y - 1, TILE_W - 2, 1);
    g.fillStyle(SOIL_DARK, 1);
    g.fillRect(0, y, TILE_W, 1);
    g.fillStyle(0x352010, 1);
    g.fillRect(0, y + 1, TILE_W, 1);
  }

  const dotsDark = [
    [3, 4], [12, 5], [21, 3], [27, 6],
    [4, 14], [11, 15], [19, 14], [25, 15],
    [3, 24], [13, 25], [22, 24], [28, 26],
  ];
  g.fillStyle(SOIL_DOT_DARK, 1);
  for (const [x, y] of dotsDark) g.fillRect(x, y, 1, 1);

  const dotsLight = [
    [8, 5], [17, 4], [25, 5],
    [7, 14], [15, 15], [23, 14],
    [9, 25], [17, 26], [27, 24],
  ];
  g.fillStyle(SOIL_DOT_LIGHT, 1);
  for (const [x, y] of dotsLight) g.fillRect(x, y, 1, 1);
}

function drawTileBorder(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x2a1808, 1);
  g.fillRect(0, 0, TILE_W, 1);
  g.fillRect(0, TILE_H - 1, TILE_W, 1);
  g.fillRect(0, 0, 1, TILE_H);
  g.fillRect(TILE_W - 1, 0, 1, TILE_H);
}

function eachSlot(callback: (x: number, y: number, idx: number) => void): void {
  for (let i = 0; i < PLOT_SLOTS.positions.length; i++) {
    const [x, y] = PLOT_SLOTS.positions[i];
    callback(x, y, i);
  }
}

function drawWheatSprouts(g: Phaser.GameObjects.Graphics): void {
  eachSlot((x, baseY) => {
    g.fillStyle(PALETTES.sproutDark, 1);
    g.fillRect(x, baseY - 1, 1, 1);
    g.fillStyle(PALETTES.sproutLight, 1);
    g.fillRect(x, baseY - 2, 1, 1);
  });
}

function drawWheatGrowing(g: Phaser.GameObjects.Graphics): void {
  eachSlot((x, baseY, i) => {
    const sway = i % 2 === 0 ? 0 : 1;
    const sx = x + sway;
    g.fillStyle(PALETTES.wheatLeaf, 1);
    g.fillRect(sx, baseY - 4, 1, 4);
    g.fillStyle(PALETTES.sproutLight, 1);
    g.fillRect(sx - 1, baseY - 3, 1, 1);
    g.fillRect(sx + 1, baseY - 4, 1, 1);
    g.fillStyle(PALETTES.wheatLeaf, 1);
    g.fillRect(sx, baseY - 5, 1, 1);
  });
}

function drawWheatRipe(g: Phaser.GameObjects.Graphics): void {
  eachSlot((x, baseY, i) => {
    const sway = i % 2 === 0 ? 0 : 1;
    const sx = x + sway;
    g.fillStyle(PALETTES.wheatStem, 1);
    g.fillRect(sx, baseY - 7, 1, 7);
    g.fillStyle(PALETTES.wheatLeaf, 1);
    g.fillRect(sx - 1, baseY - 4, 1, 1);
    g.fillRect(sx + 1, baseY - 5, 1, 1);
    g.fillStyle(PALETTES.wheatHead, 1);
    g.fillRect(sx - 1, baseY - 9, 3, 3);
    g.fillStyle(PALETTES.wheatHeadHi, 1);
    g.fillRect(sx, baseY - 9, 1, 1);
    g.fillRect(sx - 1, baseY - 8, 1, 1);
    g.fillStyle(PALETTES.wheatHeadLo, 1);
    g.fillRect(sx + 1, baseY - 7, 1, 1);
    g.fillRect(sx, baseY - 6, 1, 1);
  });
}

function drawCarrotSprouts(g: Phaser.GameObjects.Graphics): void {
  eachSlot((x, baseY) => {
    g.fillStyle(PALETTES.carrotLeaf, 1);
    g.fillRect(x, baseY - 1, 1, 1);
    g.fillStyle(PALETTES.carrotLeafHi, 1);
    g.fillRect(x, baseY - 2, 1, 1);
  });
}

function drawCarrotGrowing(g: Phaser.GameObjects.Graphics): void {
  eachSlot((x, baseY, i) => {
    const sway = i % 3 === 0 ? -1 : 0;
    const sx = x + sway;
    g.fillStyle(PALETTES.carrotLeafLo, 1);
    g.fillRect(sx, baseY - 3, 1, 3);
    g.fillStyle(PALETTES.carrotLeaf, 1);
    g.fillRect(sx - 1, baseY - 3, 1, 1);
    g.fillRect(sx + 1, baseY - 3, 1, 1);
    g.fillRect(sx, baseY - 4, 1, 1);
    g.fillStyle(PALETTES.carrotLeafHi, 1);
    g.fillRect(sx, baseY - 5, 1, 1);
  });
}

function drawCarrotRipe(g: Phaser.GameObjects.Graphics): void {
  eachSlot((x, baseY, i) => {
    const sway = i % 3 === 0 ? -1 : 0;
    const sx = x + sway;
    g.fillStyle(PALETTES.carrotLeafLo, 1);
    g.fillRect(sx, baseY - 6, 1, 3);
    g.fillStyle(PALETTES.carrotLeaf, 1);
    g.fillRect(sx - 1, baseY - 6, 1, 1);
    g.fillRect(sx + 1, baseY - 6, 1, 1);
    g.fillStyle(PALETTES.carrotLeafHi, 1);
    g.fillRect(sx, baseY - 7, 1, 1);
    g.fillStyle(PALETTES.carrotBody, 1);
    g.fillRect(sx - 1, baseY - 3, 3, 2);
    g.fillRect(sx, baseY - 1, 1, 1);
    g.fillStyle(PALETTES.carrotBodyHi, 1);
    g.fillRect(sx - 1, baseY - 3, 1, 1);
    g.fillStyle(PALETTES.carrotBodyLo, 1);
    g.fillRect(sx + 1, baseY - 2, 1, 1);
  });
}

function generateLockedTile(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  for (let y = 0; y < TILE_H; y++) {
    g.fillStyle(y % 2 === 0 ? 0x1a1a1a : 0x222222, 1);
    g.fillRect(0, y, TILE_W, 1);
  }
  g.fillStyle(0x303030, 1);
  for (let y = 0; y < TILE_H; y += 4) {
    for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < TILE_W; x += 4) {
      g.fillRect(x, y, 2, 2);
    }
  }
  drawTileBorder(g);
  g.generateTexture(key, TILE_W, TILE_H);
  g.destroy();
}

function generateCoin(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  const W = 16;
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, W, W);
  const dark = 0x9a6a08;
  const mid = 0xe0a820;
  const hi = 0xffd24a;
  const shine = 0xfff1a8;
  g.fillStyle(dark, 1);
  g.fillRect(4, 1, 8, 1);
  g.fillRect(2, 2, 12, 1);
  g.fillRect(1, 3, 14, 2);
  g.fillRect(0, 5, 16, 6);
  g.fillRect(1, 11, 14, 2);
  g.fillRect(2, 13, 12, 1);
  g.fillRect(4, 14, 8, 1);
  g.fillStyle(mid, 1);
  g.fillRect(5, 2, 6, 1);
  g.fillRect(3, 3, 10, 1);
  g.fillRect(2, 4, 12, 1);
  g.fillRect(1, 5, 14, 1);
  g.fillRect(1, 6, 14, 4);
  g.fillRect(1, 10, 14, 1);
  g.fillRect(2, 11, 12, 1);
  g.fillRect(3, 12, 10, 1);
  g.fillRect(5, 13, 6, 1);
  g.fillStyle(hi, 1);
  g.fillRect(5, 3, 6, 1);
  g.fillRect(3, 4, 8, 1);
  g.fillRect(2, 5, 10, 4);
  g.fillRect(3, 9, 6, 1);
  g.fillStyle(shine, 1);
  g.fillRect(5, 4, 4, 1);
  g.fillRect(3, 5, 3, 2);
  g.fillStyle(dark, 1);
  g.fillRect(7, 5, 2, 1);
  g.fillRect(6, 6, 1, 1);
  g.fillRect(7, 7, 2, 1);
  g.fillRect(8, 8, 1, 1);
  g.fillRect(7, 9, 2, 1);
  g.fillRect(7, 10, 2, 1);
  g.generateTexture(key, W, W);
  g.destroy();
}

function generatePixelButton(scene: Phaser.Scene, key: string, mid: number, light: number, dark: number): void {
  const g = scene.add.graphics();
  const W = 16;
  const H = 16;
  g.fillStyle(0x0a0a0a, 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(dark, 1);
  g.fillRect(1, 1, W - 2, H - 2);
  g.fillStyle(mid, 1);
  g.fillRect(2, 2, W - 4, H - 4);
  g.fillStyle(light, 1);
  g.fillRect(2, 2, W - 4, 1);
  g.fillRect(2, 2, 1, H - 4);
  g.fillStyle(dark, 1);
  g.fillRect(2, H - 3, W - 4, 1);
  g.fillRect(W - 3, 2, 1, H - 4);
  g.generateTexture(key, W, H);
  g.destroy();
}

function generatePixelPanel(scene: Phaser.Scene, key: string, mid: number, light: number, dark: number): void {
  const g = scene.add.graphics();
  const W = 16;
  const H = 16;
  g.fillStyle(mid, 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(light, 1);
  g.fillRect(0, 0, W, 1);
  g.fillStyle(dark, 1);
  g.fillRect(0, H - 1, W, 1);
  g.generateTexture(key, W, H);
  g.destroy();
}

function generateGrass(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  const W = 16;
  const H = 16;
  for (let y = 0; y < H; y++) {
    g.fillStyle(y % 2 === 0 ? 0x1d2b1d : 0x202f20, 1);
    g.fillRect(0, y, W, 1);
  }
  const blades: Array<[number, number, number]> = [
    [2, 3, 0x2a4a2a],
    [9, 5, 0x2a4a2a],
    [13, 2, 0x305a30],
    [4, 9, 0x305a30],
    [11, 11, 0x2a4a2a],
    [1, 13, 0x2a4a2a],
    [14, 14, 0x305a30],
    [7, 14, 0x2a4a2a],
  ];
  for (const [x, y, c] of blades) {
    g.fillStyle(c, 1);
    g.fillRect(x, y, 1, 2);
  }
  const dots: Array<[number, number]> = [
    [5, 1], [12, 7], [3, 6], [10, 13], [6, 11],
  ];
  g.fillStyle(0x142014, 1);
  for (const [x, y] of dots) g.fillRect(x, y, 1, 1);
  g.generateTexture(key, W, H);
  g.destroy();
}

function generateFieldFrame(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  const W = 16;
  const H = 16;
  const dark = 0x3a2412;
  const mid = 0x6a4422;
  const light = 0x8a6a3a;
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, W, H);
  g.fillStyle(dark, 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(mid, 1);
  g.fillRect(1, 1, W - 2, H - 2);
  g.fillStyle(light, 1);
  g.fillRect(1, 1, W - 2, 1);
  g.fillRect(1, 1, 1, H - 2);
  g.fillStyle(dark, 1);
  g.fillRect(1, H - 2, W - 2, 1);
  g.fillRect(W - 2, 1, 1, H - 2);
  g.generateTexture(key, W, H);
  g.destroy();
}

function generateRipeBorder(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  const W = 16;
  const H = 16;
  g.fillStyle(0xfff080, 1);
  g.fillRect(0, 0, W, 1);
  g.fillRect(0, H - 1, W, 1);
  g.fillRect(0, 0, 1, H);
  g.fillRect(W - 1, 0, 1, H);
  g.fillStyle(0xffd040, 1);
  for (const [cx, cy] of [
    [0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1],
  ]) {
    g.fillRect(cx, cy, 1, 1);
  }
  g.generateTexture(key, W, H);
  g.destroy();
}

export function pickStageTexture(zoneId: string, progress: number, ripe: boolean): string {
  const prefix = zoneId === "carrots" ? "carrot" : "wheat";
  if (ripe) return `${prefix}-s3`;
  if (progress < 0.25) return "plot-tilled";
  if (progress < 0.55) return `${prefix}-s1`;
  if (progress < 0.85) return `${prefix}-s2`;
  return `${prefix}-s3`;
}
