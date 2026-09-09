import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { JUICE } from '../data/juice';
import { effects } from '../settings/EffectsSettings';
import { DEPTH, heading, TEXT, titleStyle } from './theme';

/**
 * COMBO x2 / x3 / NINJA COMBO! readout for multi-merge swipes. One reused text object - it never
 * changes the rest of the screen, it just escalates in size and colour.
 */
export class ComboIndicator {
  private scene: Phaser.Scene;
  private label: Phaser.GameObjects.Text;
  private sub: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, y: number) {
    this.scene = scene;
    this.label = scene.add.text(GAME_WIDTH / 2, y, '', titleStyle(38, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.floating).setAlpha(0);
    this.sub = scene.add.text(GAME_WIDTH / 2, y + 34, '', titleStyle(20, { color: TEXT.light })).setOrigin(0.5).setDepth(DEPTH.floating).setAlpha(0);
  }

  /** Show the combo for `merges` simultaneous merges at `mult` total multiplier. */
  show(merges: number, mult: number): void {
    if (merges < 2) return;
    const big = merges >= 4;
    const size = big ? 46 : merges === 3 ? 42 : 38;
    const color = big ? TEXT.red : merges === 3 ? TEXT.gold : TEXT.light;
    this.label.setStyle(titleStyle(size, { color }));
    this.label.setText(heading(big ? 'NINJA COMBO!' : `COMBO x${merges}`));
    this.sub.setText(`${mult.toFixed(2)}x damage`);

    this.scene.tweens.killTweensOf([this.label, this.sub]);
    for (const o of [this.label, this.sub]) o.setAlpha(1);
    this.label.setScale(effects.pop(big ? 1.35 : 1.2));
    this.scene.tweens.add({ targets: this.label, scale: 1, duration: effects.ms(180), ease: 'Back.easeOut' });
    const hold = effects.ms(JUICE.combo.showMs);
    this.scene.tweens.add({ targets: [this.label, this.sub], alpha: 0, delay: hold, duration: 200 });
  }
}
