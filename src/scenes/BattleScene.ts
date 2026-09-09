import Phaser from 'phaser';
import { GAME_WIDTH, IS_DEV, SCENES } from '../config/gameConfig';
import { BOARD } from '../data/balance';
import { BATTLE_LAYOUT } from '../data/battleAssets';
import { BOSSES } from '../data/bosses';
import { ENEMIES } from '../data/enemies';
import { JUICE } from '../data/juice';
import { rankName } from '../data/ranks';
import { getRegion, getStage, REGIONS } from '../data/stages';
import { installDebugKeys } from '../debug/DebugKeys';
import { CameraEffects } from '../effects/CameraEffects';
import { CombatEffects, type AttackReport } from '../effects/CombatEffects';
import { CombatVFX } from '../effects/CombatVFX';
import { DamageNumbers } from '../effects/DamageNumbers';
import { mergeEffects } from '../effects/MergeEffects';
import { ParticleEffects } from '../effects/ParticleEffects';
import { RewardEffects } from '../effects/RewardEffects';
import { BattleBackdrop } from '../entities/BattleBackdrop';
import { BoardView } from '../entities/BoardView';
import { EnemyStatusCard, EnemyView } from '../entities/Enemy';
import { PlayerHud } from '../entities/Player';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import { BoardSystem } from '../systems/BoardSystem';
import { CombatSystem, type AttackBreakdown, type EnemyTurnEvent } from '../systems/CombatSystem';
import { equipment } from '../systems/EquipmentSystem';
import { InputSystem } from '../systems/InputSystem';
import { progression } from '../systems/ProgressionSystem';
import { runSystem, type WaveDef } from '../systems/RunSystem';
import { save, type ActiveRun } from '../systems/SaveSystem';
import type { ActivationEvent, Direction, EnemyDef, StageDef } from '../types';
import { delay } from '../ui/async';
import { ComboIndicator } from '../ui/ComboIndicator';
import { fadeIn, goTo } from '../ui/Hud';
import { Modal } from '../ui/Modal';
import { motion } from '../ui/motion';
import { flatPanel } from '../ui/Panel';
import { toast } from '../ui/Toast';
import { showBanner } from '../ui/WaveBanner';
import { DEPTH, TEXT, textStyle } from '../ui/theme';

export interface BattleData {
  /** Classic single-stage battle (debug / legacy). */
  stageId?: string;
  /** Fight the active dungeon run's current wave. */
  run?: boolean;
}

/** Summary handed to ResultsScene when a dungeon run ends. */
export interface RunSummary {
  dungeonId: string;
  difficulty: ActiveRun['difficulty'];
  wavesCleared: number;
  totalWaves: number;
  gold: number;
  xp: number;
  drops: string[];
  startLevel: number;
  endLevel: number;
  unlockedDungeonId: string | null;
  newDifficulty: string | null;
}

export interface BattleRewards {
  xp: number;
  gold: number;
  drops: string[];
  dropsLost: string[];
  levelUp: { from: number; to: number; hpGained: number; skillPointsGained: number } | null;
  unlockedStageId: string | null;
  highestRank: number;
  before: { level: number; xp: number };
}

/** Layout constants (logical 720x1280 portrait) - see data/battleAssets.ts. */
const L = {
  stageTitleY: BATTLE_LAYOUT.titleBarY,
  boardX: BATTLE_LAYOUT.board.x,
  boardY: BATTLE_LAYOUT.board.y,
  comboY: BATTLE_LAYOUT.comboY,
  /** Transient banners sit over the enemy scene, never over the board or HUD. */
  bannerY: 240,
};

/**
 * The core loop: swipe -> board resolves -> merges damage the enemy -> enemy turn ticks.
 *
 * Gameplay and presentation are kept apart: CombatSystem produces final numbers, then the
 * effects/* layer is told what happened (see CombatEffects.attackOccurred). No damage, reward or
 * progression value depends on an animation finishing.
 */
