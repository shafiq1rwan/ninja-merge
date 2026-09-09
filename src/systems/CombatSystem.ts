import { BOARD, COMBAT, DAMAGE_TABLE, ENEMY_SCALING } from '../data/balance';
import type { BossAbility, EnemyDef, MoveResult, PlayerStats } from '../types';
import { Rng } from './Rng';

/** Runtime enemy state for one battle. */
export interface EnemyState {
  def: EnemyDef;
  level: number;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  attackInterval: number;
  /** Moves until the next enemy attack. */
  counter: number;
  attacksMade: number;
  shieldTurns: number;
  shieldReduction: number;
  raging: boolean;
}

export interface PlayerState {
  stats: PlayerStats;
  hp: number;
  poisonTurns: number;
  poisonDamage: number;
}

export interface AttackBreakdown {
  merges: number;
  rawDamage: number;
  comboMult: number;
  crit: boolean;
  /** Damage actually dealt to the enemy after defense/shield. */
  dealt: number;
  /** Per-merge damage (for floating numbers). */
  hits: { rank: number; damage: number }[];
  bombDamage: number;
  healed: number;
}

export type EnemyTurnEvent =
  | { type: 'attack'; damage: number }
  | { type: 'poisonTick'; damage: number }
  | { type: 'ability'; ability: BossAbility }
  | { type: 'shieldDown' }
  | { type: 'rage' };

/**
 * Battle math. No Phaser here - fully unit-testable.
 * The scene drives it: resolvePlayerMove() -> (animate) -> enemyTick() -> (animate).
 */
export class CombatSystem {
  readonly player: PlayerState;
  readonly enemy: EnemyState;
  private rng: Rng;

  constructor(stats: PlayerStats, enemyDef: EnemyDef, level: number, rng = new Rng()) {
    this.rng = rng;
    this.player = { stats, hp: stats.maxHp, poisonTurns: 0, poisonDamage: 0 };
    this.enemy = CombatSystem.makeEnemy(enemyDef, level);
  }

  static scaledHp(def: EnemyDef, level: number): number {
    return Math.round(def.maxHp * (1 + ENEMY_SCALING.hpPerLevel * (level - 1)));
  }
  static scaledAttack(def: EnemyDef, level: number): number {
    return Math.round(def.attack * (1 + ENEMY_SCALING.attackPerLevel * (level - 1)));
  }

  static makeEnemy(def: EnemyDef, level: number): EnemyState {
    const maxHp = CombatSystem.scaledHp(def, level);
    return {
      def,
      level,
      maxHp,
      hp: maxHp,
      attack: CombatSystem.scaledAttack(def, level),
      defense: def.defense,
      attackInterval: def.attackInterval,
      counter: def.attackInterval,
      attacksMade: 0,
      shieldTurns: 0,
      shieldReduction: 0,
      raging: false,
    };
  }

  get enemyDefeated(): boolean {
    return this.enemy.hp <= 0;
  }
  get playerDefeated(): boolean {
    return this.player.hp <= 0;
  }

  /** Combo multiplier for a number of merges in one swipe. */
  static comboMultiplier(merges: number): number {
    const table = COMBAT.comboMultipliers;
    if (merges <= 0) return 1;
    return table[Math.min(merges, table.length - 1)];
  }

  /** Base damage of a single merge producing `rank`. */
  static mergeDamage(rank: number): number {
    return DAMAGE_TABLE[Math.min(rank, DAMAGE_TABLE.length - 1)] ?? 0;
  }

  /**
   * Turn a board move into damage/healing. Applies it to enemy/player state and returns the breakdown.
   */
  resolvePlayerMove(move: MoveResult): AttackBreakdown {
    const stats = this.player.stats;
    const hits = move.merges.map((m) => ({ rank: m.rank, damage: CombatSystem.mergeDamage(m.rank) * stats.attackMult }));
    const raw = hits.reduce((a, h) => a + h.damage, 0);
    const comboMult = CombatSystem.comboMultiplier(move.merges.length);
    const crit = hits.length > 0 && this.rng.chance(stats.critChance);
    let total = raw * comboMult * (crit ? stats.critMult : 1);

    // Special tiles
    let bombDamage = 0;
    let healed = 0;
    for (const act of move.activations) {
      if (act.kind === 'bomb') {
        bombDamage += act.destroyed.filter((t) => t.kind === 'ninja').length * BOARD.bombDamagePerTile * stats.attackMult;
      } else if (act.kind === 'potion') {
        healed += this.heal(Math.round(stats.maxHp * BOARD.potionHealPercent));
      }
    }
    total += bombDamage;

    const dealt = total > 0 ? this.damageEnemy(total) : 0;
    return { merges: move.merges.length, rawDamage: raw, comboMult, crit, dealt, hits, bombDamage: Math.round(bombDamage), healed };
  }

