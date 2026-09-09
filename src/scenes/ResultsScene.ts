import Phaser from 'phaser';
import { GAME_HEIGHT, SCENES } from '../config/gameConfig';
import { getItem, RARITY_COLORS, RARITY_LABEL } from '../data/items';
import { xpForLevel } from '../data/progression';
import { rankName } from '../data/ranks';
import { getStage, nextStage } from '../data/stages';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Card } from '../ui/Card';
import { HealthBar } from '../ui/HealthBar';
import { fadeIn, goTo } from '../ui/Hud';
import { motion } from '../ui/motion';
import { COLORS, hex, TEXT, textStyle } from '../ui/theme';
import { getRegion, REGIONS } from '../data/stages';
import { DIFFICULTY_LABEL } from '../systems/RunSystem';
import type { BattleRewards, RunSummary } from './BattleScene';

export interface ResultsData {
  outcome: 'victory' | 'defeat' | 'runComplete' | 'runFailed';
  stageId: string;
  rewards?: BattleRewards;
  run?: RunSummary;
}

/** Victory rewards / defeat screen - one card holding everything, buttons included. */
export class ResultsScene extends Phaser.Scene {
  private payload!: ResultsData;

  constructor() {
    super(SCENES.RESULTS);
  }

  init(data: ResultsData): void {
    this.payload = data;
  }

  create(): void {
    const won = this.payload.outcome === 'victory' || this.payload.outcome === 'runComplete';
    drawBackground(this, won ? 'village' : 'cave', { decorY: GAME_HEIGHT - 130, decorCount: 4, particles: 6 });
    fadeIn(this);
    if (this.payload.outcome === 'runComplete' || this.payload.outcome === 'runFailed') this.runEnd();
    else if (this.payload.outcome === 'victory') this.victory();
    else this.defeat();
  }