export class BattleScene extends Phaser.Scene {
  private stage!: StageDef;
  private enemyDef!: EnemyDef;
  private board!: BoardSystem;
  private boardView!: BoardView;
  private combat!: CombatSystem;
  private enemyView!: EnemyView;
  private enemyCard!: EnemyStatusCard;
  private hud!: PlayerHud;
  private input2!: InputSystem;
  private busy = false;
  private ended = false;
  private paused = false;
  private stageText!: Phaser.GameObjects.Text;
  /** Set when fighting inside a dungeon run. */
  private wave: WaveDef | null = null;
  /** True when this move already announced a newly forged rank (so it is not named twice). */
  private announcedThisMove = false;

  // Presentation layer
  private particles!: ParticleEffects;
  private cameraFx!: CameraEffects;
  private numbers!: DamageNumbers;
  private combo!: ComboIndicator;
  private vfx!: CombatVFX;
  private fx!: CombatEffects;
  private rewards!: RewardEffects;

  constructor() {
    super(SCENES.BATTLE);
  }

  init(data: BattleData): void {
    this.wave = null;
    const firstStageId = getRegion('forest').stages[0].id;
    if (data?.run) {
      const wave = runSystem.currentWave();
      if (!wave) {
        this.stage = getStage(firstStageId); // no active run - never crash
      } else {
        this.wave = wave;
        this.stage = {
          id: `${wave.regionId}_wave${wave.wave}`,
          name: `Wave ${wave.wave} / ${wave.total}`,
          regionId: wave.regionId,
          index: wave.wave - 1,
          enemyId: wave.enemyId,
          level: wave.level,
          isBoss: wave.kind === 'boss',
        };
      }
    } else {
      this.stage = getStage(data?.stageId ?? firstStageId);
    }
    const base = (this.stage.isBoss ? BOSSES : ENEMIES)[this.stage.enemyId] ?? ENEMIES.slime;
    // Elite waves reuse a normal enemy at a higher level; only the label changes.
    this.enemyDef = this.wave?.kind === 'elite' ? { ...base, name: `ELITE ${base.name}` } : base;
    this.busy = false;
    this.ended = false;
    this.paused = false;
  }