  /** Apply a tap-activated special tile. Returns damage dealt / hp healed. */
  resolveActivation(kind: 'potion' | 'bomb', destroyedNinjas: number): { dealt: number; healed: number } {
    if (kind === 'potion') return { dealt: 0, healed: this.heal(Math.round(this.player.stats.maxHp * BOARD.potionHealPercent)) };
    const dmg = destroyedNinjas * BOARD.bombDamagePerTile * this.player.stats.attackMult;
    return { dealt: dmg > 0 ? this.damageEnemy(dmg) : 0, healed: 0 };
  }

  /** Apply damage to the enemy (defense + shield). Returns damage dealt. */
  damageEnemy(amount: number): number {
    const e = this.enemy;
    let dmg = amount - e.defense;
    if (e.shieldTurns > 0) dmg *= 1 - e.shieldReduction;
    dmg = Math.max(COMBAT.minDamage, Math.round(dmg));
    e.hp = Math.max(0, e.hp - dmg);
    return dmg;
  }

  heal(amount: number): number {
    const before = this.player.hp;
    this.player.hp = Math.min(this.player.stats.maxHp, this.player.hp + amount);
    return this.player.hp - before;
  }

  /** Apply raw damage to the player (defense applied). Returns damage taken. */
  damagePlayer(amount: number, ignoreDefense = false): number {
    const dmg = Math.max(COMBAT.minDamage, Math.round(amount - (ignoreDefense ? 0 : this.player.stats.defense)));
    this.player.hp = Math.max(0, this.player.hp - dmg);
    return dmg;
  }

  /** Board-blocked penalty: lose a fraction of max HP (defense ignored). */
  applyBlockedPenalty(): number {
    return this.damagePlayer(Math.round(this.player.stats.maxHp * BOARD.blockedPenaltyHpPercent), true);
  }

  /** Passive spawn modifier from boss Curse, if any. */
  curseModifier(): { blockedChance: number; blockedTtl: number } | null {
    const curse = this.enemy.def.abilities?.find((a) => a.type === 'curse');
    return curse && curse.type === 'curse' ? { blockedChance: curse.chance, blockedTtl: curse.ttl } : null;
  }

  /**
   * Advance the enemy's turn by one valid player move.
   * Returns the events that happened, in order, so the scene can animate them.
   */
  enemyTick(): EnemyTurnEvent[] {
    const events: EnemyTurnEvent[] = [];
    const e = this.enemy;
    const p = this.player;
    if (e.hp <= 0) return events;

    // Poison ticks every move.
    if (p.poisonTurns > 0) {
      p.poisonTurns--;
      const dmg = this.damagePlayer(p.poisonDamage, true);
      events.push({ type: 'poisonTick', damage: dmg });
      if (p.hp <= 0) return events;
    }

    // Shield timer.
    if (e.shieldTurns > 0) {
      e.shieldTurns--;
      if (e.shieldTurns === 0) events.push({ type: 'shieldDown' });
    }

    // Rage check.
    const rage = e.def.abilities?.find((a) => a.type === 'rage');
    if (rage && rage.type === 'rage' && !e.raging && e.hp / e.maxHp <= rage.hpThreshold) {
      e.raging = true;
      e.attackInterval = rage.interval;
      e.counter = Math.min(e.counter, rage.interval);
      events.push({ type: 'rage' });
    }

    e.counter--;
    if (e.counter <= 0) {
      e.attacksMade++;
      const dmg = this.damagePlayer(e.attack);
      events.push({ type: 'attack', damage: dmg });
      e.counter = e.attackInterval;

      for (const ability of e.def.abilities ?? []) {
        if ('everyAttacks' in ability && e.attacksMade % ability.everyAttacks === 0) {
          if (ability.type === 'poison') {
            p.poisonTurns = ability.turns;
            p.poisonDamage = ability.damage;
          } else if (ability.type === 'shield') {
            e.shieldTurns = ability.turns;
            e.shieldReduction = ability.reduction;
          }
          events.push({ type: 'ability', ability });
        }
      }
    }
    return events;
  }

  /** Gold / XP for defeating this enemy, before player bonuses. */
  baseRewards(): { xp: number; gold: number } {
    const e = this.enemy;
    const scale = 1 + ENEMY_SCALING.rewardPerLevel * (e.level - 1);
    const variance = 1 + (this.rng.next() * 2 - 1) * ENEMY_SCALING.goldVariance;
    let xp = e.def.xpReward * scale;
    let gold = e.def.goldReward * scale * variance;
    if (e.def.isBoss) {
      xp *= ENEMY_SCALING.bossXpMult;
      gold *= ENEMY_SCALING.bossGoldMult;
    }
    return { xp: Math.round(xp), gold: Math.round(gold) };
  }

  /** Roll item drops for this enemy. */
  rollDrops(): string[] {
    return (this.enemy.def.possibleDrops ?? []).filter((d) => this.rng.chance(d.chance)).map((d) => d.itemId);
  }
}
