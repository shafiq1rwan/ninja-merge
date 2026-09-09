import Phaser from 'phaser';
import { GAME_WIDTH, IS_DEV, SCENES } from '../config/gameConfig';
import { BOARD } from '../data/balance';
import { BOSSES } from '../data/bosses';
import { ENEMIES } from '../data/enemies';
import { rankName } from '../data/ranks';
import { getRegion, getStage, REGIONS } from '../data/stages';
import { installDebugKeys } from '../debug/DebugKeys';
import { BATTLE_LAYOUT } from '../data/battleAssets';
import { BattleBackdrop } from '../entities/BattleBackdrop';
import { BoardView } from '../entities/BoardView';
import { EnemyStatusCard, EnemyView } from '../entities/Enemy';
import { PlayerHud } from '../entities/Player';
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
import { FloatingText } from '../ui/FloatingText';
import { fadeIn, goTo } from '../ui/Hud';
import { Modal } from '../ui/Modal';
import { motion } from '../ui/motion';
import { flatPanel } from '../ui/Panel';
import { toast } from '../ui/Toast';
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
};

/**
 * The core loop: swipe -> board resolves -> merges damage the enemy -> enemy turn ticks.
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
  private floats!: FloatingText;
  private input2!: InputSystem;
  private busy = false;
  private ended = false;
  private paused = false;
  private stageText!: Phaser.GameObjects.Text;
  /** Set when fighting inside a dungeon run. */
  private wave: WaveDef | null = null;

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

    // Top: stage title, enemy on the ground line, status card beneath the scene
    flatPanel(this, GAME_WIDTH / 2, L.stageTitleY, 520, 48, 0x1a1008, 0.6, 12).setDepth(DEPTH.hud);
    this.stageText = this.add.text(GAME_WIDTH / 2, L.stageTitleY, `${region.name}  -  ${this.stage.name}`, textStyle(24, { color: this.wave?.kind === 'boss' ? TEXT.red : TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud + 1);
    this.enemyView = new EnemyView(this, BATTLE_LAYOUT.enemyX, BATTLE_LAYOUT.enemyFeetY, this.enemyDef);
    this.enemyCard = new EnemyStatusCard(this, BATTLE_LAYOUT.status.top, BATTLE_LAYOUT.status.height, this.enemyDef, this.combat.enemy);

    // Board
    this.boardView = new BoardView(this, this.board, L.boardX, L.boardY);

    // Bottom HUD
    this.hud = new PlayerHud(this, BATTLE_LAYOUT.hud.top, BATTLE_LAYOUT.hud.height, () => this.openPause());
    this.hud.setHp(this.combat.player.hp, stats.maxHp, false);
    this.hud.setXp(save.data.player.level, save.data.player.xp, progression.xpToNext());
    this.hud.setGold(save.data.player.gold);
    this.hud.setHighestRank(this.board.highestRank);

    this.floats = new FloatingText(this, 14);

    // Input
    this.input2 = new InputSystem(this, { onMove: (d) => this.onMove(d), onTap: (x, y) => this.onTap(x, y) });

    // First-ever battle: a short control hint over the scene (fades on its own).
    if (save.data.stats.battlesWon === 0 && save.data.stats.battlesLost === 0 && !this.enemyDef.isBoss) {
      toast(this, 'Swipe or use arrow keys - merge ninjas to strike!', TEXT.light, 120, 3500);
    }
    if (this.enemyDef.isBoss) this.announceBoss();

    if (IS_DEV) installDebugKeys(this, this.debugApi());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input2.destroy());
  }

  private announceBoss(): void {
    const ability = this.enemyDef.abilities?.[0];
    const desc = ability ? BattleScene.describeAbility(ability.type) : '';
    const t = this.add.text(GAME_WIDTH / 2, L.comboY, `BOSS BATTLE\n${desc}`, textStyle(30, { color: TEXT.red })).setOrigin(0.5).setDepth(DEPTH.floating).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 300, yoyo: true, hold: 2200, onComplete: () => t.destroy() });
    audio.play('alert');
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
    audio.play('move', { volume: 0.35 });

    // Resolve combat logic up-front; animations follow the logical state.
    const attack = this.combat.resolvePlayerMove(result);
    this.trackStats(result.merges.length, attack, result.activations);

    await this.boardView.animateMove(result);
    this.hud.setHighestRank(this.board.highestRank);

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
    this.busy = false;
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

  private async showAttack(a: AttackBreakdown): Promise<void> {
    const hp = this.enemyView.hitPoint;
    const showNumbers = motion.damageNumbers;
    this.enemyView.slashFx(a.crit);
    const hitPromise = this.enemyView.hitReaction(a.crit);
    if (showNumbers) {
      a.hits.forEach((h, i) => {
        const dmg = Math.round(h.damage * a.comboMult * (a.crit ? this.combat.player.stats.critMult : 1));
        this.floats.show(hp.x + Phaser.Math.Between(-70, 70), hp.y - i * 10, `${dmg}`, {
          size: a.crit ? 50 : 40,
          color: a.crit ? TEXT.gold : '#ffffff',
          delay: i * 70,
          scaleFrom: a.crit ? 1.6 : 1.3,
        });
      });
      if (a.bombDamage > 0) this.floats.show(hp.x, hp.y - 30, `${a.bombDamage}`, { size: 44, color: '#ff8a5b', scaleFrom: 1.5 });
    }
    if (a.merges >= 2) {
      this.floats.show(GAME_WIDTH / 2, L.comboY, `COMBO x${a.merges}   ${a.comboMult.toFixed(2)}x`, { size: 40, color: TEXT.gold, rise: 30, duration: 1000, scaleFrom: 1.4 });
    }
    if (a.crit) {
      this.floats.show(GAME_WIDTH / 2, L.comboY - (a.merges >= 2 ? 50 : 0), 'CRITICAL!', { size: 52, color: TEXT.red, rise: 30, duration: 1000, scaleFrom: 1.8 });
    }
    // Merge names give the rank system meaning.
    const best = a.hits.reduce((m, h) => Math.max(m, h.rank), 0);
    if (best >= 4 && a.merges === 1 && !a.crit) {
      this.floats.show(GAME_WIDTH / 2, L.comboY, `${rankName(best)}!`, { size: 32, color: TEXT.light, rise: 24, duration: 900 });
    }
    this.enemyCard.setHp(this.combat.enemy.hp, this.combat.enemy.maxHp);
    this.refreshEnemyStatus();
    await hitPromise;
  }

  private showHeal(amount: number): void {
    const p = this.hud.hpBarPoint;
    this.hud.healReaction();
    if (motion.damageNumbers) this.floats.show(p.x, p.y, `+${amount}`, { size: 36, color: TEXT.green, scaleFrom: 1.3, rise: 26 });
    this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
  }

  // ------------------------------------------------------------------ enemy turn

  private async playEnemyEvents(events: EnemyTurnEvent[]): Promise<void> {
    for (const ev of events) {
      switch (ev.type) {
        case 'attack': {
          await this.enemyView.attackLunge();
          this.hud.hitReaction();
          const p = this.hud.hpBarPoint;
          if (motion.damageNumbers) this.floats.show(p.x, p.y, `-${ev.damage}`, { size: 40, color: TEXT.red, scaleFrom: 1.4, rise: 26 });
          this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
          await delay(this, motion.ms(180));
          break;
        }
        case 'poisonTick': {
          audio.play('poison', { volume: 0.5 });
          const p = this.hud.hpBarPoint;
          if (motion.damageNumbers) this.floats.show(p.x + 120, p.y, `-${ev.damage} poison`, { size: 26, color: TEXT.purple, rise: 26 });
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
          this.enemyView.showRage();
          this.enemyCard.showRage();
          audio.play('alert');
          this.floats.show(GAME_WIDTH / 2, L.comboY, 'RAGE! Enemy attacks faster', { size: 34, color: TEXT.red, duration: 1400 });
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
        audio.play('alert');
        this.floats.show(GAME_WIDTH / 2, L.comboY, 'BOARD LOCK!', { size: 40, color: TEXT.purple, duration: 1200 });
        if (tile) {
          this.boardView.sync(true);
          motion.shake(this, 0.003, 100);
        }
        await delay(this, motion.ms(200));
        break;
      }
      case 'poison':
        audio.play('poison');
        this.floats.show(GAME_WIDTH / 2, L.comboY, 'POISONED!', { size: 40, color: TEXT.purple, duration: 1200 });
        this.refreshPlayerStatus();
        break;
      case 'shield':
        audio.play('magic');
        this.enemyView.showShield(true);
        this.floats.show(GAME_WIDTH / 2, L.comboY, 'ENEMY SHIELD UP', { size: 36, color: TEXT.blue, duration: 1200 });
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
      if (motion.damageNumbers) this.floats.show(hp.x, hp.y, `${res.dealt}`, { size: 44, color: '#ff8a5b', scaleFrom: 1.5 });
      this.enemyView.hitReaction(false);
      this.enemyCard.setHp(this.combat.enemy.hp, this.combat.enemy.maxHp);
    }
    this.time.delayedCall(motion.ms(220), async () => {
      this.boardView.sync(true);
      if (this.combat.enemyDefeated) {
        await this.victory();
        return;
      }
      this.busy = false;
    });
  }

  // ------------------------------------------------------------------ blocked board

  private async boardBlockedPenalty(): Promise<void> {
    const lost = this.combat.applyBlockedPenalty();
    audio.play('cancel');
    motion.shake(this, 0.008, 260);
    this.floats.show(GAME_WIDTH / 2, L.comboY, `BOARD BLOCKED!  -${lost} HP`, { size: 38, color: TEXT.red, duration: 1600, rise: 20 });
    this.hud.hitReaction();
    this.hud.setHp(this.combat.player.hp, this.combat.player.stats.maxHp);
    await delay(this, motion.ms(500));
    const removed = this.board.clearLowRankTiles(BOARD.blockedPenaltyClearMin);
    await this.boardView.animateRemoval(removed);
    toast(this, `Cleared ${removed.length} weak ninjas. Keep fighting!`, TEXT.light, L.comboY, 1400);
  }

  // ------------------------------------------------------------------ end states

  private async victory(): Promise<void> {
    this.ended = true;
    this.input2.setEnabled(false);
    audio.stopMusic();
    audio.play('victory');
    this.floats.show(GAME_WIDTH / 2, L.comboY, 'VICTORY!', { size: 64, color: TEXT.gold, duration: 1600, rise: 20, scaleFrom: 2 });
    await this.enemyView.die();

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
    if (this.enemyDef.isBoss) st.bossesDefeated++;

    if (this.wave && runSystem.active) {
      await this.finishRunWave(gold, xp, kept);
      return;
    }

    const unlocked = progression.completeStage(this.stage.id);
    save.persist();
    const rewards: BattleRewards = { xp, gold, drops: kept, dropsLost: lost, levelUp, unlockedStageId: unlocked, highestRank: this.board.highestRank, before };
    await delay(this, motion.ms(500));
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
    await delay(this, motion.ms(450));
    if (next === 'complete') {
      const summary: RunSummary = {
        dungeonId: region.id, difficulty: totals.difficulty, wavesCleared: wave.total, totalWaves: wave.total,
        gold: totals.gold, xp: totals.xp, drops: totals.drops, startLevel: totals.startLevel, endLevel: save.data.player.level,
        unlockedDungeonId: nextRegion && !nextWasUnlocked && progression.isRegionUnlocked(nextRegion.id) ? nextRegion.id : null,
        newDifficulty: hadDifficulty ? null : totals.difficulty === 'normal' ? 'hard' : totals.difficulty === 'hard' ? 'nightmare' : null,
      };
      goTo(this, SCENES.RESULTS, { outcome: 'runComplete', stageId: this.stage.id, run: summary });
    } else if (next === 'upgrade') {
      goTo(this, SCENES.RUN_UPGRADE);
    } else {
      goTo(this, SCENES.WAVE_INTRO, { mode: 'wave' });
    }
  }

  private async defeat(): Promise<void> {
    this.ended = true;
    this.input2.setEnabled(false);
    audio.stopMusic();
    audio.play('defeat');
    save.data.stats.battlesLost++;
    save.persist();
    this.floats.show(GAME_WIDTH / 2, L.comboY, 'DEFEATED...', { size: 60, color: TEXT.red, duration: 1600, rise: 10, scaleFrom: 1.6 });
    this.cameras.main.zoomTo(motion.reduced ? 1 : 1.04, 600);
    await delay(this, motion.ms(1100));
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
        this.hud.setGold(save.data.player.gold);
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
        const hp = this.enemyView.hitPoint;
        this.floats.show(hp.x, hp.y, `${dealt}`, { size: 44 });
        this.enemyCard.setHp(this.combat.enemy.hp, this.combat.enemy.maxHp);
        await this.enemyView.hitReaction(false);
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
