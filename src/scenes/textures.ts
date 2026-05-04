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

  generateCropSprite(scene, "crop-empty", () => {});
  generateCropSprite(scene, "crop-wheat-s1", drawSingleWheatStage1);
  generateCropSprite(scene, "crop-wheat-s2", drawSingleWheatStage2);
  generateCropSprite(scene, "crop-wheat-s3", drawSingleWheatStage3);
  generateCropSprite(scene, "crop-carrot-s1", drawSingleCarrotStage1);
  generateCropSprite(scene, "crop-carrot-s2", drawSingleCarrotStage2);
  generateCropSprite(scene, "crop-carrot-s3", drawSingleCarrotStage3);

  generateCart(scene, "cart");

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
  generateSoilBg(scene, "soil-bg");
  generateFieldFrame(scene, "field-frame");
  generateDragRing(scene, "drag-ring");
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

export function pickCropSpriteKey(zoneId: string, progress: number, ripe: boolean): string {
  const prefix = zoneId === "carrots" ? "carrot" : "wheat";
  if (ripe) return `crop-${prefix}-s3`;
  if (progress < 0.2) return "crop-empty";
  if (progress < 0.55) return `crop-${prefix}-s1`;
  if (progress < 0.85) return `crop-${prefix}-s2`;
  return `crop-${prefix}-s3`;
}

const CROP_SPRITE_W = 16;
const CROP_SPRITE_H = 16;

function generateCropSprite(
  scene: Phaser.Scene,
  key: string,
  drawCrop: (g: Phaser.GameObjects.Graphics) => void,
): void {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, CROP_SPRITE_W, CROP_SPRITE_H);
  drawCrop(g);
  g.generateTexture(key, CROP_SPRITE_W, CROP_SPRITE_H);
  g.destroy();
}

function drawSingleWheatStage1(g: Phaser.GameObjects.Graphics): void {
  const xs = [4, 8, 12];
  for (const x of xs) {
    g.fillStyle(0x4a8a30, 1);
    g.fillRect(x, 13, 1, 2);
    g.fillStyle(0x6abc4a, 1);
    g.fillRect(x, 12, 1, 1);
  }
}

function drawSingleWheatStage2(g: Phaser.GameObjects.Graphics): void {
  const xs = [4, 8, 12];
  const heights = [4, 5, 4];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const h = heights[i];
    const top = 15 - h;
    g.fillStyle(PALETTES.wheatLeaf, 1);
    g.fillRect(x, top, 1, h);
    g.fillStyle(PALETTES.sproutLight, 1);
    g.fillRect(x, top - 1, 1, 1);
    g.fillRect(x - 1, top + 1, 1, 1);
    g.fillRect(x + 1, top, 1, 1);
  }
}

function drawSingleWheatStage3(g: Phaser.GameObjects.Graphics): void {
  drawWheatStalk(g, 4, 8, false);
  drawWheatStalk(g, 8, 6, true);
  drawWheatStalk(g, 12, 8, false);
}

function drawWheatStalk(g: Phaser.GameObjects.Graphics, x: number, headTop: number, tall: boolean): void {
  const baseY = 15;
  const headBottom = headTop + 4;
  g.fillStyle(PALETTES.wheatStem, 1);
  g.fillRect(x, headBottom, 1, baseY - headBottom);
  g.fillStyle(PALETTES.wheatLeaf, 1);
  g.fillRect(x - 1, headBottom + 2, 1, 1);
  g.fillStyle(PALETTES.wheatHead, 1);
  g.fillRect(x - 1, headTop, 3, 4);
  g.fillStyle(PALETTES.wheatHeadHi, 1);
  g.fillRect(x, headTop, 1, 1);
  g.fillRect(x - 1, headTop + 1, 1, 1);
  g.fillStyle(PALETTES.wheatHeadLo, 1);
  g.fillRect(x + 1, headTop + 3, 1, 1);
  if (tall) {
    g.fillStyle(PALETTES.wheatHeadHi, 1);
    g.fillRect(x, headTop - 1, 1, 1);
  }
}

function drawSingleCarrotStage1(g: Phaser.GameObjects.Graphics): void {
  const xs = [4, 8, 12];
  for (const x of xs) {
    g.fillStyle(PALETTES.carrotLeaf, 1);
    g.fillRect(x, 13, 1, 2);
    g.fillStyle(PALETTES.carrotLeafHi, 1);
    g.fillRect(x, 12, 1, 1);
  }
}

function drawSingleCarrotStage2(g: Phaser.GameObjects.Graphics): void {
  const xs = [4, 8, 12];
  for (const x of xs) {
    g.fillStyle(PALETTES.carrotLeafLo, 1);
    g.fillRect(x, 11, 1, 4);
    g.fillStyle(PALETTES.carrotLeaf, 1);
    g.fillRect(x - 1, 11, 1, 1);
    g.fillRect(x + 1, 11, 1, 1);
    g.fillStyle(PALETTES.carrotLeafHi, 1);
    g.fillRect(x, 10, 1, 1);
  }
}

function drawSingleCarrotStage3(g: Phaser.GameObjects.Graphics): void {
  drawCarrotPlant(g, 4);
  drawCarrotPlant(g, 8);
  drawCarrotPlant(g, 12);
}

