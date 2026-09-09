import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { ECONOMY } from '../data/balance';
import { describeStats, getItem, RARITY_COLORS, RARITY_LABEL, SHOP_CATALOG } from '../data/items';
import { audio } from '../systems/AudioSystem';
import { equipment } from '../systems/EquipmentSystem';
import { save } from '../systems/SaveSystem';
import type { ItemDef } from '../types';
import { drawBackground } from '../ui/Background';
import { Card } from '../ui/Card';
import { drawHeader, fadeIn, goTo, PlayerStrip } from '../ui/Hud';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { DEPTH, hex, TEXT, textStyle } from '../ui/theme';

/** Village shop: fixed catalogue of equipment laid out as a 2-column grid of cards. */
export class ShopScene extends Phaser.Scene {
  private strip!: PlayerStrip;
  private dynamic: Phaser.GameObjects.GameObject[] = [];

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
    for (const o of this.dynamic) o.destroy(true);
    this.dynamic = [];
    this.strip.refresh();
    this.dynamic.push(
      this.add.text(GAME_WIDTH / 2, 212, `Bag ${equipment.inventory.length} / ${ECONOMY.inventoryMax}   -   sell items from the Equipment screen`, textStyle(19, { color: TEXT.muted }))
        .setOrigin(0.5).setDepth(DEPTH.content),
    );

    const cols = 2;
    const gap = 12;
    const w = (GAME_WIDTH - 48 - gap) / cols;
    let top = 242;
    for (let row = 0; row < Math.ceil(SHOP_CATALOG.length / cols); row++) {
      let rowBottom = top;
      for (let col = 0; col < cols; col++) {
        const item = getItem(SHOP_CATALOG[row * cols + col] ?? '');
        if (!item) continue;
        const x = 24 + w / 2 + col * (w + gap);
        const card = this.itemCard(item, x, top, w);
        rowBottom = Math.max(rowBottom, card.bottom);
      }
      top = rowBottom + gap;
    }
  }

  private itemCard(item: ItemDef, x: number, top: number, width: number): Card {
    const owned = equipment.inventory.includes(item.id) || Object.values(equipment.equipped).includes(item.id);
    const canAfford = save.data.player.gold >= item.price;
    const card = new Card(this, { x, width, top, padding: 14, gap: 8 });
    card.custom(54, (cx, t, w) => {
      const objs: Phaser.GameObjects.GameObject[] = [];
      const left = cx - w / 2;
      if (this.textures.exists(item.icon)) objs.push(this.add.image(left + 24, t + 27, item.icon).setScale(2.6));
      objs.push(this.add.text(left + 56, t + 2, item.name, textStyle(22, { color: hex(RARITY_COLORS[item.rarity]), align: 'left', wordWrapWidth: w - 60 })).setOrigin(0, 0));
      objs.push(this.add.text(left + 56, t + 32, `${RARITY_LABEL[item.rarity]} ${item.slot}${owned ? '  -  owned' : ''}`, textStyle(16, { color: owned ? TEXT.green : TEXT.muted, align: 'left' })).setOrigin(0, 0));
      return objs;
    });
    card.custom(44, (cx, t, w) => [
      this.add.text(cx - w / 2, t, describeStats(item).join('   '), textStyle(17, { color: TEXT.light, align: 'left', wordWrapWidth: w })).setOrigin(0, 0),
    ]);
    card.button(`${item.price} gold`, () => this.confirmBuy(item), {
      height: 68, fontSize: 24, icon: 'item_GoldCoin', iconScale: 3, variant: canAfford ? 'primary' : 'secondary', disabled: !canAfford || equipment.isFull,
    });
    this.dynamic.push(card.finish());
    return card;
  }

  private confirmBuy(item: ItemDef): void {
    new Modal(this, {
      title: `Buy ${item.name}?`,
      message: `${describeStats(item).join('\n')}\n\nPrice: ${item.price} gold\nYou have: ${save.data.player.gold} gold`,
      buttons: [
        {
          label: 'Buy',
          variant: 'primary',
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
