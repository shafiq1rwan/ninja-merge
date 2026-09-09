import Phaser from 'phaser';
import { GAME_WIDTH, IS_DEV } from '../config/gameConfig';
import { textStyle } from '../ui/theme';

export interface DebugApi {
  spawnRank: (rank: number) => void;
  spawnSpecial: (kind: 'potion' | 'bomb' | 'blocked') => void;
  startBoss: () => void;
  addGold: (n: number) => void;
  heal: () => void;
  damageEnemy: (n: number) => void;
  killPlayer: () => void;
}

/**
 * Development-only keyboard cheats for the battle scene. `installDebugKeys` is only called behind
 * `if (IS_DEV)`, and IS_DEV is a compile-time constant, so this code is dropped from production builds.
 *
 *  1-9  spawn a ninja of that rank        0  spawn rank 10
 *  P    spawn potion      O  spawn bomb   L  spawn locked tile
 *  B    jump to the region boss           G  +1000 gold
 *  H    full heal                          K  50 damage to enemy
 *  X    instant defeat (test defeat flow)
 */
export function installDebugKeys(scene: Phaser.Scene, api: DebugApi): void {
  if (!IS_DEV) return;
  const handler = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) api.spawnRank(parseInt(k, 10));
    else if (k === '0') api.spawnRank(10);
    else if (k === 'p' || k === 'P') api.spawnSpecial('potion');
    else if (k === 'o' || k === 'O') api.spawnSpecial('bomb');
    else if (k === 'l' || k === 'L') api.spawnSpecial('blocked');
    else if (k === 'b' || k === 'B') api.startBoss();
    else if (k === 'g' || k === 'G') api.addGold(1000);
    else if (k === 'h' || k === 'H') api.heal();
    else if (k === 'k' || k === 'K') api.damageEnemy(50);
    else if (k === 'x' || k === 'X') api.killPlayer();
  };
  window.addEventListener('keydown', handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', handler));
  scene.add.text(GAME_WIDTH - 12, 70, 'DEBUG  1-9 spawn  P/O/L special  B boss  G gold  H heal  K hit  X die', textStyle(14, { color: '#ff8a5b' }))
    .setOrigin(1, 0).setDepth(200).setAlpha(0.8);
}
