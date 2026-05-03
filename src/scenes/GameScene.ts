import Phaser from "phaser";
import { ZONES, PLOTS_PER_ZONE, ZoneDef } from "../game/zones";
import {
  GameState,
  buyCart,
  cartCost,
  cartIntervalMs,
  harvestAllRipe,
  harvestPlot,
  loadState,
  plotIsRipe,
  plotProgress,
  saveState,
  sellAll,
  setActiveZone,
  tickCarts,
  unlockZone,
} from "../game/state";
import { generatePixelTextures, pickStageTexture } from "./textures";

interface IconButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
  baseTexture: string;
  enabled: boolean;
  onClick: () => void;
}

interface ZoneTab {
  def: ZoneDef;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Text;
  lock: Phaser.GameObjects.Text;
}

interface PlotView {
  index: number;
  tile: Phaser.GameObjects.Image;
  border: Phaser.GameObjects.Image;
  bumpFactor: number;
  baseScale: number;
}

const SAVE_INTERVAL_MS = 3_000;
const PIXEL_FONT = '"Courier New", monospace';

const COLOR_RIPE_TEXT = "#ffe066";
const COLOR_GAIN = "#9ee6b8";

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private lastSaveAt = 0;

  private grassBg!: Phaser.GameObjects.TileSprite;
  private headerBg!: Phaser.GameObjects.Image;
  private coinIcon!: Phaser.GameObjects.Image;
  private coinText!: Phaser.GameObjects.Text;
  private rateText!: Phaser.GameObjects.Text;

  private tabsContainer!: Phaser.GameObjects.Container;
  private tabs: ZoneTab[] = [];

  private zoneContainer!: Phaser.GameObjects.Container;
  private zoneTitle!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private plots: PlotView[] = [];

  private btnHarvest!: IconButton;
  private btnSell!: IconButton;
  private btnCart!: IconButton;
  private btnUnlock!: IconButton;

  constructor() {
    super("game");
  }

  create() {
    generatePixelTextures(this);

    this.state = loadState();
    this.lastSaveAt = this.time.now;

    this.cameras.main.setBackgroundColor("#1d2b1d");

    this.grassBg = this.add.tileSprite(0, 0, 100, 100, "grass-bg").setOrigin(0, 0);
    this.grassBg.setTileScale(2, 2);

    this.headerBg = this.add.image(0, 0, "panel-bg").setOrigin(0, 0);

    this.coinIcon = this.add.image(0, 0, "coin").setOrigin(0, 0.5);
    this.coinIcon.setScale(2);

    this.coinText = this.add
      .text(0, 0, "0", {
        fontFamily: PIXEL_FONT,
        fontSize: "22px",
        color: "#ffe89a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.rateText = this.add
      .text(0, 0, "+0/s", {
        fontFamily: PIXEL_FONT,
        fontSize: "11px",
        color: "#a8c8a8",
      })
      .setOrigin(0.5, 0);

    this.tabsContainer = this.add.container(0, 0);
    for (const def of ZONES) this.tabs.push(this.buildTab(def));

    this.zoneContainer = this.add.container(0, 0);

    this.zoneTitle = this.add
      .text(0, 0, "", {
        fontFamily: PIXEL_FONT,
        fontSize: "18px",
        color: "#e8f5d8",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    this.zoneContainer.add(this.zoneTitle);

    this.inventoryText = this.add
      .text(0, 0, "0", {
        fontFamily: PIXEL_FONT,
        fontSize: "13px",
        color: "#bde0bd",
      })
      .setOrigin(0.5, 0);
    this.zoneContainer.add(this.inventoryText);

    for (let i = 0; i < PLOTS_PER_ZONE; i++) {
      const tile = this.add.image(0, 0, "plot-tilled").setOrigin(0.5);
      tile.setInteractive({ useHandCursor: true });
      tile.on("pointerdown", () => this.onPlotTap(i));
      const border = this.add.image(0, 0, "ripe-border").setOrigin(0.5).setVisible(false);
      this.zoneContainer.add([tile, border]);
      this.plots.push({ index: i, tile, border, bumpFactor: 1, baseScale: 1 });
    }

    this.statusText = this.add
      .text(0, 0, "", {
        fontFamily: PIXEL_FONT,
        fontSize: "11px",
        color: "#9ec79e",
      })
      .setOrigin(0.5, 0);
    this.zoneContainer.add(this.statusText);

    this.btnHarvest = this.makeIconButton("✋", "btn-bg", () => this.onHarvestAll());
    this.btnSell = this.makeIconButton("$", "btn-bg", () => this.onSell());
    this.btnCart = this.makeIconButton("+", "btn-bg-accent", () => this.onBuyCart());
    this.btnUnlock = this.makeIconButton("🔓", "btn-bg-warn", () => this.onUnlock());

    this.scale.on("resize", this.layout, this);
    this.layout();

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => saveState(this.state));
    window.addEventListener("beforeunload", () => saveState(this.state));
  }

  update(_time: number, delta: number) {
    const now = Date.now();
    tickCarts(this.state, now, delta);
    this.refresh();

    if (this.time.now - this.lastSaveAt > SAVE_INTERVAL_MS) {
      saveState(this.state);
      this.lastSaveAt = this.time.now;
    }
  }

  private layout = () => {
    const w = this.scale.width;
    const h = this.scale.height;
    const headerH = 56;
    const tabsH = 60;
    const actionH = 80;

    this.grassBg.setSize(w, h);

    this.headerBg.setDisplaySize(w, headerH);

    const coinIconW = 32;
    const coinGap = 8;
    const coinTotal = coinIconW + coinGap + this.coinText.width;
    const coinStart = Math.floor((w - coinTotal) / 2);
    const groupY = headerH / 2 - 8;
    this.coinIcon.setPosition(coinStart, groupY);
    this.coinText.setPosition(coinStart + coinIconW + coinGap, groupY);
    this.rateText.setPosition(Math.floor(w / 2), Math.floor(headerH / 2 + 12));

    this.tabsContainer.setPosition(0, headerH);
    this.layoutTabs(w, tabsH);

    const zoneTop = headerH + tabsH + 6;
    const zoneBottom = h - actionH - 6;
    const zoneH = zoneBottom - zoneTop;

    this.zoneContainer.setPosition(0, zoneTop);
    this.zoneTitle.setPosition(Math.floor(w / 2), 0);
    this.inventoryText.setPosition(Math.floor(w / 2), 26);

    const titleArea = 50;
    const statusArea = 24;
    const gridAreaH = zoneH - titleArea - statusArea;
    const gridAreaW = w - 16;
    const tileGap = 6;

    const sByW = (gridAreaW - tileGap) / 2 / 32;
    const sByH = (gridAreaH - tileGap) / 2 / 32;
    const s = Math.max(1, Math.floor(Math.min(sByW, sByH)));
    const cellW = 32 * s;
    const cellH = 32 * s;
    const tilesW = cellW * 2 + tileGap;
    const tilesH = cellH * 2 + tileGap;
    const gridX = Math.floor((w - tilesW) / 2);
    const gridY = titleArea + Math.min(8, Math.floor((gridAreaH - tilesH) / 2));

    const borderScale = (cellW / 16);

    for (let i = 0; i < this.plots.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = gridX + col * (cellW + tileGap) + Math.floor(cellW / 2);
      const py = gridY + row * (cellH + tileGap) + Math.floor(cellH / 2);
      const p = this.plots[i];
      p.baseScale = s;
      p.tile.setPosition(px, py).setScale(s * p.bumpFactor);
      p.border.setPosition(px, py).setScale(borderScale * p.bumpFactor);
    }

    this.statusText.setPosition(Math.floor(w / 2), gridY + tilesH + 6);

    const buttons = [this.btnHarvest, this.btnSell, this.btnCart, this.btnUnlock];
    const visible = buttons.filter((b) => b.container.visible);
    const btnSize = 64;
    const totalBtnW = visible.length * btnSize + (visible.length - 1) * 14;
    const gridBottomAbs = zoneTop + gridY + tilesH;
    const minActionY = gridBottomAbs + 36 + Math.floor(btnSize / 2);
    const desiredActionY = h - Math.floor(btnSize / 2) - 20;
    const actionY = Math.max(minActionY, desiredActionY);
    let bx = Math.floor((w - totalBtnW) / 2) + Math.floor(btnSize / 2);
    for (const b of visible) {
      this.placeIconButton(b, bx, actionY, btnSize);
      bx += btnSize + 14;
    }
  };

  private layoutTabs(w: number, tabsH: number) {
    const tabSize = 56;
    const gap = 10;
    const totalW = this.tabs.length * tabSize + (this.tabs.length - 1) * gap;
    let x = Math.floor((w - totalW) / 2) + Math.floor(tabSize / 2);
    const y = Math.floor(tabsH / 2);
    for (const tab of this.tabs) {
      tab.container.setPosition(x, y);
      tab.bg.setDisplaySize(tabSize, tabSize);
      tab.icon.setFontSize(28);
      tab.lock.setFontSize(20);
      x += tabSize + gap;
    }
  }

  private buildTab(def: ZoneDef): ZoneTab {
    const c = this.add.container(0, 0);
    const bg = this.add.image(0, 0, "tab-bg").setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.onTabTap(def.id));
    const icon = this.add.text(0, 0, def.emoji, { fontSize: "28px" }).setOrigin(0.5);
    const lock = this.add.text(14, -14, "🔒", { fontSize: "20px" }).setOrigin(0.5).setVisible(false);
    c.add([bg, icon, lock]);
    this.tabsContainer.add(c);
    return { def, container: c, bg, icon, lock };
  }

  private makeIconButton(icon: string, bgKey: string, onClick: () => void): IconButton {
    const c = this.add.container(0, 0);
    const bg = this.add.image(0, 0, bgKey).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    const iconText = this.add
      .text(0, -4, icon, { fontFamily: PIXEL_FONT, fontSize: "26px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    const badge = this.add
      .text(0, 18, "", {
        fontFamily: PIXEL_FONT,
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    c.add([bg, iconText, badge]);

    const btn: IconButton = {
      container: c,
      bg,
      icon: iconText,
      badge,
      baseTexture: bgKey,
      enabled: true,
      onClick,
    };

    bg.on("pointerdown", () => {
      if (!btn.enabled) {
        this.shake(c);
        return;
      }
      this.tweens.add({ targets: c, scale: 0.92, duration: 60, yoyo: true });
      onClick();
    });

    return btn;
  }

  private placeIconButton(btn: IconButton, x: number, y: number, size: number) {
    btn.container.setPosition(x, y);
    btn.bg.setDisplaySize(size, size);
    btn.icon.setFontSize(Math.floor(size * 0.42)).setY(-Math.floor(size * 0.08));
    btn.badge.setY(Math.floor(size * 0.32));
  }

  private setButtonEnabled(btn: IconButton, enabled: boolean) {
    if (btn.enabled === enabled) return;
    btn.enabled = enabled;
    btn.bg.setTexture(enabled ? btn.baseTexture : "btn-bg-disabled");
    btn.container.setAlpha(enabled ? 1 : 0.6);
  }

  private setButtonBadge(btn: IconButton, text: string) {
    btn.badge.setText(text);
  }

  private shake(target: Phaser.GameObjects.Container) {
    this.tweens.add({
      targets: target,
      x: target.x + 4,
      duration: 40,
      yoyo: true,
      repeat: 2,
    });
  }

  private onTabTap(zoneId: string) {
    const zone = this.state.zones[zoneId];
    if (!zone) return;
    if (!zone.unlocked) {
      this.state.activeZoneId = zoneId;
      return;
    }
    setActiveZone(this.state, zoneId);
  }

  private onPlotTap(plotIndex: number) {
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];
    if (!zone.unlocked) return;
    const now = Date.now();
    if (harvestPlot(this.state, zoneDef.id, plotIndex, now)) {
      const pv = this.plots[plotIndex];
      this.spawnFloat(pv.tile.x, pv.tile.y, "+1", COLOR_RIPE_TEXT);
      pv.bumpFactor = 1.25;
    }
  }

  private onHarvestAll() {
    const zoneDef = this.activeZoneDef();
    const now = Date.now();
    const n = harvestAllRipe(this.state, zoneDef.id, now);
    if (n > 0) {
      this.spawnFloat(this.btnHarvest.container.x, this.btnHarvest.container.y - 32, `+${n}`, COLOR_RIPE_TEXT);
      for (const pv of this.plots) pv.bumpFactor = 1.2;
    }
    void zoneDef;
  }

  private onSell() {
    const zoneDef = this.activeZoneDef();
    const earned = sellAll(this.state, zoneDef.id);
    if (earned > 0) {
      this.spawnFloat(this.btnSell.container.x, this.btnSell.container.y - 32, `+${earned}`, COLOR_RIPE_TEXT);
      this.tweens.add({ targets: [this.coinText, this.coinIcon], scale: 1.2, duration: 100, yoyo: true });
    }
  }

  private onBuyCart() {
    const zoneDef = this.activeZoneDef();
    if (buyCart(this.state, zoneDef.id)) {
      this.spawnFloat(this.btnCart.container.x, this.btnCart.container.y - 32, "Cart+1", COLOR_GAIN);
    }
  }

  private onUnlock() {
    const zoneDef = this.activeZoneDef();
    if (unlockZone(this.state, zoneDef.id, Date.now())) {
      setActiveZone(this.state, zoneDef.id);
      this.spawnFloat(this.btnUnlock.container.x, this.btnUnlock.container.y - 32, "Unlocked!", COLOR_GAIN);
    }
  }

  private refresh() {
    const now = Date.now();
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];

    this.coinText.setText(formatNumber(this.state.coins));
    this.rateText.setText(`+${formatNumber(this.computeCoinsPerSec())}/s`);

    for (const tab of this.tabs) {
      const z = this.state.zones[tab.def.id];
      const isActive = tab.def.id === this.state.activeZoneId;
      let key: string;
      if (isActive) key = "tab-bg-active";
      else if (!z.unlocked) key = "tab-bg-locked";
      else key = "tab-bg";
      tab.bg.setTexture(key);
      tab.icon.setAlpha(z.unlocked ? 1 : 0.5);
      tab.lock.setVisible(!z.unlocked);
    }

    this.zoneTitle.setText(zoneDef.name.toUpperCase());
    this.inventoryText.setText(`BASKET: ${formatNumber(zone.inventory)}`);

    const pulse = (Math.sin(this.time.now / 220) + 1) / 2;
    let nextRipeMs = Infinity;
    let ripeCount = 0;

    for (const pv of this.plots) {
      const plot = zone.plots[pv.index];
      const ripe = plotIsRipe(plot, zoneDef.growMs, now);
      const progress = plotProgress(plot, zoneDef.growMs, now);

      const textureKey = !zone.unlocked
        ? "plot-locked"
        : pickStageTexture(zoneDef.id, progress, ripe);
      pv.tile.setTexture(textureKey);

      pv.bumpFactor = Phaser.Math.Linear(pv.bumpFactor, 1, 0.18);

      pv.border.setVisible(ripe && zone.unlocked);
      pv.border.setAlpha(ripe ? 0.35 + 0.45 * pulse : 0);

      if (ripe) ripeCount++;
      else {
        const remaining = zoneDef.growMs - (now - plot.plantedAt);
        if (remaining < nextRipeMs) nextRipeMs = remaining;
      }
    }

    if (!zone.unlocked) {
      this.statusText.setText(`LOCKED  unlock for ${formatNumber(zoneDef.unlockCost)}`);
    } else if (ripeCount > 0 && zone.cartLevel === 0) {
      this.statusText.setText(`${ripeCount} READY — TAP TO HARVEST`);
    } else if (zone.cartLevel === 0) {
      this.statusText.setText(`NEXT IN ${fmtCountdown(nextRipeMs)}`);
    } else {
      const sec = (cartIntervalMs(zone.cartLevel) / 1000).toFixed(1);
      this.statusText.setText(`CART Lv${zone.cartLevel} — auto every ${sec}s`);
    }

    if (zone.unlocked) {
      this.btnUnlock.container.setVisible(false);
      this.btnHarvest.container.setVisible(true);
      this.btnSell.container.setVisible(true);
      this.btnCart.container.setVisible(true);

      this.setButtonEnabled(this.btnHarvest, ripeCount > 0);
      this.setButtonBadge(this.btnHarvest, ripeCount > 0 ? `${ripeCount}` : "");

      this.setButtonEnabled(this.btnSell, zone.inventory > 0);
      this.setButtonBadge(
        this.btnSell,
        zone.inventory > 0 ? `${formatNumber(zone.inventory * zoneDef.sellPrice)}` : "",
      );

      const cost = cartCost(zone.cartLevel);
      this.setButtonEnabled(this.btnCart, this.state.coins >= cost);
      this.setButtonBadge(this.btnCart, formatNumber(cost));
    } else {
      this.btnUnlock.container.setVisible(true);
      this.btnHarvest.container.setVisible(false);
      this.btnSell.container.setVisible(false);
      this.btnCart.container.setVisible(false);

      this.setButtonEnabled(this.btnUnlock, this.state.coins >= zoneDef.unlockCost);
      this.setButtonBadge(this.btnUnlock, formatNumber(zoneDef.unlockCost));
    }

    this.layout();
  }

  private spawnFloat(x: number, y: number, text: string, color: string) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: PIXEL_FONT,
        fontSize: "16px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: "Sine.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  private activeZoneDef(): ZoneDef {
    return ZONES.find((z) => z.id === this.state.activeZoneId) ?? ZONES[0];
  }

  private computeCoinsPerSec(): number {
    let total = 0;
    for (const def of ZONES) {
      const zone = this.state.zones[def.id];
      if (!zone.unlocked) continue;
      const isActive = def.id === this.state.activeZoneId;
      if (isActive && zone.cartLevel > 0) {
        total += (1000 / cartIntervalMs(zone.cartLevel)) * def.sellPrice;
      }
    }
    return total;
  }
}

function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0) + "M";
  return (n / 1_000_000_000).toFixed(1) + "B";
}

function fmtCountdown(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
