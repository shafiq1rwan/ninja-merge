import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { getRegion } from '../data/stages';
import { BattleBackdrop } from '../entities/BattleBackdrop';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { runSystem, type RunBuff } from '../systems/RunSystem';
import { Card } from '../ui/Card';
import { fadeIn, goTo } from '../ui/Hud';
import { toast } from '../ui/Toast';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from '../ui/theme';

/** Between-wave choice of one run-only blessing (three offered). */
export class RunUpgradeScene extends Phaser.Scene {
  private chosen = false;

  constructor() {
    super(SCENES.RUN_UPGRADE);
  }

  create(): void {
    this.chosen = false;
    const run = runSystem.active;
    if (!run) {
      goTo(this, SCENES.WORLD_MAP);
      return;
    }
    const region = getRegion(run.dungeonId);
    new BattleBackdrop(this, region.theme);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(DEPTH.content);
    fadeIn(this, 150);

    const cx = GAME_WIDTH / 2;
    const stats = runSystem.stats(progression.computeStats());
    this.add.text(cx, 130, heading('Choose a Blessing'), titleStyle(44, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud);
    this.add.text(cx, 190, `Wave ${run.wave - 1} cleared   -   HP ${run.hp} / ${stats.maxHp}   -   lasts for this run only`, textStyle(22, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);

    const offers = runSystem.offerUpgrades();
    let top = 250;
    for (const buff of offers) {
      const card = new Card(this, { top, padding: 18, gap: 10, depth: DEPTH.hud });
      card.custom(84, (x, t, w) => {
        const objs: Phaser.GameObjects.GameObject[] = [];
        const left = x - w / 2;
        if (this.textures.exists(buff.icon)) objs.push(this.add.image(left + 40, t + 42, buff.icon).setScale(3.5));
        objs.push(this.add.text(left + 90, t + 6, buff.name, textStyle(28, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0));
        objs.push(this.add.text(left + 90, t + 44, buff.description, textStyle(20, { color: TEXT.light, align: 'left', wordWrapWidth: w - 100 })).setOrigin(0, 0));
        return objs;
      });
      card.button('Take', () => this.take(buff), { variant: 'primary', height: 72, fontSize: 26 });
      card.finish();
      top = card.bottom + 14;
    }
  }

  private take(buff: RunBuff): void {
    if (this.chosen) return;
    this.chosen = true;
    const healed = runSystem.applyUpgrade(buff.id, progression.computeStats());
    audio.play(healed > 0 ? 'heal' : 'powerup');
    toast(this, healed > 0 ? `${buff.name}!  +${healed} HP` : `${buff.name}!`, TEXT.green, 120, 900);
    this.time.delayedCall(650, () => goTo(this, SCENES.WAVE_INTRO, { mode: 'wave' }));
  }
}
