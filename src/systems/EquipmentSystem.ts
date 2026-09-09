import { ECONOMY } from '../data/balance';
import { getItem } from '../data/items';
import type { EquipSlot, ItemStats } from '../types';
import { save } from './SaveSystem';

/** Simple inventory: unequipped item ids in `inventory`, one item id per slot in `equipped`. */
export class EquipmentSystem {
  get inventory(): string[] {
    return save.data.inventory;
  }

  get equipped(): Record<EquipSlot, string | null> {
    return save.data.equipped;
  }

  get isFull(): boolean {
    return this.inventory.length >= ECONOMY.inventoryMax;
  }

  /** Add an item to the bag. Returns false when the bag is full. */
  addItem(itemId: string, persist = true): boolean {
    if (!getItem(itemId) || this.isFull) return false;
    this.inventory.push(itemId);
    if (persist) save.persist();
    return true;
  }

  /** Equip the item at inventory index; swaps out whatever occupied the slot. */
  equip(index: number): boolean {
    const id = this.inventory[index];
    const def = id ? getItem(id) : undefined;
    if (!def) return false;
    const previous = this.equipped[def.slot];
    this.inventory.splice(index, 1);
    this.equipped[def.slot] = id;
    if (previous) this.inventory.push(previous);
    save.persist();
    return true;
  }

  unequip(slot: EquipSlot): boolean {
    const id = this.equipped[slot];
    if (!id || this.isFull) return false;
    this.equipped[slot] = null;
    this.inventory.push(id);
    save.persist();
    return true;
  }

  sellPrice(itemId: string): number {
    const def = getItem(itemId);
    return def ? Math.round(def.price * ECONOMY.sellRatio) : 0;
  }

  /** Sell from inventory; returns gold gained (0 if invalid). */
  sell(index: number): number {
    const id = this.inventory[index];
    if (!id) return 0;
    const gold = this.sellPrice(id);
    this.inventory.splice(index, 1);
    save.data.player.gold += gold;
    save.persist();
    return gold;
  }

  /** Buy from the shop. Returns false when gold is short or the bag is full. */
  buy(itemId: string): boolean {
    const def = getItem(itemId);
    if (!def || this.isFull || save.data.player.gold < def.price) return false;
    save.data.player.gold -= def.price;
    this.inventory.push(itemId);
    save.persist();
    return true;
  }

  /** Sum of all equipped item stats. */
  totals(): Required<ItemStats> {
    const t: Required<ItemStats> = { attack: 0, hp: 0, defense: 0, crit: 0, goldBonus: 0, xpBonus: 0 };
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      const id = this.equipped[slot];
      const def = id ? getItem(id) : undefined;
      if (!def) continue;
      t.attack += def.stats.attack ?? 0;
      t.hp += def.stats.hp ?? 0;
      t.defense += def.stats.defense ?? 0;
      t.crit += def.stats.crit ?? 0;
      t.goldBonus += def.stats.goldBonus ?? 0;
      t.xpBonus += def.stats.xpBonus ?? 0;
    }
    return t;
  }
}

export const equipment = new EquipmentSystem();
