import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { JUICE } from '../data/juice';
import { ParticleEffects } from '../effects/ParticleEffects';
import { RewardEffects } from '../effects/RewardEffects';
import { getRegion } from '../data/stages';
import { BattleBackdrop } from '../entities/BattleBackdrop';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { runSystem, type RunBuff } from '../systems/RunSystem';
import { Card } from '../ui/Card';
import { fadeIn, goTo } from '../ui/Hud';
import { toast } from '../ui/Toast';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from '../ui/theme';

/** Between-wave choice of one run-only blessing (three offered, revealed in sequence). */
export class RunUpgradeScene extends Phaser.Scene {
  private chosen = false;
  private particles!: ParticleEffects;
  private rewards!: RewardEffects;
  private cards: { container: Phaser.GameObjects.Container; buff: RunBuff; y: number }[] = [];

  constructor() {
    super(SCENES.RUN_UPGRADE);
  }

  create(): void {
    this.chosen = false;
    this.cards = [];
    const run = runSystem.active;
    if (!run) {
      goTo(this, SCENES.WORLD_MAP);
      return;
    }
    this.particles = new ParticleEffects(this, 12);
    this.rewards = new RewardEffects(this, this.particles);

    const region = getRegion(run.dungeonId);
    new BattleBackdrop(this, region.theme);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(DEPTH.content);
    fadeIn(this, 150);

    const cx = GAME_WIDTH / 2;
    const stats = runSystem.stats(progression.computeStats());
    const heading1 = this.add.text(cx, 130, heading('Choose a Blessing'), titleStyle(44, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud);
    this.add.text(cx, 190, `Wave ${run.wave - 1} cleared   -   HP ${run.hp} / ${stats.maxHp}   -   lasts for this run only`, textStyle(22, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);
    heading1.setScale(effects.pop(1.12));
    this.tweens.add({ targets: heading1, scale: 1, duration: effects.ms(260), ease: 'Back.easeOut' });

    const offers = runSystem.offerUpgrades();
    let top = 250;
    offers.forEach((buff, i) => {
      const card = new Card(this, { top, padding: 18, gap: 10, depth: DEPTH.hud });
      card.custom(84, (x, t, w) => {
        const objs: Phaser.GameObjects.GameObject[] = [];
        const left = x - w / 2;
        if (this.textures.exists(buff.icon)) objs.push(this.add.image(left + 40, t + 42, buff.icon).setScale(3.5));
        objs.push(this.add.text(left + 90, t + 6, buff.name, textStyle(28, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0));
        objs.push(this.add.text(left + 90, t + 44, buff.description, textStyle(20, { color: TEXT.light, align: 'left', wordWrapWidth: w - 100 })).setOrigin(0, 0));
        return objs;
      });
      card.button('Take', () => this.take(buff, i), { variant: 'primary', height: 72, fontSize: 26 });
      const container = card.finish();
      const centreY = top + card.height / 2;
      this.cards.push({ container, buff, y: centreY });

      // Sequential reveal: each option scales in 80ms after the previous one.
      if (!effects.reduced) {
        container.setAlpha(0);
        this.tweens.add({
          targets: container,
          alpha: 1,
          duration: effects.ms(180),
          delay: i * JUICE.upgrade.revealStaggerMs,
          ease: 'Quad.easeOut',
          onStart: () => audio.play('button', { volume: 0.4, detune: i * 120 }),
        });
      }
      top = card.bottom + 14;
    });
  }

  private async take(buff: RunBuff, index: number): Promise<void> {
    if (this.chosen) return;
    this.chosen = true;
    const healed = runSystem.applyUpgrade(buff.id, progression.computeStats());
    audio.play('upgradePick');

    // Selected option pops, the others fade back.
    const picked = this.cards[index];
    this.cards.forEach((c, i) => {
      if (i === index) return;
      this.tweens.add({ targets: c.container, alpha: 0.25, duration: effects.ms(200) });
    });
    if (picked && !effects.reduced) {
      this.tweens.add({ targets: picked.container, scale: effects.pop(1.04), duration: 110, yoyo: true, ease: 'Quad.easeOut' });
      this.particles.burst(GAME_WIDTH / 2, picked.y, { count: 10, color: 0xffd97a, size: 7, speed: 120 });
    }
    if (healed > 0) toast(this, `${buff.name}!  +${healed} HP`, TEXT.green, 120, 900);
    else toast(this, `${buff.name}!`, TEXT.green, 120, 900);

    // The blessing icon travels down to where the player HUD lives in battle.
    if (picked) await this.rewards.upgrade(buff.icon, { x: GAME_WIDTH / 2, y: picked.y }, { x: 120, y: GAME_HEIGHT - 120 });
    this.time.delayedCall(effects.ms(JUICE.upgrade.pickMs), () => goTo(this, SCENES.BATTLE, { run: true }, 140));
  }
}
