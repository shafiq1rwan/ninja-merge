import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { RUN } from '../data/balance';
import { BOSSES } from '../data/bosses';
import { getRegion } from '../data/stages';
import { BattleBackdrop } from '../entities/BattleBackdrop';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import { DIFFICULTY_LABEL, runSystem } from '../systems/RunSystem';
import { Button } from '../ui/Button';
import { fadeIn, goTo } from '../ui/Hud';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from '../ui/theme';

export interface WaveIntroData {
  /** Kept for call-site compatibility; this scene is the dungeon intro card. */
  mode?: 'intro' | 'wave';
}

/**
 * Short, cinematic dungeon intro shown once when a run starts. Individual waves are announced by a
 * banner inside BattleScene instead, so the run flows wave -> wave without extra scene stops.
 */
export class WaveIntroScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super(SCENES.WAVE_INTRO);
  }

  init(): void {
    this.started = false;
  }

  create(): void {
    const run = runSystem.active;
    if (!run) {
      goTo(this, SCENES.WORLD_MAP);
      return;
    }
    const region = getRegion(run.dungeonId);
    new BattleBackdrop(this, region.theme);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setDepth(DEPTH.content);
    fadeIn(this, 150);
    audio.playMusic(region.music);

    const cx = GAME_WIDTH / 2;
    const bossDef = BOSSES[region.stages[5].enemyId];
    const bossKnown = runSystem.progressFor(region.id).bestWave >= RUN.waves;

    const title = this.add.text(cx, 430, heading(region.name), titleStyle(56, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud);
    const waves = this.add.text(cx, 510, `${RUN.waves} Waves   -   ${DIFFICULTY_LABEL[run.difficulty]}`, textStyle(30, { color: TEXT.light })).setOrigin(0.5).setDepth(DEPTH.hud);
    const boss = this.add.text(cx, 560, `Boss: ${bossKnown ? bossDef?.name ?? '???' : '???'}`, textStyle(26, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);
    const btn = new Button(this, cx, 700, 'BEGIN', () => this.begin(), { width: 360, height: 100, fontSize: 36, variant: 'primary' }).setDepth(DEPTH.hud);
    const hint = this.add.text(cx, 780, 'or tap anywhere', textStyle(20, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);

    // Staggered reveal so the card assembles instead of appearing flat.
    const rows: (Phaser.GameObjects.Text | Button)[] = [title, waves, boss, btn, hint];
    rows.forEach((o, i) => {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: effects.ms(200), delay: i * effects.ms(70), ease: 'Quad.easeOut' });
    });
    title.setScale(effects.pop(1.15));
    this.tweens.add({ targets: title, scale: 1, duration: effects.ms(280), ease: 'Back.easeOut' });

    this.input.once(Phaser.Input.Events.POINTER_UP, () => this.begin());
    this.input.keyboard?.once('keydown-ENTER', () => this.begin());
    this.input.keyboard?.once('keydown-SPACE', () => this.begin());
  }

  private begin(): void {
    if (this.started) return;
    this.started = true;
    goTo(this, SCENES.BATTLE, { run: true }, 140);
  }
}
