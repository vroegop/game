import Phaser from "phaser";
import { ZONES, PLOTS_PER_ZONE, ZoneDef } from "../game/zones";
import {
  GameState,
  buyCart,
  cartCost,
  cartIntervalMs,
  harvestPlot,
  loadState,
  plotIsRipe,
  plotProgress,
  saveState,
  sellAll,
  tickCarts,
  unlockZone,
} from "../game/state";

interface PlotView {
  zoneId: string;
  plotIndex: number;
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface ZoneView {
  def: ZoneDef;
  container: Phaser.GameObjects.Container;
  plots: PlotView[];
  title: Phaser.GameObjects.Text;
  inventoryText: Phaser.GameObjects.Text;
  sellBtn: Phaser.GameObjects.Container;
  cartBtn: Phaser.GameObjects.Container;
  cartLabel: Phaser.GameObjects.Text;
  unlockOverlay: Phaser.GameObjects.Container | null;
}

const SAVE_INTERVAL_MS = 3_000;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private coinText!: Phaser.GameObjects.Text;
  private zoneViews: ZoneView[] = [];
  private lastSaveAt = 0;

  constructor() {
    super("game");
  }

  create() {
    this.state = loadState();
    this.lastSaveAt = this.time.now;

    const { width } = this.scale;

    this.add
      .text(width / 2, 32, "Idle Farm", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
        color: "#e8f5e8",
      })
      .setOrigin(0.5);

