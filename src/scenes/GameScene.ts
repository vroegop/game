import Phaser from "phaser";
import { ZONES, ZoneDef } from "../game/zones";
import {
  buyCart,
  buyDragRadius,
  cartCost,
  cartRadius as cartRadiusFn,
  cartSpeed as cartSpeedFn,
  dragRadius as dragRadiusFn,
  dragRadiusCost,
  GameState,
  harvestAllRipe,
  harvestInRadius,
  loadState,
  plotIsRipe,
  plotProgress,
  saveState,
  sellAll,
  setActiveZone,
  tickCarts,
  unlockZone,
} from "../game/state";
import { generatePixelTextures, pickCropSpriteKey } from "./textures";

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
  price: Phaser.GameObjects.Text;
  enabled: boolean;
}

interface SpotView {
  index: number;
  sprite: Phaser.GameObjects.Image;
  bumpFactor: number;
}

interface CartView {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
}

const SAVE_INTERVAL_MS = 3_000;
const PIXEL_FONT = '"Courier New", monospace';

const COLOR_RIPE_TEXT = "#ffe066";
const COLOR_GAIN = "#9ee6b8";

interface FieldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private lastSaveAt = 0;

  private soilBg!: Phaser.GameObjects.TileSprite;

  private headerBg!: Phaser.GameObjects.Image;
  private coinIcon!: Phaser.GameObjects.Image;
  private coinText!: Phaser.GameObjects.Text;
  private rateText!: Phaser.GameObjects.Text;

  private tabsContainer!: Phaser.GameObjects.Container;
  private tabs: ZoneTab[] = [];

  private fieldContainer!: Phaser.GameObjects.Container;
  private spots: SpotView[] = [];
  private cartViews: CartView[] = [];

  private dragRing!: Phaser.GameObjects.Image;
  private dragging = false;

  private statusBg!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  private btnSell!: IconButton;
  private btnCart!: IconButton;
  private btnDrag!: IconButton;
  private btnUnlock!: IconButton;

  private fieldRect: FieldRect = { x: 0, y: 0, w: 100, h: 100 };

  constructor() {
    super("game");
  }

  create() {
    generatePixelTextures(this);

    this.state = loadState();
    this.lastSaveAt = this.time.now;

    this.cameras.main.setBackgroundColor("#1d2b1d");

    this.soilBg = this.add.tileSprite(0, 0, 100, 100, "soil-bg").setOrigin(0, 0);

    this.fieldContainer = this.add.container(0, 0);

    this.dragRing = this.add.image(0, 0, "drag-ring").setOrigin(0.5).setVisible(false);
    this.dragRing.setAlpha(0.07);
    this.fieldContainer.add(this.dragRing);

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

    this.statusBg = this.add.image(0, 0, "panel-bg").setOrigin(0, 0);

    this.titleText = this.add
      .text(0, 0, "", {
        fontFamily: PIXEL_FONT,
        fontSize: "16px",
        color: "#e8f5d8",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.statusText = this.add
      .text(0, 0, "", {
        fontFamily: PIXEL_FONT,
        fontSize: "11px",
        color: "#9ec79e",
      })
      .setOrigin(0.5, 0);

    this.btnSell = this.makeIconButton("💰", "btn-bg", () => this.onSell());
    this.btnCart = this.makeIconButton("🚜", "btn-bg-accent", () => this.onBuyCart());
    this.btnDrag = this.makeIconButton("✋", "btn-bg-accent", () => this.onBuyDrag());
    this.btnUnlock = this.makeIconButton("🔓", "btn-bg-warn", () => this.onUnlock());

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);

    this.scale.on("resize", this.layout, this);
    this.layout();
    this.rebuildSpotViews();
    this.rebuildCartViews();

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
    const tabsH = 56;
    const statusH = 36;
    const actionH = 80;

    this.headerBg.setDisplaySize(w, headerH);
    const coinIconSize = 30;
    const coinGap = 8;
    const coinGroupW = coinIconSize + coinGap + this.coinText.width;
    const coinStart = Math.floor((w - coinGroupW) / 2);
    const groupY = Math.floor(headerH / 2 - 8);
    this.coinIcon.setPosition(coinStart, groupY);
    this.coinText.setPosition(coinStart + coinIconSize + coinGap, groupY);
    this.rateText.setPosition(Math.floor(w / 2), Math.floor(headerH / 2 + 12));

    this.tabsContainer.setPosition(0, headerH);
    this.layoutTabs(w, tabsH);

    const fieldTop = headerH + tabsH;
    const fieldBottom = h - actionH - statusH;
    const fieldH = Math.max(120, fieldBottom - fieldTop);
    this.fieldRect = { x: 0, y: fieldTop, w, h: fieldH };

    this.soilBg.setPosition(0, fieldTop).setSize(w, fieldH);
    this.soilBg.setTilePosition(0, 0);
    this.fieldContainer.setPosition(0, fieldTop);

    this.statusBg.setPosition(0, fieldBottom).setDisplaySize(w, statusH);
    this.titleText.setPosition(Math.floor(w / 2), fieldBottom + 4);
    this.statusText.setPosition(Math.floor(w / 2), fieldBottom + 22);

    const buttons = [this.btnSell, this.btnCart, this.btnDrag, this.btnUnlock];
    const visible = buttons.filter((b) => b.container.visible);
    const btnSize = 60;
    const totalBtnW = visible.length * btnSize + Math.max(0, visible.length - 1) * 14;
    const actionY = h - Math.floor(actionH / 2);
    let bx = Math.floor((w - totalBtnW) / 2) + Math.floor(btnSize / 2);
    for (const b of visible) {
      this.placeIconButton(b, bx, actionY, btnSize);
      bx += btnSize + 14;
    }

    this.layoutSpots();
    this.layoutCarts();
  };

  private layoutTabs(w: number, tabsH: number) {
    const tabSize = 48;
    const gap = 10;
    const totalW = this.tabs.length * tabSize + (this.tabs.length - 1) * gap;
    let x = Math.floor((w - totalW) / 2) + Math.floor(tabSize / 2);
    const y = Math.floor(tabsH / 2);
    for (const tab of this.tabs) {
      tab.container.setPosition(x, y);
      tab.bg.setDisplaySize(tabSize, tabSize);
      tab.icon.setFontSize(24);
      x += tabSize + gap;
    }
  }

  private buildTab(def: ZoneDef): ZoneTab {
    const c = this.add.container(0, 0);
    const bg = this.add.image(0, 0, "tab-bg").setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.onTabTap(def.id));
    const icon = this.add.text(0, 0, def.emoji, { fontSize: "24px" }).setOrigin(0.5);
    const price = this.add
      .text(0, 14, "", {
        fontFamily: PIXEL_FONT,
        fontSize: "10px",
        color: "#ffe89a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    c.add([bg, icon, price]);
    this.tabsContainer.add(c);
    return { def, container: c, bg, icon, price, enabled: true };
  }

  private makeIconButton(label: string, bgKey: string, onClick: () => void): IconButton {
    const c = this.add.container(0, 0);
    const bg = this.add.image(0, 0, bgKey).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    const iconText = this.add
      .text(0, -2, label, {
        fontFamily: PIXEL_FONT,
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const badge = this.add
      .text(0, 16, "", {
        fontFamily: PIXEL_FONT,
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
      baseTexture: bgKey,
      enabled: true,
      onClick,
    };

    bg.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
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
    btn.icon.setFontSize(Math.floor(size * 0.36)).setY(-Math.floor(size * 0.08));
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

  private rebuildSpotViews() {
    for (const sv of this.spots) sv.sprite.destroy();
    this.spots = [];
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];
    for (let i = 0; i < zone.spots.length; i++) {
      const sprite = this.add.image(0, 0, "crop-empty").setOrigin(0.5, 1);
      this.fieldContainer.add(sprite);
      this.spots.push({ index: i, sprite, bumpFactor: 1 });
    }
    this.fieldContainer.bringToTop(this.dragRing);
    this.layoutSpots();
  }

  private rebuildCartViews() {
    for (const cv of this.cartViews) {
      cv.sprite.destroy();
      cv.glow.destroy();
    }
    this.cartViews = [];
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];
    for (let i = 0; i < zone.carts.length; i++) {
      const glow = this.add.image(0, 0, "drag-ring").setOrigin(0.5);
      glow.setAlpha(0.05);
      const sprite = this.add.image(0, 0, "cart").setOrigin(0.5);
      this.fieldContainer.add([glow, sprite]);
      this.cartViews.push({ sprite, glow });
    }
    this.fieldContainer.bringToTop(this.dragRing);
    this.layoutCarts();
  }

  private layoutSpots() {
    const zone = this.state.zones[this.activeZoneDef().id];
    const fr = this.fieldRect;
    const baseScale = Math.max(2, Math.min(4, Math.floor(fr.w / (7 * 16))));
    for (let i = 0; i < this.spots.length && i < zone.spots.length; i++) {
      const spot = zone.spots[i];
      const sv = this.spots[i];
      const sx = spot.x * fr.w;
      const sy = spot.y * fr.h;
      sv.sprite.setPosition(sx, sy);
      sv.sprite.setScale(baseScale * sv.bumpFactor);
    }
  }

  private layoutCarts() {
    const zone = this.state.zones[this.activeZoneDef().id];
    const fr = this.fieldRect;
    const cartScale = Math.max(2, Math.floor(Math.min(fr.w, fr.h) / 250));
    const radiusNorm = cartRadiusFn(zone.cartLevel);
    const radiusPx = radiusNorm * Math.min(fr.w, fr.h);
    for (let i = 0; i < this.cartViews.length && i < zone.carts.length; i++) {
      const cart = zone.carts[i];
      const cv = this.cartViews[i];
      const sx = cart.x * fr.w;
      const sy = cart.y * fr.h;
      cv.sprite.setPosition(sx, sy);
      cv.sprite.setScale(cartScale);
      const flip = Math.cos(cart.facing) < 0;
      cv.sprite.setFlipX(flip);
      cv.glow.setPosition(sx, sy);
      cv.glow.setScale((radiusPx * 2) / 64);
    }
  }

  private onTabTap(zoneId: string) {
    const tab = this.tabs.find((t) => t.def.id === zoneId);
    if (!tab) return;
    const zone = this.state.zones[zoneId];
    if (!zone) return;
    if (!zone.unlocked) {
      if (this.state.coins < tab.def.unlockCost) {
        this.shake(tab.container);
        return;
      }
      if (unlockZone(this.state, zoneId, Date.now())) {
        setActiveZone(this.state, zoneId);
        const sx = this.tabsContainer.x + tab.container.x;
        const sy = this.tabsContainer.y + tab.container.y + 24;
        this.spawnFloat(sx, sy, "Unlocked!", COLOR_GAIN);
        this.rebuildSpotViews();
        this.rebuildCartViews();
      }
      return;
    }
    if (setActiveZone(this.state, zoneId)) {
      this.rebuildSpotViews();
      this.rebuildCartViews();
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.isInsideField(pointer.x, pointer.y)) return;
    this.dragging = true;
    this.dragRing.setVisible(true);
    this.harvestAtPointer(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragging) return;
    if (!this.isInsideField(pointer.x, pointer.y)) {
      this.dragRing.setVisible(false);
      return;
    }
    this.dragRing.setVisible(true);
    this.harvestAtPointer(pointer);
  }

  private onPointerUp() {
    this.dragging = false;
    this.dragRing.setVisible(false);
  }

  private isInsideField(x: number, y: number): boolean {
    const fr = this.fieldRect;
    return x >= fr.x && x <= fr.x + fr.w && y >= fr.y && y <= fr.y + fr.h;
  }

  private harvestAtPointer(pointer: Phaser.Input.Pointer) {
    const fr = this.fieldRect;
    const localX = pointer.x - fr.x;
    const localY = pointer.y - fr.y;
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];
    if (!zone.unlocked) return;

    const r = dragRadiusFn(this.state.dragRadiusLevel);
    const cx = localX / fr.w;
    const cy = localY / fr.h;
    const radiusPx = r * Math.min(fr.w, fr.h);

    this.dragRing.setPosition(localX, localY);
    this.dragRing.setScale((radiusPx * 2) / 64);

    const before = zone.inventory;
    const harvested = harvestInRadius(this.state, zoneDef.id, cx, cy, r, Date.now());
    void before;
    if (harvested > 0) {
      for (let i = 0; i < zone.spots.length; i++) {
        const spot = zone.spots[i];
        const dx = spot.x - cx;
        const dy = spot.y - cy;
        if (dx * dx + dy * dy <= r * r) {
          this.spots[i].bumpFactor = 1.45;
        }
      }
      this.spawnFloat(localX, localY - 12, `+${harvested}`, COLOR_RIPE_TEXT);
    }
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
      this.rebuildCartViews();
    }
  }

  private onBuyDrag() {
    if (buyDragRadius(this.state)) {
      this.spawnFloat(this.btnDrag.container.x, this.btnDrag.container.y - 32, "Reach+1", COLOR_GAIN);
    }
  }

  private onUnlock() {
    const zoneDef = this.activeZoneDef();
    if (unlockZone(this.state, zoneDef.id, Date.now())) {
      setActiveZone(this.state, zoneDef.id);
      this.spawnFloat(this.btnUnlock.container.x, this.btnUnlock.container.y - 32, "Unlocked!", COLOR_GAIN);
      this.rebuildSpotViews();
      this.rebuildCartViews();
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
      const canAfford = this.state.coins >= tab.def.unlockCost;
      let key: string;
      if (z.unlocked && isActive) key = "tab-bg-active";
      else if (!z.unlocked && canAfford) key = "tab-bg-warn";
      else if (!z.unlocked) key = "tab-bg-locked";
      else key = "tab-bg";
      tab.bg.setTexture(key);
      tab.icon.setAlpha(z.unlocked ? 1 : canAfford ? 0.95 : 0.45);
      if (z.unlocked) {
        tab.price.setVisible(false);
        tab.icon.setY(0);
        tab.enabled = true;
        tab.container.setAlpha(1);
      } else {
        tab.price.setVisible(true);
        tab.price.setText(formatNumber(tab.def.unlockCost));
        tab.price.setColor(canAfford ? "#fff080" : "#9a9a9a");
        tab.icon.setY(-7);
        tab.enabled = canAfford;
        tab.container.setAlpha(canAfford ? 1 : 0.6);
      }
    }

    this.titleText.setText(`${zoneDef.name.toUpperCase()}  -  BASKET ${zone.inventory}`);

    let ripeCount = 0;
    for (let i = 0; i < this.spots.length && i < zone.spots.length; i++) {
      const spot = zone.spots[i];
      const ripe = plotIsRipe(spot, zoneDef.growMs, now);
      const progress = plotProgress(spot, zoneDef.growMs, now);
      const key = !zone.unlocked
        ? "crop-empty"
        : pickCropSpriteKey(zoneDef.id, progress, ripe);
      this.spots[i].sprite.setTexture(key);
      this.spots[i].sprite.setVisible(zone.unlocked && key !== "crop-empty");
      this.spots[i].bumpFactor = Phaser.Math.Linear(this.spots[i].bumpFactor, 1, 0.18);
      if (ripe) ripeCount += 1;
    }

    this.layoutSpots();
    this.layoutCarts();

    if (!zone.unlocked) {
      this.statusText.setText(`LOCKED  -  unlock for ${formatNumber(zoneDef.unlockCost)}`);
    } else if (ripeCount > 0) {
      this.statusText.setText(`${ripeCount} READY  -  drag to harvest`);
    } else {
      this.statusText.setText(`${zone.spots.length} crops growing`);
    }

    if (zone.unlocked) {
      this.btnUnlock.container.setVisible(false);
      this.btnSell.container.setVisible(true);
      this.btnCart.container.setVisible(true);
      this.btnDrag.container.setVisible(true);

      this.setButtonEnabled(this.btnSell, zone.inventory > 0);
      this.setButtonBadge(
        this.btnSell,
        zone.inventory > 0 ? `${formatNumber(zone.inventory * zoneDef.sellPrice)}` : "",
      );

      const ccost = cartCost(zone.cartLevel);
      this.setButtonEnabled(this.btnCart, this.state.coins >= ccost);
      this.setButtonBadge(this.btnCart, formatNumber(ccost));

      const dcost = dragRadiusCost(this.state.dragRadiusLevel);
      this.setButtonEnabled(this.btnDrag, this.state.coins >= dcost);
      this.setButtonBadge(this.btnDrag, formatNumber(dcost));
    } else {
      this.btnUnlock.container.setVisible(true);
      this.btnSell.container.setVisible(false);
      this.btnCart.container.setVisible(false);
      this.btnDrag.container.setVisible(false);

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
    const zoneDef = this.activeZoneDef();
    const zone = this.state.zones[zoneDef.id];
    if (zone.unlocked && zone.cartLevel > 0) {
      const speed = cartSpeedFn(zone.cartLevel);
      const r = cartRadiusFn(zone.cartLevel);
      const sweptAreaPerSec = 2 * r * speed;
      const cropDensity = zone.spots.length;
      const harvestPerSec = sweptAreaPerSec * cropDensity * 0.04 * zone.cartLevel;
      total = harvestPerSec * zoneDef.sellPrice;
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
