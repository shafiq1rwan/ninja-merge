import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { RUN } from '../data/balance';
import { BOSSES } from '../data/bosses';
import { ENEMIES } from '../data/enemies';
import { getRegion } from '../data/stages';
import { BattleBackdrop } from '../entities/BattleBackdrop';
import { audio } from '../systems/AudioSystem';
import { DIFFICULTY_LABEL, runSystem } from '../systems/RunSystem';
import { Button } from '../ui/Button';
import { fadeIn, goTo } from '../ui/Hud';
import { motion } from '../ui/motion';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from '../ui/theme';

export interface WaveIntroData {
  /** 'intro' when entering a dungeon (BEGIN button), 'wave' between waves (auto-continues). */
  mode: 'intro' | 'wave';
}

/**
 * Minimal cinematic card between the dungeon-select screen and a wave, and between waves.
 * Never shows the world map: the run flows Wave -> Wave -> Upgrade -> ... -> Boss.
 */
export class WaveIntroScene extends Phaser.Scene {
  private mode: WaveIntroData['mode'] = 'wave';
  private started = false;

  constructor() {
    super(SCENES.WAVE_INTRO);
  }

  init(data: WaveIntroData): void {
    this.mode = data?.mode ?? 'wave';
    this.started = false;
  }

  create(): void {
    const run = runSystem.active;
    const wave = runSystem.currentWave();
    if (!run || !wave) {
      goTo(this, SCENES.WORLD_MAP);
      return;
    }
    const region = getRegion(run.dungeonId);
    new BattleBackdrop(this, region.theme);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setDepth(DEPTH.content);
    fadeIn(this, 150);

    const cx = GAME_WIDTH / 2;
    const enemyDef = wave.kind === 'boss' ? BOSSES[wave.enemyId] : ENEMIES[wave.enemyId];
    const bossDef = BOSSES[region.stages[5].enemyId];

    if (this.mode === 'intro') {
      audio.playMusic(region.music);
      this.add.text(cx, 430, heading(region.name), titleStyle(56, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud);
      this.add.text(cx, 510, `${RUN.waves} Waves   -   ${DIFFICULTY_LABEL[run.difficulty]}`, textStyle(30, { color: TEXT.light })).setOrigin(0.5).setDepth(DEPTH.hud);
      this.add.text(cx, 560, `Boss: ${runSystem.progressFor(region.id).bestWave >= RUN.waves ? bossDef?.name ?? '???' : '???'}`, textStyle(26, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);
      new Button(this, cx, 700, 'BEGIN', () => this.begin(), { width: 360, height: 100, fontSize: 36, variant: 'primary' }).setDepth(DEPTH.hud);
      this.add.text(cx, 780, 'or tap anywhere', textStyle(20, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);
    } else {
      const kindLabel = wave.kind === 'boss' ? 'BOSS' : wave.kind === 'elite' ? 'ELITE' : '';
      this.add.text(cx, 440, heading(`Wave ${wave.wave} / ${wave.total}`), titleStyle(60, { color: wave.kind === 'boss' ? TEXT.red : TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud);
      const name = this.add.text(cx, 530, `${kindLabel ? kindLabel + '  ' : ''}${enemyDef?.name ?? '???'}`, textStyle(32, { color: kindLabel === 'ELITE' ? TEXT.purple : kindLabel === 'BOSS' ? TEXT.red : TEXT.light })).setOrigin(0.5).setDepth(DEPTH.hud);
      if (!motion.reduced) this.tweens.add({ targets: name, scale: { from: 1.15, to: 1 }, duration: 300, ease: 'Back.easeOut' });
      this.add.text(cx, 590, `HP ${run.hp}   -   ${region.name}   -   ${DIFFICULTY_LABEL[run.difficulty]}`, textStyle(22, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);
      if (wave.kind === 'boss') audio.play('alert');
      this.time.delayedCall(motion.reduced ? 900 : 1400, () => this.begin());
      this.add.text(cx, 700, 'tap to continue', textStyle(20, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud);
    }
    this.input.once(Phaser.Input.Events.POINTER_UP, () => this.begin());
    const key = () => this.begin();
    this.input.keyboard?.once('keydown-ENTER', key);
    this.input.keyboard?.once('keydown-SPACE', key);
  }

  private begin(): void {
    if (this.started) return;
    this.started = true;
    goTo(this, SCENES.BATTLE, { run: true }, 140);
  }
}
