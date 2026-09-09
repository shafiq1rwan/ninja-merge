import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MIN_TOUCH, SCENES } from '../config/gameConfig';
import { RUN } from '../data/balance';
import { BOSSES } from '../data/bosses';
import { previousRegion, REGIONS, regionStars } from '../data/stages';
import { DungeonPreview, drawDungeonAtmosphere, PREVIEW_H, PREVIEW_W } from '../entities/DungeonPreview';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { DIFFICULTIES, DIFFICULTY_LABEL, runSystem } from '../systems/RunSystem';
import { save, type RunDifficulty } from '../systems/SaveSystem';
import type { RegionDef } from '../types';
import { Button } from '../ui/Button';
import { fadeIn, goTo } from '../ui/Hud';
import { confirmModal } from '../ui/Modal';
import { motion } from '../ui/motion';
import { COLORS, DEPTH, heading, TEXT, textStyle, titleStyle } from '../ui/theme';

/** Vertical layout (720x1280). Everything fits on one screen - no scrolling. */
const Y = {
  title: 100,
  name: 200,
  preview: 254,
  info: PREVIEW_H + 254 + 24, // 710
  dots: 890,
  enter: 972,
  back: 1100,
};
const CARD_SPACING = PREVIEW_W + 72;

/**
 * Dungeon Select: a horizontal carousel of dungeons (one large, neighbours peeking in at the edges),
 * compact run info, difficulty selector, progression dots and a single primary ENTER action.
 */
export class WorldMapScene extends Phaser.Scene {
  private index = 0;
  private difficulty: RunDifficulty = 'normal';
  private cards: Phaser.GameObjects.Container[] = [];
  private atmosphere?: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private infoObjects: Phaser.GameObjects.GameObject[] = [];
  private dots!: Phaser.GameObjects.Graphics;
  private animating = false;
  private swipeStartX: number | null = null;

  constructor() {
    super(SCENES.WORLD_MAP);
  }

