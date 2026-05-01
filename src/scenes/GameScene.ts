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

interface IconButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
  baseColor: number;
  enabled: boolean;
  onClick: () => void;
  size: number;
}

interface ZoneTab {
  def: ZoneDef;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  lockOverlay: Phaser.GameObjects.Text;
}

interface PlotView {
  index: number;
  soil: Phaser.GameObjects.Image;
  cropYoung: Phaser.GameObjects.Image;
  cropRipe: Phaser.GameObjects.Image;
  border: Phaser.GameObjects.Rectangle;
  bumpFactor: number;
}

const SAVE_INTERVAL_MS = 3_000;

const COLOR_BG = 0x0f2a0f;
const COLOR_PANEL = 0x16331a;
const COLOR_BORDER = 0x2d5a2d;
const COLOR_RIPE = 0xffe066;
const COLOR_BUTTON = 0x2d5a2d;
const COLOR_BUTTON_ACCENT = 0x3a7a4a;
const COLOR_BUTTON_DISABLED = 0x2a3a2a;
const COLOR_TAB_ACTIVE = 0x4a8a5a;
const COLOR_TAB_INACTIVE = 0x1f3a1f;
const COLOR_TAB_LOCKED = 0x2a2a2a;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private lastSaveAt = 0;

  private headerBg!: Phaser.GameObjects.Rectangle;
  private coinIcon!: Phaser.GameObjects.Image;
  private coinText!: Phaser.GameObjects.Text;
  private rateText!: Phaser.GameObjects.Text;

  private tabsContainer!: Phaser.GameObjects.Container;
  private tabs: ZoneTab[] = [];

  private zoneContainer!: Phaser.GameObjects.Container;
  private zoneTitle!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;
  private plots: PlotView[] = [];

  private cartStatusText!: Phaser.GameObjects.Text;

  private btnHarvest!: IconButton;
  private btnSell!: IconButton;
  private btnCart!: IconButton;
  private btnUnlock!: IconButton;

  private floatingTextLayer!: Phaser.GameObjects.Container;

  constructor() {
    super("game");
  }

  preload() {
    this.load.svg("soil", "sprites/soil.svg", { width: 256, height: 256 });
    this.load.svg("coin", "sprites/coin.svg", { width: 64, height: 64 });
    for (const def of ZONES) {
      this.load.svg(def.spriteYoung, `sprites/${def.spriteYoung}.svg`, { width: 200, height: 200 });
      this.load.svg(def.spriteRipe, `sprites/${def.spriteRipe}.svg`, { width: 200, height: 200 });
    }
  }

  create() {
    this.state = loadState();
    this.lastSaveAt = this.time.now;

    this.cameras.main.setBackgroundColor(COLOR_BG);

    this.headerBg = this.add.rectangle(0, 0, 10, 10, 0x16331a, 1).setOrigin(0, 0);
    this.headerBg.setStrokeStyle(2, COLOR_BORDER);

    this.coinText = this.add
      .text(0, 0, "0", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
        color: "#ffe89a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.coinIcon = this.add.image(0, 0, "coin").setOrigin(0, 0.5);
    this.coinIcon.setDisplaySize(30, 30);

    this.rateText = this.add
      .text(0, 0, "+0/s", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#a8c8a8",
      })
      .setOrigin(0.5, 0);

    this.tabsContainer = this.add.container(0, 0);
    for (const def of ZONES) this.tabs.push(this.buildTab(def));

    this.zoneContainer = this.add.container(0, 0);

    this.zoneTitle = this.add
      .text(0, 0, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#bde0bd",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    this.zoneContainer.add(this.zoneTitle);

    this.inventoryText = this.add
      .text(0, 0, "0", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#e8f5e8",
      })
      .setOrigin(0.5, 0);
    this.zoneContainer.add(this.inventoryText);

    for (let i = 0; i < PLOTS_PER_ZONE; i++) {
      const soil = this.add.image(0, 0, "soil").setOrigin(0.5);
      soil.setInteractive({ useHandCursor: true });
      soil.on("pointerdown", () => this.onPlotTap(i));

      const cropYoung = this.add.image(0, 0, ZONES[0].spriteYoung).setOrigin(0.5).setVisible(false);
      const cropRipe = this.add.image(0, 0, ZONES[0].spriteRipe).setOrigin(0.5).setVisible(false);

      const border = this.add.rectangle(0, 0, 10, 10, 0, 0).setOrigin(0.5);
      border.setStrokeStyle(3, COLOR_RIPE, 0);

      this.zoneContainer.add([soil, cropYoung, cropRipe, border]);
      this.plots.push({ index: i, soil, cropYoung, cropRipe, border, bumpFactor: 1 });
    }

    this.cartStatusText = this.add
      .text(0, 0, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#90b090",
      })
      .setOrigin(0.5, 0);
    this.zoneContainer.add(this.cartStatusText);

    this.btnHarvest = this.makeIconButton("✋", COLOR_BUTTON, () => this.onHarvestAll());
    this.btnSell = this.makeIconButton("💰", COLOR_BUTTON, () => this.onSell());
    this.btnCart = this.makeIconButton("🛒", COLOR_BUTTON_ACCENT, () => this.onBuyCart());
    this.btnUnlock = this.makeIconButton("🔓", 0xa66a00, () => this.onUnlock());

    this.floatingTextLayer = this.add.container(0, 0);

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

  // ---------- Layout ----------

  private layout = () => {
    const w = this.scale.width;
    const h = this.scale.height;

    const headerH = 64;
    const tabsH = 64;
    const actionH = 80;

    this.headerBg.setSize(w, headerH);
    const coinIconSize = 30;
    const coinGap = 8;
    const coinGroupW = coinIconSize + coinGap + this.coinText.width;
    const coinStartX = w / 2 - coinGroupW / 2;
    const groupCenterY = headerH / 2 - 6;
    this.coinIcon.setPosition(coinStartX, groupCenterY);
    this.coinText.setPosition(coinStartX + coinIconSize + coinGap, groupCenterY);
    this.rateText.setPosition(w / 2, headerH / 2 + 14);

    this.tabsContainer.setPosition(0, headerH);
    this.layoutTabs(w, tabsH);

    const zoneTop = headerH + tabsH + 8;
    const zoneBottom = h - actionH - 8;
    const zoneH = zoneBottom - zoneTop;

    this.zoneContainer.setPosition(0, zoneTop);
    this.zoneTitle.setPosition(w / 2, 0);
    this.inventoryText.setPosition(w / 2, 28);

    const gridTop = 56;
    const gridBottom = zoneH - 32;
    const gridH = gridBottom - gridTop;
    const gridW = w - 32;
    const plotW = (gridW - 16) / 2;
    const plotH = Math.min((gridH - 16) / 2, plotW * 1.4);
    const gridX = (w - gridW) / 2;
    const usedH = plotH * 2 + 16;
    const gridY = gridTop + Math.max(0, (gridH - usedH) / 2);

    for (let i = 0; i < this.plots.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = gridX + col * (plotW + 16) + plotW / 2;
      const py = gridY + row * (plotH + 16) + plotH / 2;
      const p = this.plots[i];
      p.soil.setPosition(px, py);
      p.soil.setDisplaySize(plotW, plotH);
      p.cropYoung.setPosition(px, py + plotH * 0.1);
      p.cropRipe.setPosition(px, py + plotH * 0.1);
      p.border.setPosition(px, py).setSize(plotW, plotH);
    }

    this.cartStatusText.setPosition(w / 2, gridY + plotH * 2 + 16 + 8);

    const actionY = h - actionH / 2;
    const buttons = [this.btnHarvest, this.btnSell, this.btnCart, this.btnUnlock];
    const visibleButtons = buttons.filter((b) => b.container.visible);
    const btnSize = 56;
    const totalW = visibleButtons.length * btnSize + (visibleButtons.length - 1) * 16;
    let bx = (w - totalW) / 2 + btnSize / 2;
    for (const b of visibleButtons) {
      this.placeIconButton(b, bx, actionY, btnSize);
      bx += btnSize + 16;
    }
  };

  private layoutTabs(w: number, tabsH: number) {
    const tabSize = 48;
    const gap = 12;
    const totalW = this.tabs.length * tabSize + (this.tabs.length - 1) * gap;
    let x = (w - totalW) / 2 + tabSize / 2;
    const y = tabsH / 2;
    for (const tab of this.tabs) {
      tab.container.setPosition(x, y);
      tab.bg.setSize(tabSize, tabSize);
      tab.icon.setFontSize(Math.floor(tabSize * 0.55));
      tab.lockOverlay.setFontSize(Math.floor(tabSize * 0.45));
      x += tabSize + gap;
    }
  }

  // ---------- Builders ----------

  private buildTab(def: ZoneDef): ZoneTab {
    const c = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 48, 48, COLOR_TAB_INACTIVE, 1).setOrigin(0.5);
    bg.setStrokeStyle(2, COLOR_BORDER);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.onTabTap(def.id));
    const icon = this.add.text(0, 0, def.emoji, { fontSize: "26px" }).setOrigin(0.5);
    const lockOverlay = this.add
      .text(14, -14, "🔒", { fontSize: "16px" })
      .setOrigin(0.5)
      .setVisible(false);
    c.add([bg, icon, lockOverlay]);
    this.tabsContainer.add(c);
    return { def, container: c, bg, icon, lockOverlay };
  }

  private makeIconButton(icon: string, color: number, onClick: () => void): IconButton {
    const c = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 56, 56, color, 1).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffffff, 0.4);
    bg.setInteractive({ useHandCursor: true });
    const iconText = this.add.text(0, -4, icon, { fontSize: "24px" }).setOrigin(0.5);
    const badge = this.add
      .text(0, 18, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
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
      baseColor: color,
      enabled: true,
      onClick,
      size: 56,
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
    btn.bg.setSize(size, size);
    btn.icon.setFontSize(Math.floor(size * 0.45)).setY(-Math.floor(size * 0.08));
    btn.badge.setY(Math.floor(size * 0.32));
    btn.size = size;
  }

  private setButtonEnabled(btn: IconButton, enabled: boolean) {
    if (btn.enabled === enabled) return;
    btn.enabled = enabled;
    btn.bg.setFillStyle(enabled ? btn.baseColor : COLOR_BUTTON_DISABLED, 1);
    btn.container.setAlpha(enabled ? 1 : 0.55);
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

  // ---------- Input handlers ----------

  private onTabTap(zoneId: string) {
    const zone = this.state.zones[zoneId];
    if (!zone) return;
    if (!zone.unlocked) {
      this.state.activeZoneId = zoneId;
      this.refresh();
      return;
    }
    setActiveZone(this.state, zoneId);
    this.refresh();
  }

  private onPlotTap(plotIndex: number) {
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];
    if (!zone.unlocked) return;
    const now = Date.now();
    if (harvestPlot(this.state, zoneDef.id, plotIndex, now)) {
      const pv = this.plots[plotIndex];
      this.spawnFloatText(pv.soil.x, pv.soil.y, `+1 ${zoneDef.emoji}`, "#ffe066");
      this.bumpPlot(plotIndex);
    }
  }

  private onHarvestAll() {
    const zoneDef = this.activeZoneDef();
    const now = Date.now();
    const n = harvestAllRipe(this.state, zoneDef.id, now);
    if (n > 0) {
      this.spawnFloatText(this.btnHarvest.container.x, this.btnHarvest.container.y - 30, `+${n} ${zoneDef.emoji}`, "#ffe066");
    }
  }

  private onSell() {
    const zoneDef = this.activeZoneDef();
    const earned = sellAll(this.state, zoneDef.id);
    if (earned > 0) {
      this.spawnFloatText(this.btnSell.container.x, this.btnSell.container.y - 30, `+${earned} 🪙`, "#ffd966");
      this.pulseCoins();
    }
  }

  private onBuyCart() {
    const zoneDef = this.activeZoneDef();
    if (buyCart(this.state, zoneDef.id)) {
      this.spawnFloatText(this.btnCart.container.x, this.btnCart.container.y - 30, "Cart +1", "#9ee6b8");
    }
  }

  private onUnlock() {
    const zoneDef = this.activeZoneDef();
    if (unlockZone(this.state, zoneDef.id, Date.now())) {
      setActiveZone(this.state, zoneDef.id);
      this.spawnFloatText(this.btnUnlock.container.x, this.btnUnlock.container.y - 30, "Unlocked!", "#9ee6b8");
    }
  }

  // ---------- Refresh / animations ----------

  private refresh() {
    const now = Date.now();
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];

    this.coinText.setText(`${formatNumber(this.state.coins)}`);
    this.rateText.setText(`+${formatNumber(this.computeCoinsPerSec())}/s`);

    for (const tab of this.tabs) {
      const z = this.state.zones[tab.def.id];
      const isActive = tab.def.id === this.state.activeZoneId;
      let color: number;
      if (isActive) color = COLOR_TAB_ACTIVE;
      else if (!z.unlocked) color = COLOR_TAB_LOCKED;
      else color = COLOR_TAB_INACTIVE;
      tab.bg.setFillStyle(color, 1);
      tab.bg.setStrokeStyle(2, isActive ? 0xffffff : COLOR_BORDER, isActive ? 0.9 : 1);
      tab.icon.setAlpha(z.unlocked ? 1 : 0.45);
      tab.lockOverlay.setVisible(!z.unlocked);
    }

    this.zoneTitle.setText(zoneDef.name);
    this.inventoryText.setText(`${zone.inventory} ${zoneDef.emoji} in basket`);

    const pulsePhase = (Math.sin(this.time.now / 220) + 1) / 2;
    const sample = this.plots[0]?.soil;
    const plotSpan = Math.min(sample?.displayWidth ?? 100, sample?.displayHeight ?? 100);
    const cropBaseScale = (plotSpan * 0.75) / 200;

    for (const pv of this.plots) {
      const plot = zone.plots[pv.index];
      const ripe = plotIsRipe(plot, zoneDef.growMs, now);
      const progress = plotProgress(plot, zoneDef.growMs, now);

      pv.soil.setAlpha(zone.unlocked ? 1 : 0.4);
      pv.cropYoung.setTexture(zoneDef.spriteYoung);
      pv.cropRipe.setTexture(zoneDef.spriteRipe);

      if (!zone.unlocked) {
        pv.cropYoung.setVisible(false);
        pv.cropRipe.setVisible(false);
        pv.border.setStrokeStyle(3, COLOR_RIPE, 0);
        continue;
      }

      const youngAlpha = Phaser.Math.Clamp(1 - progress * 1.4, 0, 1);
      const ripeAlpha = Phaser.Math.Clamp((progress - 0.35) * 1.7, 0, 1);
      const growthScale = cropBaseScale * (0.35 + 0.65 * Math.min(progress * 1.4, 1));
      const bumped = growthScale * pv.bumpFactor;
      pv.bumpFactor = Phaser.Math.Linear(pv.bumpFactor, 1, 0.18);

      pv.cropYoung.setVisible(youngAlpha > 0.02);
      pv.cropYoung.setAlpha(youngAlpha);
      pv.cropYoung.setScale(bumped);

      pv.cropRipe.setVisible(ripeAlpha > 0.02);
      pv.cropRipe.setAlpha(ripeAlpha);
      pv.cropRipe.setScale(bumped);

      const borderAlpha = ripe ? 0.45 + 0.55 * pulsePhase : 0;
      pv.border.setStrokeStyle(3, COLOR_RIPE, borderAlpha);
    }

    if (!zone.unlocked) {
      this.cartStatusText.setText(`🔒 Locked — unlock for ${formatNumber(zoneDef.unlockCost)} 🪙`);
    } else if (zone.cartLevel === 0) {
      this.cartStatusText.setText("Tap a ripe plot to harvest");
    } else {
      const sec = (cartIntervalMs(zone.cartLevel) / 1000).toFixed(1);
      this.cartStatusText.setText(`Cart Lv ${zone.cartLevel} — auto every ${sec}s`);
    }

    const ripeCount = zone.plots.reduce(
      (n, p) => n + (plotIsRipe(p, zoneDef.growMs, now) ? 1 : 0),
      0,
    );

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

  private bumpPlot(idx: number) {
    this.plots[idx].bumpFactor = 1.35;
  }

  private pulseCoins() {
    this.tweens.add({
      targets: this.coinText,
      scale: 1.2,
      duration: 100,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  private spawnFloatText(x: number, y: number, text: string, color: string) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
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

  // ---------- Helpers ----------

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