function drawCarrotPlant(g: Phaser.GameObjects.Graphics, x: number): void {
  g.fillStyle(PALETTES.carrotLeafLo, 1);
  g.fillRect(x, 6, 1, 3);
  g.fillStyle(PALETTES.carrotLeaf, 1);
  g.fillRect(x - 1, 6, 1, 1);
  g.fillRect(x + 1, 6, 1, 1);
  g.fillStyle(PALETTES.carrotLeafHi, 1);
  g.fillRect(x, 5, 1, 1);
  g.fillStyle(PALETTES.carrotBody, 1);
  g.fillRect(x - 1, 9, 3, 4);
  g.fillRect(x, 13, 1, 1);
  g.fillStyle(PALETTES.carrotBodyHi, 1);
  g.fillRect(x - 1, 9, 1, 2);
  g.fillStyle(PALETTES.carrotBodyLo, 1);
  g.fillRect(x + 1, 11, 1, 2);
}

function generateCart(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  const W = 24;
  const H = 16;
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, W, H);
  const wood = 0x8a5a30;
  const woodDark = 0x5a3a18;
  const woodHi = 0xb88858;
  const metal = 0x686868;
  const wheel = 0x303030;
  const wheelHi = 0x808080;
  g.fillStyle(woodDark, 1);
  g.fillRect(3, 3, 18, 8);
  g.fillStyle(wood, 1);
  g.fillRect(4, 4, 16, 6);
  g.fillStyle(woodHi, 1);
  g.fillRect(4, 4, 16, 1);
  g.fillRect(4, 4, 1, 5);
  g.fillStyle(woodDark, 1);
  g.fillRect(7, 6, 1, 3);
  g.fillRect(11, 6, 1, 3);
  g.fillRect(15, 6, 1, 3);
  g.fillStyle(metal, 1);
  g.fillRect(2, 11, 20, 1);
  g.fillStyle(wheel, 1);
  g.fillRect(4, 11, 4, 4);
  g.fillRect(16, 11, 4, 4);
  g.fillStyle(wheelHi, 1);
  g.fillRect(5, 12, 2, 1);
  g.fillRect(17, 12, 2, 1);
  g.fillRect(5, 13, 1, 1);
  g.fillRect(17, 13, 1, 1);
  g.fillStyle(0x202020, 1);
  g.fillRect(4, 14, 4, 1);
  g.fillRect(16, 14, 4, 1);
  g.fillStyle(woodDark, 1);
  g.fillRect(0, 6, 3, 1);
  g.fillRect(21, 6, 3, 1);
  g.fillStyle(wood, 1);
  g.fillRect(0, 7, 3, 1);
  g.fillRect(21, 7, 3, 1);
  g.generateTexture(key, W, H);
  g.destroy();
}

function generateSoilBg(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  const W = 64;
  const H = 64;
  for (let y = 0; y < H; y++) {
    g.fillStyle(y % 2 === 0 ? 0x8b6233 : 0x7a5128, 1);
    g.fillRect(0, y, W, 1);
  }
  const furrows = [10, 22, 34, 46, 58];
  for (const y of furrows) {
    g.fillStyle(0xb88858, 1);
    g.fillRect(0, y - 1, W, 1);
    g.fillStyle(0x5a3a1a, 1);
    g.fillRect(0, y, W, 1);
    g.fillStyle(0x352010, 1);
    g.fillRect(0, y + 1, W, 1);
  }
  const dotsDark: Array<[number, number]> = [
    [4, 4], [13, 6], [22, 3], [31, 7], [42, 5], [51, 4], [58, 6],
    [5, 16], [16, 17], [27, 15], [38, 16], [48, 14], [56, 17],
    [3, 27], [14, 28], [25, 26], [36, 28], [47, 27], [55, 26],
    [4, 39], [15, 40], [26, 38], [38, 41], [49, 39], [60, 40],
    [3, 51], [14, 52], [27, 51], [40, 50], [51, 52], [60, 51],
    [4, 62], [16, 62], [29, 61], [42, 62], [54, 62],
  ];
  g.fillStyle(0x432a10, 1);
  for (const [x, y] of dotsDark) g.fillRect(x, y, 1, 1);
  const dotsLight: Array<[number, number]> = [
    [9, 5], [19, 4], [28, 5], [37, 4], [46, 6], [54, 5],
    [9, 16], [21, 14], [31, 16], [44, 15], [53, 16],
    [9, 27], [21, 28], [33, 26], [44, 28], [53, 27],
    [10, 39], [22, 38], [33, 40], [45, 39], [54, 40],
    [9, 50], [21, 52], [33, 51], [45, 50], [56, 52],
    [10, 62], [23, 61], [37, 62], [49, 61],
  ];
  g.fillStyle(0xc89968, 1);
  for (const [x, y] of dotsLight) g.fillRect(x, y, 1, 1);
  g.generateTexture(key, W, H);
  g.destroy();
}

function generateDragRing(scene: Phaser.Scene, key: string): void {
  const g = scene.add.graphics();
  const W = 64;
  const H = 64;
  const cx = W / 2;
  const cy = H / 2;
  const radius = 30;
  const inner = 26;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= radius && d >= inner) {
        const isOuterEdge = d > radius - 1.2 || d < inner + 1.2;
        g.fillStyle(isOuterEdge ? 0xfff080 : 0xffd040, 1);
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  g.generateTexture(key, W, H);
  g.destroy();
}