  create(): void {
    // Phaser reuses scene instances: reset per-visit state so stale objects never leak into the layout.
    this.cards = [];
    this.infoObjects = [];
    this.animating = false;
    this.swipeStartX = null;
    fadeIn(this);
    audio.playMusic('music_worldmap');
    const active = runSystem.active;
    const startId = active?.dungeonId ?? runSystem.suggestedDungeonId();
    this.index = Math.max(0, REGIONS.findIndex((r) => r.id === startId));
    this.difficulty = active?.difficulty ?? 'normal';

    this.atmosphere = drawDungeonAtmosphere(this, REGIONS[this.index], GAME_WIDTH, GAME_HEIGHT, DEPTH.background);
    this.drawHeader();

    // Carousel cards
    REGIONS.forEach((region, i) => {
      const card = new DungeonPreview(this, 0, Y.preview, region, { locked: !runSystem.isUnlocked(region.id), cleared: runSystem.progressFor(region.id).cleared });
      card.setDepth(DEPTH.content);
      this.cards.push(card);
    });
    this.layoutCards(false);

    // Name row with arrows
    this.nameText = this.add.text(GAME_WIDTH / 2, Y.name, '', titleStyle(40, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud);
    new Button(this, 64, Y.name, '<', () => this.step(-1), { width: MIN_TOUCH, height: MIN_TOUCH, fontSize: 34 }).setDepth(DEPTH.hud);
    new Button(this, GAME_WIDTH - 64, Y.name, '>', () => this.step(1), { width: MIN_TOUCH, height: MIN_TOUCH, fontSize: 34 }).setDepth(DEPTH.hud);

    this.dots = this.add.graphics().setDepth(DEPTH.hud);
    new Button(this, GAME_WIDTH / 2, Y.back, 'Back to Village', () => goTo(this, SCENES.VILLAGE), { width: 360, height: 76, fontSize: 26 }).setDepth(DEPTH.hud);

    this.refreshInfo();

    // Swipe + keyboard navigation
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => { this.swipeStartX = p.x; });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (this.swipeStartX === null) return;
      const dx = p.x - this.swipeStartX;
      this.swipeStartX = null;
      if (Math.abs(dx) > 60 && p.y < Y.dots) this.step(dx < 0 ? 1 : -1);
    });
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.step(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.step(1);
      else if (e.key === 'Enter' || e.key === ' ') this.primaryAction();
    };
    window.addEventListener('keydown', keys);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', keys));
  }

  private drawHeader(): void {
    this.add.text(GAME_WIDTH / 2, Y.title, heading('Dungeon Select'), titleStyle(44, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud);
    const p = save.data.player;
    this.add.text(28, Y.title, `Lv ${p.level}`, textStyle(24, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5).setDepth(DEPTH.hud);
    this.add.image(GAME_WIDTH - 30, Y.title, 'item_GoldCoin').setScale(3).setOrigin(1, 0.5).setDepth(DEPTH.hud);
    this.add.text(GAME_WIDTH - 62, Y.title, `${p.gold}`, textStyle(24, { color: TEXT.gold, align: 'right' })).setOrigin(1, 0.5).setDepth(DEPTH.hud);
  }

  // ---------------------------------------------------------------- carousel

  private cardX(i: number, selected = this.index): number {
    return GAME_WIDTH / 2 - PREVIEW_W / 2 + (i - selected) * CARD_SPACING;
  }

  private layoutCards(animate: boolean): void {
    this.cards.forEach((card, i) => {
      const visible = Math.abs(i - this.index) <= 1;
      const targetX = this.cardX(i);
      const targetAlpha = i === this.index ? 1 : 0.55;
      if (!animate) {
        card.setX(targetX).setAlpha(targetAlpha).setVisible(visible);
        return;
      }
      card.setVisible(true);
      this.tweens.add({
        targets: card, x: targetX, alpha: targetAlpha, duration: motion.ms(240), ease: 'Cubic.easeOut',
        onComplete: () => { card.setVisible(visible); if (i === this.index) this.animating = false; },
      });
    });
  }

  private step(dir: number): void {
    const next = Phaser.Math.Clamp(this.index + dir, 0, REGIONS.length - 1);
    if (next === this.index || this.animating) {
      if (next === this.index) audio.play('cancel', { volume: 0.4 });
      return;
    }
    audio.play('move', { volume: 0.5 });
    this.animating = true;
    this.index = next;
    // Default to the highest unlocked difficulty already cleared? Keep it simple: normal unless the active run says otherwise.
    const active = runSystem.active;
    this.difficulty = active && active.dungeonId === REGIONS[next].id ? active.difficulty : 'normal';
    this.layoutCards(true);
    this.crossfadeAtmosphere(REGIONS[next]);
    this.refreshInfo();
  }

  private crossfadeAtmosphere(region: RegionDef): void {
    const old = this.atmosphere;
    const fresh = drawDungeonAtmosphere(this, region, GAME_WIDTH, GAME_HEIGHT, DEPTH.background + 1).setAlpha(0);
    this.tweens.add({ targets: fresh, alpha: 1, duration: motion.ms(260), onComplete: () => { old?.destroy(); fresh.setDepth(DEPTH.background); } });
    this.atmosphere = fresh;
  }

  // ---------------------------------------------------------------- info block

  private refreshInfo(): void {
    for (const o of this.infoObjects) o.destroy();
    this.infoObjects = [];
    const region = REGIONS[this.index];
    const unlocked = runSystem.isUnlocked(region.id);
    const prog = runSystem.progressFor(region.id);
    const active = runSystem.active;
    const isActiveHere = !!active && active.dungeonId === region.id;
    const boss = BOSSES[region.stages[5].enemyId];
    this.nameText.setText(heading(region.name));
    this.drawDots();

    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.infoObjects.push(o); return o; };
    const cx = GAME_WIDTH / 2;
    let y = Y.info;

    if (!unlocked) {
      const prev = previousRegion(region.id);
      add(this.add.text(cx, y + 10, `Defeat ${prev?.name ?? 'the previous dungeon'} to unlock`, textStyle(26, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud));
      add(this.add.text(cx, y + 50, `Difficulty  ${this.stars(region.id)}`, textStyle(24, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud));
      add(new Button(this, cx, Y.enter, 'LOCKED', () => undefined, { width: 460, height: 96, fontSize: 32, disabled: true }).setDepth(DEPTH.hud));
      return;
    }

    if (isActiveHere && active) {
      add(this.add.text(cx, y + 4, 'RUN IN PROGRESS', textStyle(26, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud));
      add(this.add.text(cx, y + 40, `Wave ${active.wave} / ${RUN.waves}   -   ${DIFFICULTY_LABEL[active.difficulty]}   -   HP ${active.hp}`, textStyle(24, { color: TEXT.light })).setOrigin(0.5).setDepth(DEPTH.hud));
      add(this.add.text(cx, y + 76, `Gold earned so far: ${active.goldEarned}   XP: ${active.xpEarned}`, textStyle(20, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud));
      add(new Button(this, cx - 60, Y.enter, 'CONTINUE RUN', () => this.continueRun(), { width: 380, height: 96, fontSize: 30, variant: 'primary' }).setDepth(DEPTH.hud));
      add(new Button(this, cx + 220, Y.enter, 'Abandon', () => this.abandonRun(), { width: 150, height: 96, fontSize: 22, variant: 'danger' }).setDepth(DEPTH.hud));
      return;
    }

    // Difficulty row: stars + selector
    const unlockedDiffs = runSystem.unlockedDifficulties(region.id);
    if (!unlockedDiffs.includes(this.difficulty)) this.difficulty = 'normal';
    add(this.add.text(cx - 300, y + 14, `Difficulty  ${this.stars(region.id)}`, textStyle(24, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5).setDepth(DEPTH.hud));
    const diffLabel = add(this.add.text(cx + 200, y + 14, DIFFICULTY_LABEL[this.difficulty], textStyle(24, { color: this.difficulty === 'normal' ? TEXT.light : this.difficulty === 'hard' ? TEXT.gold : TEXT.red })).setOrigin(0.5).setDepth(DEPTH.hud));
    if (unlockedDiffs.length > 1) {
      const cycle = (d: number) => {
        const i = DIFFICULTIES.indexOf(this.difficulty);
        const next = DIFFICULTIES[Phaser.Math.Clamp(i + d, 0, unlockedDiffs.length - 1)];
        if (next !== this.difficulty) { this.difficulty = next; this.refreshInfo(); }
      };
      add(new Button(this, cx + 110, y + 14, '<', () => cycle(-1), { width: 60, height: 60, fontSize: 26 }).setDepth(DEPTH.hud));
      add(new Button(this, cx + 290, y + 14, '>', () => cycle(1), { width: 60, height: 60, fontSize: 26 }).setDepth(DEPTH.hud));
      diffLabel.setX(cx + 200);
    }
    y += 56;
    const bossKnown = prog.bestWave >= RUN.waves || prog.cleared;
    add(this.add.text(cx - 300, y, `Waves: ${RUN.waves}      Boss: ${bossKnown ? boss?.name ?? '???' : '???'}`, textStyle(24, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5).setDepth(DEPTH.hud));
    y += 40;
    const best = prog.cleared
      ? `Best: Wave ${RUN.waves}  -  CLEARED${prog.clearedDifficulties.length > 1 ? ` (${prog.clearedDifficulties.map((d) => DIFFICULTY_LABEL[d]).join(', ')})` : ''}`
      : prog.bestWave > 0 ? `Best: Wave ${prog.bestWave}` : 'Best: not attempted';
    add(this.add.text(cx - 300, y, best, textStyle(24, { color: prog.cleared ? TEXT.green : TEXT.muted, align: 'left' })).setOrigin(0, 0.5).setDepth(DEPTH.hud));

    const blocked = !!active && !isActiveHere;
    add(new Button(this, cx, Y.enter, blocked ? 'Finish your current run first' : 'ENTER DUNGEON', () => this.enter(), { width: 460, height: 96, fontSize: blocked ? 24 : 32, variant: 'primary', disabled: blocked }).setDepth(DEPTH.hud));
  }

  private stars(regionId: string): string {
    const n = regionStars(regionId);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  private drawDots(): void {
    const g = this.dots;
    g.clear();
    const gap = 44;
    const startX = GAME_WIDTH / 2 - ((REGIONS.length - 1) * gap) / 2;
    REGIONS.forEach((r, i) => {
      const x = startX + i * gap;
      const cleared = runSystem.progressFor(r.id).cleared;
      const unlocked = runSystem.isUnlocked(r.id);
      const selected = i === this.index;
      const radius = selected ? 12 : 8;
      if (cleared) {
        g.fillStyle(COLORS.gold, 1);
        g.fillCircle(x, Y.dots, radius);
      } else if (unlocked) {
        g.lineStyle(3, COLORS.parchment, 1);
        g.strokeCircle(x, Y.dots, radius);
        if (selected) { g.fillStyle(COLORS.parchment, 1); g.fillCircle(x, Y.dots, 5); }
      } else {
        g.fillStyle(0x3a3530, 1);
        g.fillCircle(x, Y.dots, radius - 1);
      }
      if (selected) {
        g.lineStyle(2, COLORS.goldLight, 1);
        g.strokeCircle(x, Y.dots, radius + 5);
      }
    });
  }

  // ---------------------------------------------------------------- actions

  private primaryAction(): void {
    const region = REGIONS[this.index];
    if (!runSystem.isUnlocked(region.id)) return;
    const active = runSystem.active;
    if (active) {
      if (active.dungeonId === region.id) this.continueRun();
      return;
    }
    this.enter();
  }

  private enter(): void {
    const region = REGIONS[this.index];
    if (!runSystem.isUnlocked(region.id) || runSystem.active) return;
    const maxHp = progression.computeStats().maxHp;
    runSystem.startRun(region.id, this.difficulty, maxHp);
    goTo(this, SCENES.WAVE_INTRO, { mode: 'intro' });
  }

  private continueRun(): void {
    if (!runSystem.active) return;
    goTo(this, SCENES.BATTLE, { run: true });
  }

  private abandonRun(): void {
    confirmModal(this, 'Abandon run?', 'Progress inside this dungeon is lost. Gold, XP and loot you already earned are kept.', () => {
      runSystem.endRun();
      audio.play('cancel');
      this.refreshInfo();
    }, 'Abandon', 'Keep going');
  }
}