  create(): void {
    const region = getRegion(this.stage.regionId);
    new BattleBackdrop(this, region.theme);
    fadeIn(this);
    audio.playMusic(this.enemyDef.music ?? region.music);

    // Systems (run blessings sit on top of the permanent stats; combat math itself is unchanged)
    const stats = this.wave ? runSystem.stats(progression.computeStats()) : progression.computeStats();
    this.combat = new CombatSystem(stats, this.enemyDef, this.stage.level);
    const run = runSystem.active;
    if (this.wave && run) this.combat.player.hp = Phaser.Math.Clamp(run.hp, 1, stats.maxHp); // HP carries across waves
    this.board = new BoardSystem();
    const curse = this.combat.curseModifier();
    if (curse) this.board.spawnModifiers = curse;
    this.board.start(2);

    // Effects layer
    this.particles = new ParticleEffects(this);
    this.cameraFx = new CameraEffects(this);
    this.numbers = new DamageNumbers(this, 16);
    this.combo = new ComboIndicator(this, L.comboY);
    this.vfx = new CombatVFX(this, this.particles);

    // Top: stage title, enemy on the ground line, status card beneath the scene
    flatPanel(this, BATTLE_LAYOUT.panel.x, L.stageTitleY, BATTLE_LAYOUT.panel.width, 48, 0x1a1008, 0.6, 12).setDepth(DEPTH.hud);
    this.stageText = this.add.text(BATTLE_LAYOUT.panel.x, L.stageTitleY, `${region.name}  -  ${this.stage.name}`, textStyle(24, { color: this.wave?.kind === 'boss' ? TEXT.red : TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud + 1);
    this.enemyView = new EnemyView(this, BATTLE_LAYOUT.enemyX, BATTLE_LAYOUT.enemyFeetY, this.enemyDef);
    this.enemyCard = new EnemyStatusCard(this, BATTLE_LAYOUT.status.top, BATTLE_LAYOUT.status.height, this.enemyDef, this.combat.enemy);

    // Board
    this.boardView = new BoardView(this, this.board, L.boardX, L.boardY, this.particles);

    // Bottom HUD
    this.hud = new PlayerHud(this, BATTLE_LAYOUT.hud.top, BATTLE_LAYOUT.hud.height, () => this.openPause());
    this.hud.setHp(this.combat.player.hp, stats.maxHp, false);
    this.hud.setXp(save.data.player.level, save.data.player.xp, progression.xpToNext());
    this.hud.setGold(save.data.player.gold);
    this.hud.setHighestRank(this.board.highestRank);

    this.fx = new CombatEffects(this, {
      enemy: this.enemyView,
      hud: this.hud,
      particles: this.particles,
      camera: this.cameraFx,
      numbers: this.numbers,
      combo: this.combo,
      vfx: this.vfx,
      shoutY: L.comboY,
    });
    this.rewards = new RewardEffects(this, this.particles);

    // Input
    this.input2 = new InputSystem(this, { onMove: (d) => this.onMove(d), onTap: (x, y) => this.onTap(x, y) });

    // First-ever battle: a short control hint, held back so it never collides with the wave banner.
    if (save.data.stats.battlesWon === 0 && save.data.stats.battlesLost === 0 && !this.enemyDef.isBoss) {
      this.time.delayedCall(900, () => toast(this, 'Swipe or use arrow keys - merge ninjas to strike!', TEXT.light, 120, 3000));
    }
    // Rank announcements are per run; a fresh run (or standalone battle) starts with a clean slate.
    if (!this.wave || this.wave.wave === 1) mergeEffects.resetAnnouncements();

    void this.playIntro();

    if (IS_DEV) installDebugKeys(this, this.debugApi());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input2.destroy());
  }

  // ------------------------------------------------------------------ intros

  /**
   * Wave / elite / boss opening. Normal and elite waves keep the player in control immediately;
   * only a boss entrance holds input, and only for ~1.7s.
   */
  private async playIntro(): Promise<void> {
    const kind = this.wave?.kind ?? (this.enemyDef.isBoss ? 'boss' : 'normal');
    if (kind === 'boss') {
      this.input2.setEnabled(false);
      audio.play('bossAlert');
      const ability = this.enemyDef.abilities?.[0];
      const entrance = Promise.all([this.enemyView.enter('boss'), this.enemyCard.appear()]);
      await entrance;
      await showBanner(this, {
        title: 'BOSS WAVE',
        subtitle: ability ? `${this.enemyDef.name}
${BattleScene.describeAbility(ability.type)}` : this.enemyDef.name,
        color: TEXT.red,
        titleSize: 52,
        durationMs: JUICE.banner.bossMs * 0.8,
        dim: 0.35,
        y: L.bannerY,
      });
      if (!this.ended) this.input2.setEnabled(true);
      return;
    }
    if (!this.wave) return;
    if (kind === 'elite') {
      audio.play('alert');
      void this.enemyView.enter('elite');
      void showBanner(this, { title: `WAVE ${this.wave.wave}`, subtitle: 'ELITE', color: TEXT.purple, durationMs: JUICE.banner.eliteMs, dim: 0.22, y: L.bannerY });
      return;
    }
    void this.enemyView.enter('normal');
    void showBanner(this, { title: `WAVE ${this.wave.wave} / ${this.wave.total}`, durationMs: JUICE.banner.waveMs, y: L.bannerY });
  }

  static describeAbility(type: string): string {
    switch (type) {
      case 'boardLock': return 'Board Lock: roots a square for a few moves';
      case 'poison': return 'Poison: you lose HP each move for a while';
      case 'curse': return 'Curse: some new tiles spawn blocked';
      case 'shield': return 'Shield: takes reduced damage for a few turns';
      case 'rage': return 'Rage: attacks faster when badly hurt';
      default: return '';
    }
  }

  // ------------------------------------------------------------------ player move

  private async onMove(dir: Direction): Promise<void> {
    if (this.busy || this.ended || this.paused) return;
    const result = this.board.move(dir);
    if (!result.moved) {
      this.boardView.nudge(dir);
      return;
    }
    this.busy = true;

    // Resolve combat logic up-front; animations follow the logical state.
    const attack = this.combat.resolvePlayerMove(result);
    this.trackStats(result.merges.length, attack, result.activations);

    try {
      await this.boardView.animateMove(result);
      this.hud.setHighestRank(this.board.highestRank);
      this.announceRanks();

      if (attack.merges > 0 || attack.bombDamage > 0) await this.showAttack(attack);
      if (attack.healed > 0) this.showHeal(attack.healed);

      if (this.combat.enemyDefeated) {
        await this.victory();
        return;
      }

      // Enemy turn
      const events = this.combat.enemyTick();
      this.enemyCard.setCounter(this.combat.enemy.counter);
      await this.playEnemyEvents(events);
      if (this.combat.playerDefeated) {
        await this.defeat();
        return;
      }

      // Stuck board -> penalty instead of game over.
      if (this.board.isBlocked()) {
        await this.boardBlockedPenalty();
        if (this.combat.playerDefeated) {
          await this.defeat();
          return;
        }
      }
    } catch (err) {
      // Presentation must never be able to lock the board: log it and hand control back. The board
      // state itself is already correct - the move was resolved before any animation ran.
      console.warn('[Battle] move presentation failed', err);
      this.boardView.sync(false);
    } finally {
      // `ended` paths (victory / defeat) deliberately keep input disabled while the scene changes.
      if (!this.ended) this.busy = false;
    }
  }

  private trackStats(merges: number, attack: AttackBreakdown, activations: ActivationEvent[]): void {
    const st = save.data.stats;
    st.totalMerges += merges;
    st.totalDamage += attack.dealt;
    if (attack.crit) st.criticalHits++;
    if (merges > st.highestCombo) st.highestCombo = merges;
    if (this.board.highestRank > st.highestRank) st.highestRank = this.board.highestRank;
    for (const a of activations) {
      if (a.kind === 'potion') st.potionsUsed++;
      else st.bombsUsed++;
    }
  }

  /** First time a notable ninja form is forged in a run, name it. Never blocks play. */
  private announceRanks(): void {
    this.announcedThisMove = false;
    const best = this.boardView.mergedRanks.reduce((m, r) => Math.max(m, r), 0);
    if (best <= 0 || !mergeEffects.shouldAnnounce(best)) return;
    this.announcedThisMove = true;
    audio.play('sparkle');
    void showBanner(this, {
      title: mergeEffects.announceText(best),
      color: TEXT.gold,
      titleSize: 38,
      durationMs: JUICE.banner.announceMs,
      y: L.bannerY + 60,
    });
  }

  /**
   * Turn the resolved attack into feedback. The numbers shown are scaled to the damage actually
   * dealt so the readout always matches the HP the enemy loses.
   */
  private async showAttack(a: AttackBreakdown): Promise<void> {
    const critMult = this.combat.player.stats.critMult;
    const raw = a.hits.map((h) => h.damage * a.comboMult * (a.crit ? critMult : 1));
    const rawTotal = raw.reduce((x, y) => x + y, 0) + a.bombDamage;
    const scale = rawTotal > 0 ? a.dealt / rawTotal : 1;
    const report: AttackReport = {
      hits: a.hits.map((h, i) => ({ rank: h.rank, damage: Math.max(1, Math.round(raw[i] * scale)) })),
      critical: a.crit,
      merges: a.merges,
      comboMult: a.comboMult,
      bombDamage: a.bombDamage > 0 ? Math.max(1, Math.round(a.bombDamage * scale)) : 0,
      bestRank: a.hits.reduce((m, h) => Math.max(m, h.rank), 0),
      killed: this.combat.enemyDefeated,
      isBoss: !!this.enemyDef.isBoss,
    };

    // The HP bar drops on the impact frame, so the bar, the numbers and the hit all land together.
    await this.fx.attackOccurred(report, () => {
      this.enemyCard.setHp(this.combat.enemy.hp, this.combat.enemy.maxHp);
      this.refreshEnemyStatus();
    });

    // A single big merge is worth naming, unless a combo, crit or forge banner is already talking.
    if (report.bestRank >= 4 && a.merges === 1 && !a.crit && !this.announcedThisMove) {
      this.numbers.note(GAME_WIDTH / 2, L.comboY, `${rankName(report.bestRank)}!`, TEXT.light, 28);
    }
  }

  private showHeal(amount: number): void {
    this.fx.healed(amount);
    this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
  }

  // ------------------------------------------------------------------ enemy turn

  private async playEnemyEvents(events: EnemyTurnEvent[]): Promise<void> {
    for (const ev of events) {
      switch (ev.type) {
        case 'attack': {
          await this.enemyView.attackLunge();
          this.cameraFx.hitStop(JUICE.hitStop.normal);
          this.fx.playerHurt(ev.damage);
          this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
          await delay(this, effects.ms(140));
          break;
        }
        case 'poisonTick': {
          audio.play('poison', { volume: 0.5 });
          const p = this.hud.hpBarPoint;
          this.numbers.note(p.x + 120, p.y, `-${ev.damage} poison`, TEXT.purple, 22);
          this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
          this.refreshPlayerStatus();
          break;
        }
        case 'ability':
          await this.playAbility(ev.ability.type);
          break;
        case 'shieldDown':
          this.enemyView.showShield(false);
          this.refreshEnemyStatus();
          toast(this, 'Shield faded!', TEXT.blue, L.comboY, 900);
          break;
        case 'rage':
          // Phase change: brief stop, the boss visibly changes, then it hits faster.
          this.cameraFx.hitStop(JUICE.hitStop.strong);
          audio.play('bossAlert');
          await this.enemyView.phaseChange();
          this.enemyCard.showRage();
          motion.shake(this, JUICE.shake.bossAttack, 130);
          this.fx.shout('ENRAGED!', TEXT.red, 40, 1100);
          this.refreshEnemyStatus();
          break;
      }
    }
    this.enemyCard.setCounter(this.combat.enemy.counter);
    this.refreshPlayerStatus();
  }

  private async playAbility(type: string): Promise<void> {
    switch (type) {
      case 'boardLock': {
        const lockAbility = this.enemyDef.abilities?.find((a) => a.type === 'boardLock');
        const ttl = lockAbility && lockAbility.type === 'boardLock' ? lockAbility.ttl : 3;
        const tile = this.board.lockRandomEmptyCell(ttl);
        audio.play('magic');
        this.fx.shout('BOARD LOCK!', TEXT.purple, 38, 1100);
        if (tile) {
          this.boardView.sync(true);
          const c = this.boardView.cellCenter(tile.row, tile.col);
          this.particles.burst(c.x, c.y, { count: 8, color: 0xc9a6ff, size: 6, speed: 80 });
          motion.shake(this, 0.003, 100);
        }
        await delay(this, effects.ms(180));
        break;
      }
      case 'poison':
        audio.play('poison');
        this.fx.shout('POISONED!', TEXT.purple, 38, 1100);
        this.refreshPlayerStatus();
        break;
      case 'shield':
        audio.play('magic');
        this.enemyView.showShield(true);
        this.fx.shout('ENEMY SHIELD UP', TEXT.blue, 34, 1100);
        this.refreshEnemyStatus();
        break;
      default:
        break;
    }
  }

  private refreshEnemyStatus(): void {
    const e = this.combat.enemy;
    const parts: string[] = [];
    if (e.shieldTurns > 0) parts.push(`Shield ${Math.round(e.shieldReduction * 100)}% (${e.shieldTurns})`);
    if (e.raging) parts.push('RAGING');
    if (this.combat.curseModifier()) parts.push('Cursed spawns');
    this.enemyCard.setStatus(parts);
  }

  private refreshPlayerStatus(): void {
    const p = this.combat.player;
    this.hud.setStatus(p.poisonTurns > 0 ? `Poison ${p.poisonTurns}` : '');
  }

  // ------------------------------------------------------------------ tap / specials

  private onTap(x: number, y: number): void {
    if (this.busy || this.ended || this.paused) return;
    const cell = this.boardView.cellAt(x, y);
    if (!cell) return;
    const tile = this.board.tileAt(cell.row, cell.col);
    if (!tile) return;
    if (tile.kind !== 'potion' && tile.kind !== 'bomb') {
      this.boardView.pulseTile(tile.id);
      return;
    }
    const act = this.board.activateAt(cell.row, cell.col);
    if (!act) return;
    this.busy = true;
    const ninjas = act.destroyed.filter((t) => t.kind === 'ninja').length;
    const res = this.combat.resolveActivation(act.kind, ninjas);
    if (act.kind === 'potion') save.data.stats.potionsUsed++;
    else save.data.stats.bombsUsed++;
    this.boardView.playActivation(act);
    if (res.healed > 0) this.showHeal(res.healed);
    if (res.dealt > 0) {
      const hp = this.enemyView.hitPoint;
      this.cameraFx.hitStop(JUICE.hitStop.strong);
      this.numbers.enemyHit(hp.x, hp.y, res.dealt, { color: '#ff8a5b' });
      void this.enemyView.hitReaction(false);
      this.enemyCard.setHp(this.combat.enemy.hp, this.combat.enemy.maxHp);
    }
    this.time.delayedCall(effects.ms(220), async () => {
      try {
        this.boardView.sync(true);
        if (this.combat.enemyDefeated) {
          await this.victory();
          return;
        }
      } catch (err) {
        console.warn('[Battle] special tile presentation failed', err);
      } finally {
        if (!this.ended) this.busy = false;
      }
    });
  }

  // ------------------------------------------------------------------ blocked board

  private async boardBlockedPenalty(): Promise<void> {
    const lost = this.combat.applyBlockedPenalty();
    audio.play('cancel');
    motion.shake(this, 0.006, 220);
    this.fx.shout(`BOARD BLOCKED!  -${lost} HP`, TEXT.red, 36, 1500);
    this.hud.hitReaction();
    this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
    await delay(this, effects.ms(420));
    const removed = this.board.clearLowRankTiles(BOARD.blockedPenaltyClearMin);
    await this.boardView.animateRemoval(removed);
    toast(this, `Cleared ${removed.length} weak ninjas. Keep fighting!`, TEXT.light, L.comboY, 1400);
  }

  // ------------------------------------------------------------------ end states

  private async victory(): Promise<void> {
    this.ended = true;
    this.input2.setEnabled(false);
    const isBoss = !!this.enemyDef.isBoss;
    const inRun = !!(this.wave && runSystem.active);
    // Keep the dungeon music running between waves; only a boss kill or leaving the run stops it.
    if (isBoss || !inRun) audio.stopMusic();
    if (!isBoss) audio.play(inRun ? 'waveClear' : 'victory');

    await this.fx.enemyDied(isBoss);

    // ---- rewards (gameplay: committed before any of the reward animations run)
    const before = { level: save.data.player.level, xp: save.data.player.xp };
    const stats = this.combat.player.stats;
    const base = this.combat.baseRewards();
    const xp = Math.round(base.xp * (1 + stats.xpBonus));
    const gold = Math.round(base.gold * (1 + stats.goldBonus));
    const drops = this.combat.rollDrops();
    const kept: string[] = [];
    const lost: string[] = [];
    for (const d of drops) (equipment.addItem(d, false) ? kept : lost).push(d);
    progression.addGold(gold);
    const levelUp = progression.addXp(xp);
    const st = save.data.stats;
    st.battlesWon++;
    if (isBoss) st.bossesDefeated++;

    // ---- reward juice (presentation only)
    const from = this.enemyView.centerPoint;
    const rewardShow = Promise.all([
      this.rewards.gold(from, this.hud.goldPoint, () => this.hud.setGold(save.data.player.gold, true)),
      this.rewards.xp(from, this.hud.xpPoint, () => this.hud.setXp(save.data.player.level, save.data.player.xp, progression.xpToNext())),
    ]);
    if (levelUp) {
      this.hud.levelUpReaction();
      this.fx.shout(`LEVEL UP!  Lv ${levelUp.to}`, TEXT.green, 34, 1200);
    }

    if (inRun) {
      await Promise.all([
        rewardShow,
        showBanner(this, {
          title: isBoss ? 'BOSS DEFEATED' : 'WAVE CLEARED',
          color: isBoss ? TEXT.gold : TEXT.green,
          titleSize: isBoss ? 52 : 46,
          durationMs: isBoss ? JUICE.banner.clearedMs * 1.6 : JUICE.banner.clearedMs,
          y: L.bannerY,
        }),
      ]);
      await this.finishRunWave(gold, xp, kept);
      return;
    }

    const unlocked = progression.completeStage(this.stage.id);
    save.persist();
    const rewards: BattleRewards = { xp, gold, drops: kept, dropsLost: lost, levelUp, unlockedStageId: unlocked, highestRank: this.board.highestRank, before };
    await rewardShow;
    await delay(this, effects.ms(260));
    goTo(this, SCENES.RESULTS, { outcome: 'victory', stageId: this.stage.id, rewards });
  }

  /** Dungeon-run wave cleared: record it and continue the run without visiting the map. */
  private async finishRunWave(gold: number, xp: number, drops: string[]): Promise<void> {
    const run = runSystem.active!;
    const wave = this.wave!;
    const region = getRegion(wave.regionId);
    const regionIndex = REGIONS.findIndex((r) => r.id === region.id);
    const nextRegion = regionIndex + 1 < REGIONS.length ? REGIONS[regionIndex + 1] : null;
    const nextWasUnlocked = nextRegion ? progression.isRegionUnlocked(nextRegion.id) : true;
    const hadDifficulty = runSystem.progressFor(region.id).clearedDifficulties.includes(run.difficulty);
    const totals = { gold: run.goldEarned + gold, xp: run.xpEarned + xp, drops: [...run.drops, ...drops], startLevel: run.startLevel, difficulty: run.difficulty };
    const next = runSystem.recordWaveVictory(this.combat.player.hp, gold, xp, drops);
    if (wave.kind === 'boss') {
      // Clearing the boss clears the whole region in the stage data, which is what unlocks the next dungeon.
      for (const s of region.stages) progression.completeStage(s.id);
    }
    save.persist();
    if (next === 'complete') {
      const summary: RunSummary = {
        dungeonId: region.id, difficulty: totals.difficulty, wavesCleared: wave.total, totalWaves: wave.total,
        gold: totals.gold, xp: totals.xp, drops: totals.drops, startLevel: totals.startLevel, endLevel: save.data.player.level,
        unlockedDungeonId: nextRegion && !nextWasUnlocked && progression.isRegionUnlocked(nextRegion.id) ? nextRegion.id : null,
        newDifficulty: hadDifficulty ? null : totals.difficulty === 'normal' ? 'hard' : totals.difficulty === 'hard' ? 'nightmare' : null,
      };
      goTo(this, SCENES.RESULTS, { outcome: 'runComplete', stageId: this.stage.id, run: summary });
    } else if (next === 'upgrade') {
      goTo(this, SCENES.RUN_UPGRADE, undefined, 140);
    } else {
      // Straight into the next wave - the banner in the new scene announces it.
      goTo(this, SCENES.BATTLE, { run: true }, 140);
    }
  }

  private async defeat(): Promise<void> {
    this.ended = true;
    this.input2.setEnabled(false);
    audio.stopMusic();
    audio.play('defeat');
    save.data.stats.battlesLost++;
    save.persist();
    this.cameraFx.hitStop(JUICE.hitStop.kill);
    this.fx.shout('DEFEATED...', TEXT.red, 56, 1500);
    this.cameras.main.zoomTo(effects.reduced ? 1 : 1.04, 600);
    await delay(this, effects.ms(1000));
    const run = runSystem.active;
    if (this.wave && run) {
      const summary: RunSummary = {
        dungeonId: run.dungeonId, difficulty: run.difficulty, wavesCleared: run.wave - 1, totalWaves: this.wave.total,
        gold: run.goldEarned, xp: run.xpEarned, drops: run.drops, startLevel: run.startLevel, endLevel: save.data.player.level,
        unlockedDungeonId: null, newDifficulty: null,
      };
      runSystem.endRun();
      goTo(this, SCENES.RESULTS, { outcome: 'runFailed', stageId: this.stage.id, run: summary }, 400);
      return;
    }
    goTo(this, SCENES.RESULTS, { outcome: 'defeat', stageId: this.stage.id }, 400);
  }

  // ------------------------------------------------------------------ pause

  private openPause(): void {
    if (this.ended || this.paused) return;
    this.paused = true;
    this.input2.setEnabled(false);
    const settings = save.data.settings;
    const modal = new Modal(this, {
      title: 'Paused',
      message: `${this.stage.name}  -  ${this.enemyDef.name}`,
      buttons: [
        { label: 'Resume', onClick: () => this.resume() },
        {
          label: settings.musicMuted ? 'Music: OFF' : 'Music: ON',
          keepOpen: true,
          onClick: () => {
            audio.setMusicMuted(!settings.musicMuted);
            save.persist();
            modal.close();
            this.paused = false;
            this.openPause();
          },
        },
        { label: this.wave ? 'Restart Wave' : 'Restart Battle', onClick: () => goTo(this, SCENES.BATTLE, this.wave ? { run: true } : { stageId: this.stage.id }) },
        { label: this.wave ? 'Leave (run is saved)' : 'Return to Village', onClick: () => goTo(this, SCENES.VILLAGE), variant: 'danger' },
      ],
    });
  }

  private resume(): void {
    this.paused = false;
    if (!this.ended) this.input2.setEnabled(true);
  }

  // ------------------------------------------------------------------ debug hooks (dev only)

  private debugApi() {
    return {
      spawnRank: (rank: number) => {
        if (this.busy || this.ended) return; // never re-sync while tiles are animating
        this.board.spawnNinja(rank);
        this.boardView.sync(true);
      },
      spawnSpecial: (kind: 'potion' | 'bomb' | 'blocked') => {
        if (this.busy || this.ended) return;
        this.board.spawnSpecial(kind, kind === 'blocked' ? 3 : undefined);
        this.boardView.sync(true);
      },
      startBoss: () => {
        const boss = getRegion(this.stage.regionId).stages[5];
        goTo(this, SCENES.BATTLE, { stageId: boss.id });
      },
      addGold: (n: number) => {
        progression.addGold(n);
        this.hud.setGold(save.data.player.gold, true);
        save.persist();
      },
      heal: () => {
        this.combat.heal(9999);
        this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
      },
      damageEnemy: async (n: number) => {
        if (this.busy || this.ended) return;
        this.busy = true;
        const dealt = this.combat.damageEnemy(n);
        await this.fx.attackOccurred({
          hits: [{ rank: 2, damage: dealt }],
          critical: false,
          merges: 1,
          comboMult: 1,
          bombDamage: 0,
          bestRank: 2,
          killed: this.combat.enemyDefeated,
          isBoss: !!this.enemyDef.isBoss,
        }, () => this.enemyCard.setHp(this.combat.enemy.hp, this.combat.enemy.maxHp));
        if (this.combat.enemyDefeated) await this.victory();
        else this.busy = false;
      },
      killPlayer: async () => {
        if (this.busy || this.ended) return;
        this.busy = true;
        this.combat.damagePlayer(99999, true);
        this.hud.setHp(0, this.combat.player.stats.maxHp);
        await this.defeat();
      },
    };
  }
}
