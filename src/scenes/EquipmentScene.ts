import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { ECONOMY } from '../data/balance';
import { describeStats, getItem, RARITY_COLORS, RARITY_LABEL } from '../data/items';
import { audio } from '../systems/AudioSystem';
import { equipment } from '../systems/EquipmentSystem';
import type { EquipSlot, ItemDef } from '../types';
import { drawBackground } from '../ui/Background';
import { drawHeader, goTo, fadeIn, PlayerStrip } from '../ui/Hud';
import { Modal } from '../ui/Modal';
import { Panel } from '../ui/Panel';
import { toast } from '../ui/Toast';
import { COLORS, DEPTH, hex, TEXT, textStyle } from '../ui/theme';

const SLOTS: { slot: EquipSlot; label: string; icon: string }[] = [
  { slot: 'weapon', label: 'Weapon', icon: 'item_Katana' },
  { slot: 'armor', label: 'Armor', icon: 'icon_Armor' },
  { slot: 'accessory', label: 'Accessory', icon: 'icon_Amulet' },
];

/** Three equipment slots + a 20-slot bag. Tap an item for details / equip / sell. */
export class EquipmentScene extends Phaser.Scene {
  private strip!: PlayerStrip;
  private dynamic: Phaser.GameObjects.GameObject[] = [];

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

  private clearDynamic(): void {
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
  }

  private render(): void {
    this.clearDynamic();
    this.strip.refresh();
    const cx = GAME_WIDTH / 2;

    // Slots
    this.dynamic.push(this.add.text(cx, 220, 'Equipped', textStyle(30, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.content));
    SLOTS.forEach((s, i) => {
      const x = cx + (i - 1) * 220;
      const y = 330;
      const id = equipment.equipped[s.slot];
      const item = id ? getItem(id) : undefined;
      this.dynamic.push(this.slotCard(x, y, s.label, s.icon, item, () => this.openEquipped(s.slot, item)));
    });

    // Bag
    const count = equipment.inventory.length;
    this.dynamic.push(this.add.text(cx, 470, `Bag  ${count} / ${ECONOMY.inventoryMax}`, textStyle(30, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.content));
    const cols = 4;
    const cell = 130;
    const gap = 14;
    const startX = cx - ((cols - 1) * (cell + gap)) / 2;
    const startY = 560;
    for (let i = 0; i < ECONOMY.inventoryMax; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cell + gap);
      const y = startY + row * (cell + gap);
      const id = equipment.inventory[i];
      const item = id ? getItem(id) : undefined;
      this.dynamic.push(this.bagCell(x, y, cell, item, i));
    }
  }

  private slotCard(x: number, y: number, label: string, fallbackIcon: string, item: ItemDef | undefined, onClick: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(DEPTH.content);
    c.add(new Panel(this, 0, 0, 200, 190, 'ui_panel2'));
    c.add(this.add.text(0, -70, label, textStyle(22, { color: TEXT.muted })).setOrigin(0.5));
    const iconKey = item && this.textures.exists(item.icon) ? item.icon : fallbackIcon;
    const icon = this.add.image(0, -14, iconKey).setScale(item ? 3.5 : 3);
    if (!item) icon.setAlpha(0.35);
    c.add(icon);
    c.add(this.add.text(0, 52, item ? item.name : 'Empty', textStyle(20, { color: item ? hex(RARITY_COLORS[item.rarity]) : TEXT.muted, wordWrapWidth: 180 })).setOrigin(0.5));
    const hit = this.add.rectangle(0, 0, 200, 190, 0xffffff, 0).setInteractive({ useHandCursor: !!item });
    hit.on(Phaser.Input.Events.POINTER_UP, () => { if (item) { audio.play('button'); onClick(); } });
    c.add(hit);
    return c;
  }

  private bagCell(x: number, y: number, size: number, item: ItemDef | undefined, index: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(DEPTH.content);
    const bg = this.add.rectangle(0, 0, size, size, COLORS.woodDark, 0.9).setStrokeStyle(4, item ? RARITY_COLORS[item.rarity] : COLORS.wood);
    c.add(bg);
    if (item) {
      if (this.textures.exists(item.icon)) c.add(this.add.image(0, -10, item.icon).setScale(3.2));
      c.add(this.add.text(0, size / 2 - 18, item.name, textStyle(15, { color: TEXT.light, wordWrapWidth: size - 8 })).setOrigin(0.5));
      const hit = this.add.rectangle(0, 0, size, size, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.POINTER_UP, () => { audio.play('button'); this.openItem(item, index); });
      c.add(hit);
    }
    return c;
  }

  private itemDetails(item: ItemDef): string {
    const lines = [`${RARITY_LABEL[item.rarity]} ${item.slot}`, ...describeStats(item), '', item.description];
    return lines.join('\n');
  }

  private openItem(item: ItemDef, index: number): void {
    const currentId = equipment.equipped[item.slot];
    const current = currentId ? getItem(currentId) : undefined;
    const compare = current ? `\n\nReplaces: ${current.name}` : '';
    new Modal(this, {
      title: item.name,
      message: this.itemDetails(item) + compare,
      buttons: [
        { label: 'Equip', color: TEXT.gold, onClick: () => { equipment.equip(index); audio.play('powerup'); toast(this, `Equipped ${item.name}`, TEXT.green); this.render(); } },
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
          color: TEXT.gold,
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
