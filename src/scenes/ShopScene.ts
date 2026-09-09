import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { ECONOMY } from '../data/balance';
import { describeStats, getItem, RARITY_COLORS, RARITY_LABEL, SHOP_CATALOG } from '../data/items';
import { audio } from '../systems/AudioSystem';
import { equipment } from '../systems/EquipmentSystem';
import { save } from '../systems/SaveSystem';
import type { ItemDef } from '../types';
import { drawBackground } from '../ui/Background';
import { Button } from '../ui/Button';
import { drawHeader, fadeIn, goTo, PlayerStrip } from '../ui/Hud';
import { Modal } from '../ui/Modal';
import { Panel } from '../ui/Panel';
import { toast } from '../ui/Toast';
import { DEPTH, hex, TEXT, textStyle } from '../ui/theme';

/** Village shop: fixed catalogue of equipment. */
export class ShopScene extends Phaser.Scene {
  private strip!: PlayerStrip;
  private cards: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super(SCENES.SHOP);
  }

  create(): void {
    drawBackground(this, 'village', { decorY: GAME_HEIGHT + 20, decorCount: 0, particles: 4 });
    fadeIn(this);
    drawHeader(this, 'Shop', () => goTo(this, SCENES.VILLAGE), 'Gear up before the next region');
    this.strip = new PlayerStrip(this, 150);
    this.render();
  }

  private render(): void {
    for (const c of this.cards) c.destroy();
    this.cards = [];
    this.strip.refresh();
    const cx = GAME_WIDTH / 2;
    this.cards.push(this.add.text(cx, 218, `Bag ${equipment.inventory.length} / ${ECONOMY.inventoryMax}   -   Sell items from the Equipment screen`, textStyle(20, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content));

    const cols = 2;
    const w = 330;
    const h = 236;
    const gapX = 16;
    const gapY = 16;
    const startX = cx - (w + gapX) / 2;
    const startY = 380;
    SHOP_CATALOG.forEach((id, i) => {
      const item = getItem(id);
      if (!item) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.cards.push(this.card(item, startX + col * (w + gapX), startY + row * (h + gapY), w, h));
    });
  }

  private card(item: ItemDef, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(DEPTH.content);
    c.add(new Panel(this, 0, 0, w, h, 'ui_panel2'));
    if (this.textures.exists(item.icon)) c.add(this.add.image(-w / 2 + 44, -h / 2 + 50, item.icon).setScale(3));
    c.add(this.add.text(-w / 2 + 84, -h / 2 + 34, item.name, textStyle(24, { color: hex(RARITY_COLORS[item.rarity]), align: 'left' })).setOrigin(0, 0.5));
    c.add(this.add.text(-w / 2 + 84, -h / 2 + 64, `${RARITY_LABEL[item.rarity]} ${item.slot}`, textStyle(17, { color: TEXT.muted, align: 'left' })).setOrigin(0, 0.5));
    c.add(this.add.text(-w / 2 + 22, -h / 2 + 92, describeStats(item).join('\n'), textStyle(18, { color: TEXT.light, align: 'left' })).setOrigin(0, 0));
    const owned = equipment.inventory.includes(item.id) || Object.values(equipment.equipped).includes(item.id);
    const canAfford = save.data.player.gold >= item.price;
    const btn = new Button(this, 0, h / 2 - 46, `${item.price} g`, () => this.confirmBuy(item), {
      width: w - 40, height: 68, fontSize: 24, icon: 'item_GoldCoin', iconScale: 3, disabled: !canAfford || equipment.isFull, color: canAfford ? TEXT.light : TEXT.red,
    });
    c.add(btn);
    if (owned) c.add(this.add.text(w / 2 - 16, -h / 2 + 16, 'owned', textStyle(15, { color: TEXT.green })).setOrigin(1, 0));
    return c;
  }

  private confirmBuy(item: ItemDef): void {
    new Modal(this, {
      title: `Buy ${item.name}?`,
      message: `${describeStats(item).join('\n')}\n\nPrice: ${item.price} gold\nYou have: ${save.data.player.gold} gold`,
      buttons: [
        {
          label: 'Buy',
          color: TEXT.gold,
          onClick: () => {
            if (equipment.buy(item.id)) {
              audio.play('coin');
              toast(this, `Bought ${item.name}!`, TEXT.green);
            } else {
              audio.play('cancel');
              toast(this, equipment.isFull ? 'Bag is full!' : 'Not enough gold', TEXT.red);
            }
            this.render();
          },
        },
        { label: 'Cancel' },
      ],
    });
  }
}
