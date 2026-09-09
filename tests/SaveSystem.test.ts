import { describe, expect, it } from 'vitest';
import { SaveSystem, SAVE_VERSION, defaultSave } from '../src/systems/SaveSystem';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, v); }
}

describe('SaveSystem', () => {
  it('round-trips through storage', () => {
    const storage = new MemoryStorage();
    const a = new SaveSystem(storage);
    a.data.player.gold = 777;
    a.data.completedStages.push('forest_1');
    a.persist();
    const b = new SaveSystem(storage);
    expect(b.load()).toBe(true);
    expect(b.data.player.gold).toBe(777);
    expect(b.data.completedStages).toEqual(['forest_1']);
  });

  it('fills missing fields from defaults on import', () => {
    const partial = JSON.stringify({ saveVersion: SAVE_VERSION, player: { gold: 5 } });
    const data = SaveSystem.parse(partial);
    expect(data.player.gold).toBe(5);
    expect(data.player.level).toBe(1);
    expect(data.settings.musicVolume).toBe(defaultSave().settings.musicVolume);
    expect(data.unlockedStages.length).toBeGreaterThan(0);
  });

  it('rejects saves from a newer version or garbage', () => {
    expect(() => SaveSystem.parse(JSON.stringify({ saveVersion: SAVE_VERSION + 1 }))).toThrow();
    expect(() => SaveSystem.parse('not json')).toThrow();
    expect(() => SaveSystem.parse('42')).toThrow();
  });

  it('reset restores defaults', () => {
    const s = new SaveSystem(new MemoryStorage());
    s.data.player.gold = 100;
    s.reset();
    expect(s.data.player.gold).toBe(0);
  });
});
