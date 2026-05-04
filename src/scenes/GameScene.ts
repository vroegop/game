import Phaser from "phaser";
import { ZONES, ZoneDef } from "../game/zones";
import {
  activateBoost,
  BoostKind,
  buyBoostWithGems,
  buyCart,
  buyDragRadius,
  buyGemShopItem,
  buyGreenhouse,
  buyGrowth,
  buyPrice,
  buyYield,
  cartCost,
  cartRadius as cartRadiusFn,
  cartSpeed as cartSpeedFn,
  dragRadius as dragRadiusFn,
  dragRadiusCost,
  effectiveGrowMs,
  effectivePriceMult,
  effectiveYield,
  BOOST_GEM_COST,
  GameState,
  GEM_SHOP_ITEMS,
  GREENHOUSE_ENTRIES,
  gemShopItemCost,
  growthCost,
  harvestInRadius,
  loadState,
  plotIsRipe,
  plotProgress,
  priceCost,
  saveState,
  sellAll,
  setActiveZone,
  tickCarts,
  unlockZone,
  WeatherKind,
  yieldCost,
} from "../game/state";
import { generatePixelTextures, pickCropSpriteKey } from "./textures";

type MenuTab = "upgrades" | "greenhouse" | "boosts" | "shop";

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
  private gemIcon!: Phaser.GameObjects.Image;
  private gemText!: Phaser.GameObjects.Text;
  private menuButton!: IconButton;
  private weatherText!: Phaser.GameObjects.Text;
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
  private btnYield!: IconButton;
  private btnGrowth!: IconButton;
  private btnPrice!: IconButton;
  private btnDrag!: IconButton;
  private btnUnlock!: IconButton;

  private menuOpen = false;
  private menuTab: MenuTab = "upgrades";
  private menuOverlay!: Phaser.GameObjects.Container;
  private menuTabs: { id: MenuTab; container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private menuRowsContainer!: Phaser.GameObjects.Container;

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
        fontSize: "20px",
        color: "#ffe89a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.gemIcon = this.add.image(0, 0, "gem").setOrigin(0, 0.5);
    this.gemIcon.setScale(2);
    this.gemText = this.add
      .text(0, 0, "0", {
        fontFamily: PIXEL_FONT,
        fontSize: "20px",
        color: "#a0f0f0",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.weatherText = this.add
      .text(0, 0, "", {
        fontFamily: PIXEL_FONT,
        fontSize: "10px",
        color: "#a8c8a8",
      })
      .setOrigin(0.5, 0);

    this.rateText = this.add
      .text(0, 0, "+0/s", {
        fontFamily: PIXEL_FONT,
        fontSize: "10px",
        color: "#a8c8a8",
      })
      .setOrigin(0.5, 0);

    this.menuButton = this.makeIconButton("≡", "btn-bg-accent", () => this.toggleMenu());

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
    this.btnYield = this.makeIconButton("📦", "btn-bg-accent", () => this.onBuyYield());
    this.btnGrowth = this.makeIconButton("⏱", "btn-bg-accent", () => this.onBuyGrowth());
    this.btnPrice = this.makeIconButton("💲", "btn-bg-accent", () => this.onBuyPrice());
    this.btnDrag = this.makeIconButton("✋", "btn-bg-accent", () => this.onBuyDrag());
    this.btnUnlock = this.makeIconButton("🔓", "btn-bg-warn", () => this.onUnlock());

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);

    this.buildMenu();

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
    const iconSize = 30;
    const innerGap = 6;
    const groupGap = 18;
    const menuSize = 40;
    const groupY = Math.floor(headerH / 2 - 8);

    const coinW = iconSize + innerGap + this.coinText.width;
    const gemW = iconSize + innerGap + this.gemText.width;
    const totalW = coinW + groupGap + gemW;
    const startX = Math.floor((w - totalW - menuSize - 12) / 2);
    this.coinIcon.setPosition(startX, groupY);
    this.coinText.setPosition(startX + iconSize + innerGap, groupY);
    const gemX = startX + coinW + groupGap;
    this.gemIcon.setPosition(gemX, groupY);
    this.gemText.setPosition(gemX + iconSize + innerGap, groupY);
    this.placeIconButton(this.menuButton, w - 8 - menuSize / 2, Math.floor(headerH / 2), menuSize);

    this.weatherText.setPosition(Math.floor(w / 2), Math.floor(headerH / 2 + 10));
    this.rateText.setPosition(Math.floor(w / 2), Math.floor(headerH / 2 + 22));

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

    this.btnCart.container.setVisible(false);
    this.btnYield.container.setVisible(false);
    this.btnGrowth.container.setVisible(false);
    this.btnPrice.container.setVisible(false);
    this.btnDrag.container.setVisible(false);
    this.btnUnlock.container.setVisible(false);

    const sellSize = 72;
    const actionY = h - Math.floor(actionH / 2);
    this.placeIconButton(this.btnSell, Math.floor(w / 2), actionY, sellSize);

    this.layoutSpots();
    this.layoutCarts();
    this.layoutMenu();
  };

  private layoutTabs(w: number, tabsH: number) {
    const visible = this.tabs.filter((t) => t.container.visible);
    if (visible.length === 0) return;
    const desired = 48;
    const gap = 8;
    const fitSize = Math.floor((w - 16 - (visible.length - 1) * gap) / visible.length);
    const tabSize = Math.max(34, Math.min(desired, fitSize));
    const totalW = visible.length * tabSize + (visible.length - 1) * gap;
    let x = Math.floor((w - totalW) / 2) + Math.floor(tabSize / 2);
    const y = Math.floor(tabsH / 2);
    for (const tab of visible) {
      tab.container.setPosition(x, y);
      tab.bg.setDisplaySize(tabSize, tabSize);
      tab.icon.setFontSize(Math.max(16, Math.floor(tabSize * 0.5)));
      tab.price.setFontSize(Math.max(8, Math.floor(tabSize * 0.22)));
      tab.price.setY(Math.floor(tabSize * 0.3));
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

    const r = dragRadiusFn(this.state);
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

  private onBuyYield() {
    const zoneDef = this.activeZoneDef();
    if (buyYield(this.state, zoneDef.id)) {
      this.spawnFloat(this.btnYield.container.x, this.btnYield.container.y - 32, "Yield+1", COLOR_GAIN);
    }
  }

  private onBuyGrowth() {
    const zoneDef = this.activeZoneDef();
    if (buyGrowth(this.state, zoneDef.id)) {
      this.spawnFloat(this.btnGrowth.container.x, this.btnGrowth.container.y - 32, "Speed+1", COLOR_GAIN);
    }
  }

  private onBuyPrice() {
    const zoneDef = this.activeZoneDef();
    if (buyPrice(this.state, zoneDef.id)) {
      this.spawnFloat(this.btnPrice.container.x, this.btnPrice.container.y - 32, "Price+1", COLOR_GAIN);
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

    this.rateText.setText(`+${formatNumber(this.computeCoinsPerSec())}/s`);

    let firstLockedIdx = -1;
    for (let i = 0; i < ZONES.length; i++) {
      if (!this.state.zones[ZONES[i].id].unlocked) {
        firstLockedIdx = i;
        break;
      }
    }
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      const z = this.state.zones[tab.def.id];
      const showThis = z.unlocked || i === firstLockedIdx;
      tab.container.setVisible(showThis);
      if (!showThis) continue;
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

    const yieldVal = effectiveYield(zone.yieldLevel, this.state, now);
    const yieldStr = yieldVal > 1 ? ` x${yieldVal}` : "";
    this.titleText.setText(
      `${zoneDef.name.toUpperCase()}  basket ${formatNumber(zone.inventory)}${yieldStr}`,
    );

    let ripeCount = 0;
    const grow = effectiveGrowMs(zoneDef.growMs, zone.growthLevel, this.state, now);
    for (let i = 0; i < this.spots.length && i < zone.spots.length; i++) {
      const spot = zone.spots[i];
      const ripe = plotIsRipe(spot, grow, now);
      const progress = plotProgress(spot, grow, now);
      const key = !zone.unlocked
        ? "crop-empty"
        : pickCropSpriteKey(zoneDef.shape, progress, ripe);
      this.spots[i].sprite.setTexture(key);
      this.spots[i].sprite.setTint(zoneDef.tint);
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

    const priceMult = effectivePriceMult(zone.priceLevel, this.state, now);
    this.setButtonEnabled(this.btnSell, zone.inventory > 0 && zone.unlocked);
    this.setButtonBadge(
      this.btnSell,
      zone.inventory > 0 && zone.unlocked
        ? `${formatNumber(Math.floor(zone.inventory * zoneDef.sellPrice * priceMult))}`
        : "",
    );

    this.coinText.setText(formatNumber(this.state.coins));
    this.gemText.setText(formatNumber(this.state.gems));
    this.weatherText.setText(weatherLabel(this.state.weather.kind));

    if (this.menuOpen) this.refreshMenu();

    this.layout();
  }

  // ---------- Menu ----------

  private buildMenu() {
    this.menuOverlay = this.add.container(0, 0);
    this.menuOverlay.setVisible(false);
    this.menuOverlay.setDepth(100);

    const dim = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.7).setOrigin(0, 0);
    dim.setInteractive();
    dim.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
    });
    this.menuOverlay.add(dim);

    const panel = this.add.image(0, 0, "modal-bg").setOrigin(0, 0);
    this.menuOverlay.add(panel);
    (this.menuOverlay as Phaser.GameObjects.Container & { panel?: Phaser.GameObjects.Image }).panel = panel;
    (this.menuOverlay as Phaser.GameObjects.Container & { dim?: Phaser.GameObjects.Rectangle }).dim = dim;

    const title = this.add
      .text(0, 0, "MENU", {
        fontFamily: PIXEL_FONT,
        fontSize: "20px",
        color: "#e8f5d8",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    this.menuOverlay.add(title);
    (this.menuOverlay as any).title = title;

    const closeBtn = this.makeIconButton("X", "btn-bg-warn", () => this.toggleMenu());
    this.menuOverlay.add(closeBtn.container);
    (this.menuOverlay as any).closeBtn = closeBtn;

    const tabIds: MenuTab[] = ["upgrades", "greenhouse", "boosts", "shop"];
    const tabLabels: Record<MenuTab, string> = {
      upgrades: "FARM",
      greenhouse: "GHSE",
      boosts: "BOOST",
      shop: "SHOP",
    };
    for (const id of tabIds) {
      const c = this.add.container(0, 0);
      const bg = this.add.image(0, 0, "tab-bg").setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        this.menuTab = id;
        this.refreshMenu();
      });
      const label = this.add
        .text(0, 0, tabLabels[id], {
          fontFamily: PIXEL_FONT,
          fontSize: "12px",
          color: "#e8f5d8",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      c.add([bg, label]);
      this.menuOverlay.add(c);
      this.menuTabs.push({ id, container: c, bg, label });
    }

    this.menuRowsContainer = this.add.container(0, 0);
    this.menuOverlay.add(this.menuRowsContainer);
  }

  private toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuOverlay.setVisible(this.menuOpen);
    if (this.menuOpen) this.refreshMenu();
    this.layout();
  }

  private layoutMenu() {
    if (!this.menuOverlay) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const overlay = this.menuOverlay as any;
    overlay.dim.setSize(w, h);
    const panelMargin = 16;
    const panelW = w - panelMargin * 2;
    const panelH = h - panelMargin * 2;
    const panelX = panelMargin;
    const panelY = panelMargin;
    overlay.panel.setPosition(panelX, panelY).setDisplaySize(panelW, panelH);

    overlay.title.setPosition(panelX + panelW / 2, panelY + 10);

    const closeSize = 36;
    this.placeIconButton(overlay.closeBtn, panelX + panelW - closeSize / 2 - 8, panelY + 8 + closeSize / 2, closeSize);

    const tabsTop = panelY + 50;
    const tabsCount = this.menuTabs.length;
    const tabGap = 6;
    const tabW = Math.floor((panelW - 16 - (tabsCount - 1) * tabGap) / tabsCount);
    const tabH = 32;
    let tx = panelX + 8 + tabW / 2;
    for (const tab of this.menuTabs) {
      tab.container.setPosition(tx, tabsTop + tabH / 2);
      tab.bg.setDisplaySize(tabW, tabH);
      tab.bg.setTexture(tab.id === this.menuTab ? "tab-bg-active" : "tab-bg");
      tx += tabW + tabGap;
    }

    const rowsTop = tabsTop + tabH + 12;
    this.menuRowsContainer.setPosition(panelX + 8, rowsTop);
  }

  private refreshMenu() {
    if (!this.menuOpen) return;
    this.menuRowsContainer.removeAll(true);

    const w = this.scale.width;
    const panelW = w - 32 - 16;
    const rows: Array<{ name: string; desc: string; cost: string; canBuy: boolean; color: string; onBuy: () => void }> = [];

    if (this.menuTab === "upgrades") rows.push(...this.upgradeRows());
    else if (this.menuTab === "greenhouse") rows.push(...this.greenhouseRows());
    else if (this.menuTab === "boosts") rows.push(...this.boostRows());
    else if (this.menuTab === "shop") rows.push(...this.shopRows());

    let y = 0;
    const rowH = 56;
    for (const r of rows) {
      const c = this.add.container(0, y);
      const bg = this.add.image(0, 0, "tab-bg").setOrigin(0, 0);
      bg.setDisplaySize(panelW, rowH - 6);
      const name = this.add
        .text(10, 6, r.name, {
          fontFamily: PIXEL_FONT,
          fontSize: "13px",
          color: "#e8f5d8",
          fontStyle: "bold",
        })
        .setOrigin(0, 0);
      const desc = this.add
        .text(10, 24, r.desc, {
          fontFamily: PIXEL_FONT,
          fontSize: "10px",
          color: "#9ec79e",
        })
        .setOrigin(0, 0);
      const buyW = 80;
      const buyH = 36;
      const buyBg = this.add.image(panelW - buyW - 6, 6, r.canBuy ? "btn-bg-accent" : "btn-bg-disabled").setOrigin(0, 0);
      buyBg.setDisplaySize(buyW, buyH);
      buyBg.setInteractive({ useHandCursor: true });
      buyBg.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (!r.canBuy) return;
        r.onBuy();
        this.refreshMenu();
      });
      const costText = this.add
        .text(panelW - buyW / 2 - 6, 6 + buyH / 2, r.cost, {
          fontFamily: PIXEL_FONT,
          fontSize: "12px",
          color: r.color,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      c.add([bg, name, desc, buyBg, costText]);
      this.menuRowsContainer.add(c);
      y += rowH;
    }
  }

  private upgradeRows() {
    const z = this.activeZoneDef();
    const zs = this.state.zones[z.id];
    return [
      {
        name: `🚜 Cart  Lv${zs.cartLevel}`,
        desc: `+15% speed, +7% radius. New cart at L12, L24, L40.`,
        cost: formatNumber(cartCost(zs.cartLevel)),
        canBuy: this.state.coins >= cartCost(zs.cartLevel),
        color: "#ffe89a",
        onBuy: () => {
          if (buyCart(this.state, z.id)) this.rebuildCartViews();
        },
      },
      {
        name: `📦 Yield  Lv${zs.yieldLevel}/50`,
        desc: `+1 crop per harvested spot.`,
        cost: zs.yieldLevel >= 50 ? "MAX" : formatNumber(yieldCost(zs.yieldLevel)),
        canBuy: zs.yieldLevel < 50 && this.state.coins >= yieldCost(zs.yieldLevel),
        color: "#ffe89a",
        onBuy: () => {
          buyYield(this.state, z.id);
        },
      },
      {
        name: `⏱ Speed  Lv${zs.growthLevel}/30`,
        desc: `−3% grow time per level.`,
        cost: zs.growthLevel >= 30 ? "MAX" : formatNumber(growthCost(zs.growthLevel)),
        canBuy: zs.growthLevel < 30 && this.state.coins >= growthCost(zs.growthLevel),
        color: "#ffe89a",
        onBuy: () => {
          buyGrowth(this.state, z.id);
        },
      },
      {
        name: `💲 Price  Lv${zs.priceLevel}/50`,
        desc: `+5% sell price per level.`,
        cost: zs.priceLevel >= 50 ? "MAX" : formatNumber(priceCost(zs.priceLevel)),
        canBuy: zs.priceLevel < 50 && this.state.coins >= priceCost(zs.priceLevel),
        color: "#ffe89a",
        onBuy: () => {
          buyPrice(this.state, z.id);
        },
      },
      {
        name: `✋ Reach  Lv${this.state.dragRadiusLevel}/20`,
        desc: `Bigger drag radius for harvesting.`,
        cost: this.state.dragRadiusLevel >= 20 ? "MAX" : formatNumber(dragRadiusCost(this.state.dragRadiusLevel)),
        canBuy: this.state.dragRadiusLevel < 20 && this.state.coins >= dragRadiusCost(this.state.dragRadiusLevel),
        color: "#ffe89a",
        onBuy: () => {
          buyDragRadius(this.state);
        },
      },
    ];
  }

  private greenhouseRows() {
    return GREENHOUSE_ENTRIES.map((entry) => {
      const lvl = this.state.greenhouse[entry.id];
      const cost = entry.cost(lvl);
      const isMax = lvl >= entry.max;
      const canBuy =
        !isMax &&
        (entry.currency === "coins" ? this.state.coins >= cost : this.state.gems >= cost);
      const costStr = isMax
        ? "MAX"
        : entry.currency === "gems"
          ? `${formatNumber(cost)}💎`
          : formatNumber(cost);
      return {
        name: `${entry.name}  Lv${lvl}/${entry.max}`,
        desc: entry.description,
        cost: costStr,
        canBuy,
        color: entry.currency === "gems" ? "#a0f0f0" : "#ffe89a",
        onBuy: () => {
          buyGreenhouse(this.state, entry.id);
        },
      };
    });
  }

  private boostRows() {
    const inv = this.state.boostInventory;
    const types: Array<{ kind: BoostKind; emoji: string; name: string; desc: string }> = [
      { kind: "fertilizer", emoji: "🧪", name: "Super Fertilizer", desc: "+100% yield, 5 min" },
      { kind: "sunshine", emoji: "☀", name: "Sunshine", desc: "+100% growth speed, 5 min" },
      { kind: "market", emoji: "🏷", name: "Market Day", desc: "+100% sell price, 5 min" },
      { kind: "lucky", emoji: "🍀", name: "Lucky Day", desc: "+500% gem drop rate, 1 hour" },
    ];
    const rows = [];
    for (const t of types) {
      const owned = inv[t.kind];
      const cost = BOOST_GEM_COST[t.kind];
      rows.push({
        name: `${t.emoji} ${t.name}  x${owned}`,
        desc: t.desc,
        cost: owned > 0 ? "USE" : `${cost}💎`,
        canBuy: owned > 0 || this.state.gems >= cost,
        color: "#a0f0f0",
        onBuy: () => {
          if (owned > 0) {
            activateBoost(this.state, t.kind, Date.now());
          } else {
            buyBoostWithGems(this.state, t.kind);
          }
        },
      });
    }
    return rows;
  }

  private shopRows() {
    return GEM_SHOP_ITEMS.map((item) => {
      const owned = item.isOwned(this.state);
      const cost = gemShopItemCost(this.state, item.id);
      const canBuy = !owned && this.state.gems >= cost;
      let stateLabel = "";
      if (item.id === "gameSpeed") {
        const lvl = this.state.gemUpgrades.gameSpeed;
        stateLabel = ` (${lvl === 0 ? "1x" : lvl === 1 ? "1.5x" : "2x"})`;
      } else if (item.id === "luckyCharm") {
        stateLabel = ` (${this.state.gemUpgrades.luckyCharm}/3)`;
      } else if (item.id === "offlineCap") {
        stateLabel = ` (${this.state.gemUpgrades.offlineCapStacks}/3)`;
      } else if (item.isOwned(this.state)) {
        stateLabel = " (OWNED)";
      }
      return {
        name: `${item.name}${stateLabel}`,
        desc: item.description,
        cost: owned ? "OWNED" : `${formatNumber(cost)}💎`,
        canBuy,
        color: "#a0f0f0",
        onBuy: () => {
          buyGemShopItem(this.state, item.id);
        },
      };
    });
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
      const speed = cartSpeedFn(zone.cartLevel, this.state);
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
  if (n < 1_000_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  return (n / 1_000_000_000_000).toFixed(1) + "T";
}

function weatherLabel(kind: WeatherKind): string {
  switch (kind) {
    case "sunny":
      return "☀ sunny";
    case "rain":
      return "🌧 rain +25% growth";
    case "drought":
      return "🥵 drought -25% growth";
    case "festival":
      return "🎉 festival +30% sell";
    case "storm":
      return "⛈ storm";
  }
}