    this.coinText = this.add
      .text(width / 2, 70, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#ffd966",
      })
      .setOrigin(0.5);

    let y = 110;
    for (const def of ZONES) {
      const view = this.buildZoneView(def, y);
      this.zoneViews.push(view);
      y += 360;
    }

    this.refresh();

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

  private buildZoneView(def: ZoneDef, y: number): ZoneView {
    const { width } = this.scale;
    const container = this.add.container(0, y);

    const bg = this.add.rectangle(width / 2, 0, width - 24, 340, 0x122512, 1).setOrigin(0.5, 0);
    bg.setStrokeStyle(2, 0x2d5a2d);
    container.add(bg);

    const title = this.add
      .text(20, 14, def.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#bde0bd",
      })
      .setOrigin(0, 0);
    container.add(title);

    const inventoryText = this.add
      .text(width - 20, 14, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#e8f5e8",
      })
      .setOrigin(1, 0);
    container.add(inventoryText);

    const plots: PlotView[] = [];
    const plotSize = 80;
    const plotGap = 12;
    const totalW = PLOTS_PER_ZONE * plotSize + (PLOTS_PER_ZONE - 1) * plotGap;
    const startX = (width - totalW) / 2;

    for (let i = 0; i < PLOTS_PER_ZONE; i++) {
      const px = startX + i * (plotSize + plotGap);
      const py = 50;
      const plotBg = this.add.rectangle(px, py, plotSize, plotSize, 0x1f3a1f, 1).setOrigin(0, 0);
      plotBg.setStrokeStyle(2, 0x3a6a3a);
      const plotFill = this.add
        .rectangle(px + 4, py + plotSize - 4, plotSize - 8, 0, def.color, 1)
        .setOrigin(0, 1);
      const plotLabel = this.add
        .text(px + plotSize / 2, py + plotSize / 2, def.emoji, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "32px",
        })
        .setOrigin(0.5);

      plotBg.setInteractive({ useHandCursor: true });
      plotBg.on("pointerdown", () => this.onPlotTap(def.id, i));

      container.add([plotBg, plotFill, plotLabel]);
      plots.push({ zoneId: def.id, plotIndex: i, bg: plotBg, fill: plotFill, label: plotLabel });
    }

    const sellBtn = this.makeButton(width / 2 - 96, 160, 180, 48, "Sell All", 0x3a6a3a, () =>
      this.onSell(def.id),
    );
    container.add(sellBtn);

    const cartBtn = this.makeButton(width / 2 - 96, 220, 180, 48, "", 0x4a4a8a, () =>
      this.onBuyCart(def.id),
    );
    container.add(cartBtn);

    const cartLabel = this.add
      .text(width / 2, 290, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#a8c8a8",
      })
      .setOrigin(0.5);
    container.add(cartLabel);

    const view: ZoneView = {
      def,
      container,
      plots,
      title,
      inventoryText,
      sellBtn,
      cartBtn,
      cartLabel,
      unlockOverlay: null,
    };

    if (this.state.zones[def.id].unlocked === false) {
      const overlay = this.add.container(0, 0);
      const dim = this.add.rectangle(width / 2, 0, width - 24, 340, 0x000000, 0.7).setOrigin(0.5, 0);
      const lockText = this.add
        .text(width / 2, 130, `Locked\nUnlock for ${def.unlockCost} coins`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "18px",
          color: "#ffe0b3",
          align: "center",
        })
        .setOrigin(0.5);
      const unlockBtn = this.makeButton(width / 2 - 90, 200, 180, 48, "Unlock", 0xa66a00, () =>
        this.onUnlock(def.id),
      );
      overlay.add([dim, lockText, unlockBtn]);
      container.add(overlay);
      view.unlockOverlay = overlay;
    }

    return view;
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, color, 1).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0xffffff, 0.4);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => {
      bg.setFillStyle(color, 0.7);
      onClick();
    });
    bg.on("pointerup", () => bg.setFillStyle(color, 1));
    bg.on("pointerout", () => bg.setFillStyle(color, 1));
    const text = this.add
      .text(w / 2, h / 2, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    text.setData("label", true);
    c.add([bg, text]);
    return c;
  }

  private setButtonLabel(btn: Phaser.GameObjects.Container, label: string) {
    const text = btn.list.find((o) => (o as Phaser.GameObjects.Text).getData?.("label")) as
      | Phaser.GameObjects.Text
      | undefined;
    if (text) text.setText(label);
  }

  private onPlotTap(zoneId: string, plotIndex: number) {
    const now = Date.now();
    if (harvestPlot(this.state, zoneId, plotIndex, now)) {
      this.refresh();
    }
  }

  private onSell(zoneId: string) {
    sellAll(this.state, zoneId);
    this.refresh();
  }

  private onBuyCart(zoneId: string) {
    if (buyCart(this.state, zoneId)) {
      this.refresh();
    }
  }

  private onUnlock(zoneId: string) {
    if (unlockZone(this.state, zoneId)) {
      const view = this.zoneViews.find((v) => v.def.id === zoneId);
      if (view?.unlockOverlay) {
        view.unlockOverlay.destroy();
        view.unlockOverlay = null;
      }
      this.refresh();
    }
  }

  private refresh() {
    this.coinText.setText(`${Math.floor(this.state.coins)} coins`);
    const now = Date.now();
    for (const view of this.zoneViews) {
      const zone = this.state.zones[view.def.id];
      view.inventoryText.setText(`${zone.inventory} ${view.def.emoji}`);

      for (const pv of view.plots) {
        const plot = zone.plots[pv.plotIndex];
        const progress = plotProgress(plot, view.def.growMs, now);
        const targetH = (80 - 8) * progress;
        pv.fill.height = targetH;
        const ripe = plotIsRipe(plot, view.def.growMs, now);
        pv.label.setAlpha(ripe ? 1 : 0.35);
        pv.bg.setStrokeStyle(2, ripe ? 0xffe066 : 0x3a6a3a);
      }

      const cost = cartCost(zone.cartLevel);
      const intervalSec = (cartIntervalMs(zone.cartLevel + 1) / 1000).toFixed(1);
      this.setButtonLabel(view.cartBtn, `Buy Cart (${cost})`);
      if (zone.cartLevel === 0) {
        view.cartLabel.setText(`No cart — tap to harvest`);
      } else {
        const curSec = (cartIntervalMs(zone.cartLevel) / 1000).toFixed(1);
        view.cartLabel.setText(`Cart Lv ${zone.cartLevel} — auto every ${curSec}s (next: ${intervalSec}s)`);
      }
    }
  }
}
