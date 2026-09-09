import Phaser from 'phaser';
import { GAME_HEIGHT, SCENES } from '../config/gameConfig';
import { ECONOMY } from '../data/balance';
import { describeStats, getItem, RARITY_COLORS, RARITY_LABEL } from '../data/items';
import { audio } from '../systems/AudioSystem';
import { equipment } from '../systems/EquipmentSystem';
import type { EquipSlot, ItemDef } from '../types';
import { drawBackground } from '../ui/Background';
import { Card } from '../ui/Card';
import { drawHeader, goTo, fadeIn, PlayerStrip } from '../ui/Hud';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { COLORS, hex, TEXT, textStyle } from '../ui/theme';

const SLOTS: { slot: EquipSlot; label: string; icon: string }[] = [
  { slot: 'weapon', label: 'Weapon', icon: 'item_Katana' },
  { slot: 'armor', label: 'Armor', icon: 'icon_Armor' },
  { slot: 'accessory', label: 'Accessory', icon: 'icon_Amulet' },
];

/** Three equipment slots + a 20-slot bag. Tap an item for details / equip / sell. */
export class EquipmentScene extends Phaser.Scene {
  private strip!: PlayerStrip;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super(SCENES.EQUIPMENT);
  }

  create(): void {
    drawBackground(this, 'village', { decorY: GAME_HEIGHT + 20, decorCount: 0, particles: 4 });
    fadeIn(this);
    drawHeader(this, 'Equipment', () => goTo(this, SCENES.VILLAGE), 'Tap an item to equip or sell');
    this.strip = new PlayerStrip(this, 150);
    this.render();
  }

  private render(): void {
    for (const c of this.cards) c.destroy(true);
    this.cards = [];
    this.strip.refresh();

    // Equipped slots
    const equipped = new Card(this, { top: 210, padding: 20, gap: 10 });
    equipped.text('Equipped', 26, { color: TEXT.gold });
    equipped.custom(180, (cx, top, w) => {
      const objs: Phaser.GameObjects.GameObject[] = [];
      const slotW = (w - 24) / 3;
      SLOTS.forEach((s, i) => {
        const x = cx - w / 2 + slotW / 2 + i * (slotW + 12);
        const id = equipment.equipped[s.slot];
        const item = id ? getItem(id) : undefined;
        objs.push(...this.slotCard(x, top + 90, slotW, 180, s.label, s.icon, item, () => this.openEquipped(s.slot, item)));
      });
      return objs;
    });
    this.cards.push(equipped.finish());

    // Bag
    const count = equipment.inventory.length;
    const cols = 4;
    const rows = ECONOMY.inventoryMax / cols;
    const cell = 118;
    const gap = 12;
    const bag = new Card(this, { top: equipped.bottom + 14, padding: 20, gap: 10 });
    bag.text(`Bag  ${count} / ${ECONOMY.inventoryMax}`, 26, { color: TEXT.gold });
    bag.custom(rows * (cell + gap) - gap, (cx, top) => {
      const objs: Phaser.GameObjects.GameObject[] = [];
      const startX = cx - ((cols - 1) * (cell + gap)) / 2;
      for (let i = 0; i < ECONOMY.inventoryMax; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const id = equipment.inventory[i];
        const item = id ? getItem(id) : undefined;
        objs.push(this.bagCell(startX + col * (cell + gap), top + cell / 2 + row * (cell + gap), cell, item, i));
      }
      return objs;
    });
    this.cards.push(bag.finish());
  }

  private slotCard(x: number, y: number, w: number, h: number, label: string, fallbackIcon: string, item: ItemDef | undefined, onClick: () => void): Phaser.GameObjects.GameObject[] {
    const border = item ? RARITY_COLORS[item.rarity] : COLORS.wood;
    const bg = this.add.rectangle(x, y, w, h, COLORS.ink, 0.6).setStrokeStyle(3, border);
    const labelText = this.add.text(x, y - h / 2 + 18, label, textStyle(20, { color: TEXT.muted })).setOrigin(0.5);
    const iconKey = item && this.textures.exists(item.icon) ? item.icon : fallbackIcon;
    const icon = this.add.image(x, y - 6, iconKey).setScale(item ? 3.4 : 3);
    if (!item) icon.setAlpha(0.3);
    const name = this.add.text(x, y + h / 2 - 26, item ? item.name : 'Empty', textStyle(18, { color: item ? hex(RARITY_COLORS[item.rarity]) : TEXT.muted, wordWrapWidth: w - 12 })).setOrigin(0.5);
    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: !!item });
    hit.on(Phaser.Input.Events.POINTER_UP, () => { if (item) { audio.play('button'); onClick(); } });
    return [bg, labelText, icon, name, hit];
  }

  private bagCell(x: number, y: number, size: number, item: ItemDef | undefined, index: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, size, size, COLORS.ink, 0.6).setStrokeStyle(3, item ? RARITY_COLORS[item.rarity] : COLORS.wood);
    c.add(bg);
    if (item) {
      if (this.textures.exists(item.icon)) c.add(this.add.image(0, -10, item.icon).setScale(3));
      c.add(this.add.text(0, size / 2 - 16, item.name, textStyle(14, { color: TEXT.light, wordWrapWidth: size - 8 })).setOrigin(0.5));
      const hit = this.add.rectangle(0, 0, size, size, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.POINTER_UP, () => { audio.play('button'); this.openItem(item, index); });
      c.add(hit);
    }
    return c;
  }

  private itemDetails(item: ItemDef): string {
    return [`${RARITY_LABEL[item.rarity]} ${item.slot}`, ...describeStats(item), '', item.description].join('\n');
  }

  private openItem(item: ItemDef, index: number): void {
    const currentId = equipment.equipped[item.slot];
    const current = currentId ? getItem(currentId) : undefined;
    const compare = current ? `\n\nReplaces: ${current.name}` : '';
    new Modal(this, {
      title: item.name,
      message: this.itemDetails(item) + compare,
      buttons: [
        { label: 'Equip', variant: 'primary', onClick: () => { equipment.equip(index); audio.play('powerup'); toast(this, `Equipped ${item.name}`, TEXT.green); this.render(); } },
        { label: `Sell for ${equipment.sellPrice(item.id)} gold`, onClick: () => { const g = equipment.sell(index); audio.play('coin'); toast(this, `Sold for ${g} gold`, TEXT.gold); this.render(); } },
        { label: 'Close' },
      ],
    });
  }

  private openEquipped(slot: EquipSlot, item: ItemDef | undefined): void {
    if (!item) return;
    new Modal(this, {
      title: item.name,
      message: this.itemDetails(item),
      buttons: [
        {
          label: 'Unequip',
          variant: 'primary',
          onClick: () => {
            if (!equipment.unequip(slot)) toast(this, 'Bag is full!', TEXT.red);
            this.render();
          },
        },
        { label: 'Close' },
      ],
    });
  }
}