  /** End of a dungeon run (cleared or fallen): one compact summary card. */
  private runEnd(): void {
    const r = this.payload.run!;
    const won = this.payload.outcome === 'runComplete';
    const region = getRegion(r.dungeonId);
    const card = new Card(this, { width: 640, centerY: 600, padding: 30, gap: 12 });
    const title = card.title(won ? 'DUNGEON CLEARED!' : 'RUN OVER', won ? 56 : 64, won ? TEXT.gold : TEXT.red);
    card.text(`${region.name}   -   ${DIFFICULTY_LABEL[r.difficulty]}`, 26, { color: TEXT.light });
    card.text(won ? `All ${r.totalWaves} waves cleared` : `Fell on wave ${r.wavesCleared + 1} of ${r.totalWaves}`, 24, { color: won ? TEXT.green : TEXT.muted });
    card.divider();
    let goldText!: Phaser.GameObjects.Text;
    let xpText!: Phaser.GameObjects.Text;
    card.custom(52, (cx, top) => {
      const coin = this.add.sprite(cx - 150, top + 26, 'item_CoinAnim', 0).setScale(5);
      if (this.anims.exists('coin_spin')) coin.play('coin_spin');
      goldText = this.add.text(cx - 105, top + 26, '+0 gold', textStyle(34, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0.5);
      return [coin, goldText];
    });
    card.custom(52, (cx, top) => {
      const scroll = this.add.image(cx - 150, top + 26, 'item_Scroll').setScale(4);
      xpText = this.add.text(cx - 105, top + 26, '+0 XP', textStyle(34, { color: TEXT.blue, align: 'left' })).setOrigin(0, 0.5);
      return [scroll, xpText];
    });
    if (r.endLevel > r.startLevel) card.text(`LEVEL UP!  Lv ${r.startLevel} -> Lv ${r.endLevel}`, 30, { color: TEXT.green });
    if (r.drops.length) {
      card.divider();
      card.text('Loot', 24, { color: TEXT.gold });
      const counts = new Map<string, number>();
      for (const id of r.drops) counts.set(id, (counts.get(id) ?? 0) + 1);
      for (const [id, n] of counts) {
        const item = getItem(id);
        if (!item) continue;
        card.custom(36, (cx, top, w) => {
          const objs: Phaser.GameObjects.GameObject[] = [];
          if (this.textures.exists(item.icon)) objs.push(this.add.image(cx - w / 2 + 26, top + 18, item.icon).setScale(2.4));
          objs.push(this.add.text(cx - w / 2 + 58, top + 18, n > 1 ? `${item.name}  x${n}` : item.name, textStyle(22, { color: hex(RARITY_COLORS[item.rarity]), align: 'left' })).setOrigin(0, 0.5));
          objs.push(this.add.text(cx + w / 2, top + 18, RARITY_LABEL[item.rarity], textStyle(18, { color: TEXT.muted, align: 'right' })).setOrigin(1, 0.5));
          return objs;
        });
      }
    }
    if (r.unlockedDungeonId) card.text(`New dungeon unlocked: ${REGIONS.find((x) => x.id === r.unlockedDungeonId)?.name ?? ''}`, 24, { color: TEXT.green });
    if (r.newDifficulty) card.text(`${DIFFICULTY_LABEL[r.newDifficulty as keyof typeof DIFFICULTY_LABEL]} difficulty unlocked for ${region.name}`, 22, { color: TEXT.gold });
    if (!won) card.text('You keep every coin, XP point and item earned in the run.', 20, { color: TEXT.muted });
    card.divider();
    card.button('Dungeon Select', () => goTo(this, SCENES.WORLD_MAP), { variant: 'primary', height: 92, fontSize: 30 });
    card.button('Village', () => goTo(this, SCENES.VILLAGE));
    card.finish();

    title.setScale(motion.pop(1.4));
    this.tweens.add({ targets: title, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.countUp(goldText, r.gold, 'gold', 700, () => audio.play('coin', { volume: 0.5 }));
    this.countUp(xpText, r.xp, 'XP', 700);
  }

  private victory(): void {
    const r = this.payload.rewards!;
    const stage = getStage(this.payload.stageId);
    const card = new Card(this, { width: 640, centerY: 600, padding: 30, gap: 12 });

    const title = card.title('VICTORY!', 72, TEXT.gold);
    card.text(`${stage.name} cleared`, 26, { color: TEXT.light });
    card.divider();

    // Gold + XP rows
    let goldText!: Phaser.GameObjects.Text;
    let xpText!: Phaser.GameObjects.Text;
    card.custom(52, (cx, top) => {
      const coin = this.add.sprite(cx - 150, top + 26, 'item_CoinAnim', 0).setScale(5);
      if (this.anims.exists('coin_spin')) coin.play('coin_spin');
      goldText = this.add.text(cx - 105, top + 26, '+0 gold', textStyle(34, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0.5);
      return [coin, goldText];
    });
    card.custom(52, (cx, top) => {
      const scroll = this.add.image(cx - 150, top + 26, 'item_Scroll').setScale(4);
      xpText = this.add.text(cx - 105, top + 26, '+0 XP', textStyle(34, { color: TEXT.blue, align: 'left' })).setOrigin(0, 0.5);
      return [scroll, xpText];
    });
    const xpBar = card.object(new HealthBar(this, card.x, 0, { width: 500, height: 30, fillColor: COLORS.blue, lowColor: COLORS.blue, label: 'XP', fontSize: 20 }), 36);

    if (r.levelUp) {
      const lu = r.levelUp;
      const t = card.text(`LEVEL UP!  Lv ${lu.from} -> Lv ${lu.to}`, 34, { color: TEXT.green }).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: 900, duration: 300, onStart: () => audio.play('levelup') });
      const details = [`+${lu.hpGained} max HP`, `+${(lu.to - lu.from) * 2}% attack`];
      if (lu.skillPointsGained) details.push(`+${lu.skillPointsGained} skill point`);
      card.text(details.join('   '), 20, { color: TEXT.muted });
    }

    if (r.drops.length || r.dropsLost.length) {
      card.divider();
      card.text('Loot', 24, { color: TEXT.gold });
      for (const id of r.drops) {
        const item = getItem(id);
        if (!item) continue;
        card.custom(40, (cx, top, w) => {
          const objs: Phaser.GameObjects.GameObject[] = [];
          if (this.textures.exists(item.icon)) objs.push(this.add.image(cx - w / 2 + 30, top + 20, item.icon).setScale(2.6));
          objs.push(this.add.text(cx - w / 2 + 64, top + 20, item.name, textStyle(24, { color: hex(RARITY_COLORS[item.rarity]), align: 'left' })).setOrigin(0, 0.5));
          objs.push(this.add.text(cx + w / 2, top + 20, RARITY_LABEL[item.rarity], textStyle(20, { color: TEXT.muted, align: 'right' })).setOrigin(1, 0.5));
          return objs;
        });
      }
      for (const id of r.dropsLost) card.text(`${getItem(id)?.name ?? id} lost - bag full!`, 20, { color: TEXT.red });
    }

    if (r.highestRank > 0) card.text(`Best ninja this battle: ${rankName(r.highestRank)}`, 20, { color: TEXT.muted });
    if (r.unlockedStageId) card.text(`New stage unlocked: ${getStage(r.unlockedStageId).name}`, 22, { color: TEXT.green });

    card.divider();
    const next = nextStage(this.payload.stageId);
    if (next && progression.isUnlocked(next.id)) {
      card.button(`Next: ${next.name}`, () => goTo(this, SCENES.BATTLE, { stageId: next.id }), { variant: 'primary', height: 92, fontSize: 30 });
    }
    card.buttonRow([
      { label: 'World Map', onClick: () => goTo(this, SCENES.WORLD_MAP) },
      { label: 'Village', onClick: () => goTo(this, SCENES.VILLAGE) },
    ]);
    card.finish();

    // Animations after layout
    title.setScale(motion.pop(1.5));
    this.tweens.add({ targets: title, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.countUp(goldText, r.gold, 'gold', 700, () => audio.play('coin', { volume: 0.5 }));
    this.countUp(xpText, r.xp, 'XP', 700);
    xpBar.reset(r.before.xp, xpForLevel(r.before.level));
    this.time.delayedCall(300, () => {
      const p = save.data.player;
      if (r.levelUp) {
        xpBar.set(xpForLevel(r.before.level), xpForLevel(r.before.level));
        this.time.delayedCall(500, () => {
          xpBar.reset(0, xpForLevel(p.level));
          xpBar.set(p.xp, xpForLevel(p.level));
        });
      } else {
        xpBar.set(p.xp, xpForLevel(p.level));
      }
    });
  }

  private defeat(): void {
    const stage = getStage(this.payload.stageId);
    const tips = [
      'Merge in one direction to build a big ninja in a corner.',
      'Upgrade Vitality in the village for more HP.',
      'Push potions to the board edge (or tap them) to heal.',
      'Equipment adds Attack, HP and Defense.',
      'Watch the "Enemy attack in" counter and set up combos.',
    ];
    const card = new Card(this, { width: 640, centerY: 600, padding: 30, gap: 14 });
    card.title('DEFEAT', 72, TEXT.red);
    card.text(`${stage.name} was too strong... this time.`, 26, { color: TEXT.light });
    card.divider();
    card.text(`Tip: ${Phaser.Utils.Array.GetRandom(tips)}`, 22, { color: TEXT.muted });
    card.text('Your level, gold and gear are safe.', 22, { color: TEXT.green });
    card.divider();
    card.button('Retry Battle', () => goTo(this, SCENES.BATTLE, { stageId: this.payload.stageId }), { variant: 'primary', height: 92, fontSize: 30 });
    card.button('Return to Village', () => goTo(this, SCENES.VILLAGE));
    card.finish();
  }

  private countUp(text: Phaser.GameObjects.Text, target: number, suffix: string, duration: number, tick?: () => void): void {
    const obj = { v: 0 };
    let lastTick = -1;
    this.tweens.add({
      targets: obj,
      v: target,
      duration: motion.ms(duration),
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const v = Math.round(obj.v);
        text.setText(`+${v} ${suffix}`);
        if (tick && Math.floor(v / Math.max(1, target / 6)) !== lastTick) {
          lastTick = Math.floor(v / Math.max(1, target / 6));
          tick();
        }
      },
    });
  }
}
