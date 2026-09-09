import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { getItem, RARITY_LABEL } from '../data/items';
import { xpForLevel } from '../data/progression';
import { rankName } from '../data/ranks';
import { getStage, nextStage } from '../data/stages';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Button } from '../ui/Button';
import { HealthBar } from '../ui/HealthBar';
import { fadeIn, goTo } from '../ui/Hud';
import { motion } from '../ui/motion';
import { Panel } from '../ui/Panel';
import { COLORS, DEPTH, TEXT, textStyle, titleStyle } from '../ui/theme';
import type { BattleRewards } from './BattleScene';

export interface ResultsData {
  outcome: 'victory' | 'defeat';
  stageId: string;
  rewards?: BattleRewards;
}

/** Victory rewards / defeat screen. */
export class ResultsScene extends Phaser.Scene {
  private payload!: ResultsData;

  constructor() {
    super(SCENES.RESULTS);
  }

  init(data: ResultsData): void {
    this.payload = data;
  }

  create(): void {
    drawBackground(this, this.payload.outcome === 'victory' ? 'village' : 'cave', { decorY: GAME_HEIGHT - 140, decorCount: 4, particles: 6 });
    fadeIn(this);
    if (this.payload.outcome === 'victory') this.victory();
    else this.defeat();
  }

  private victory(): void {
    const r = this.payload.rewards!;
    const stage = getStage(this.payload.stageId);
    const cx = GAME_WIDTH / 2;
    new Panel(this, cx, 560, 640, 840, 'ui_panel').setDepth(DEPTH.content);
    const title = this.add.text(cx, 200, 'VICTORY!', titleStyle(72, { color: TEXT.gold, strokeThickness: 8 })).setOrigin(0.5).setDepth(DEPTH.content + 1).setScale(motion.pop(1.6));
    this.tweens.add({ targets: title, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.add.text(cx, 262, `${stage.name} cleared`, textStyle(28, { color: TEXT.light })).setOrigin(0.5).setDepth(DEPTH.content + 1);

    let y = 330;
    // Gold
    const coin = this.add.sprite(cx - 150, y, 'item_CoinAnim', 0).setScale(5).setDepth(DEPTH.content + 1);
    if (this.anims.exists('coin_spin')) coin.play('coin_spin');
    const goldText = this.add.text(cx - 100, y, '+0 gold', textStyle(36, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
    this.countUp(goldText, r.gold, 'gold', 700, () => audio.play('coin', { volume: 0.5 }));
    y += 70;
    // XP
    const xpText = this.add.text(cx - 100, y, '+0 XP', textStyle(36, { color: TEXT.blue, align: 'left' })).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
    this.add.image(cx - 150, y, 'item_Scroll').setScale(4).setDepth(DEPTH.content + 1);
    this.countUp(xpText, r.xp, 'XP', 700);
    y += 60;
    const xpBar = new HealthBar(this, cx, y, { width: 480, height: 30, fillColor: COLORS.blue, lowColor: COLORS.blue, label: 'XP', fontSize: 20 });
    xpBar.setDepth(DEPTH.content + 1);
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
    y += 54;

    if (r.levelUp) {
      const lu = r.levelUp;
      const t = this.add.text(cx, y, `LEVEL UP!  Lv ${lu.from} -> Lv ${lu.to}`, textStyle(38, { color: TEXT.green })).setOrigin(0.5).setDepth(DEPTH.content + 1).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, scale: { from: motion.pop(1.5), to: 1 }, delay: 900, duration: 350, ease: 'Back.easeOut', onStart: () => audio.play('levelup') });
      y += 44;
      const details = [`+${lu.hpGained} max HP`, `+${Math.round((lu.to - lu.from) * 2)}% attack`];
      if (lu.skillPointsGained) details.push(`+${lu.skillPointsGained} skill point`);
      this.add.text(cx, y, details.join('   '), textStyle(22, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content + 1);
      y += 44;
    }

    if (r.drops.length || r.dropsLost.length) {
      this.add.text(cx, y, 'Loot', textStyle(26, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.content + 1);
      y += 36;
      for (const id of r.drops) {
        const item = getItem(id);
        if (!item) continue;
        const row = this.add.container(cx, y).setDepth(DEPTH.content + 1);
        if (this.textures.exists(item.icon)) row.add(this.add.image(-200, 0, item.icon).setScale(3));
        row.add(this.add.text(-160, 0, `${item.name}  (${RARITY_LABEL[item.rarity]})`, textStyle(24, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5));
        y += 40;
      }
      for (const id of r.dropsLost) {
        const item = getItem(id);
        this.add.text(cx, y, `${item?.name ?? id} lost - bag full!`, textStyle(22, { color: TEXT.red })).setOrigin(0.5).setDepth(DEPTH.content + 1);
        y += 36;
      }
    }

    if (r.highestRank > 0) {
      this.add.text(cx, y + 6, `Best ninja this battle: ${rankName(r.highestRank)}`, textStyle(22, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    }
    if (r.unlockedStageId) {
      this.add.text(cx, y + 40, `New stage unlocked: ${getStage(r.unlockedStageId).name}`, textStyle(24, { color: TEXT.green })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    }

    // Buttons
    const next = nextStage(this.payload.stageId);
    let by = 800;
    if (next && progression.isUnlocked(next.id)) {
      new Button(this, cx, by, `Next: ${next.name}`, () => goTo(this, SCENES.BATTLE, { stageId: next.id }), { width: 500, height: 92, fontSize: 30, color: TEXT.gold }).setDepth(DEPTH.content + 1);
      by += 108;
    }
    new Button(this, cx, by, 'World Map', () => goTo(this, SCENES.WORLD_MAP), { width: 500, height: 88 }).setDepth(DEPTH.content + 1);
    by += 104;
    new Button(this, cx, by, 'Village', () => goTo(this, SCENES.VILLAGE), { width: 500, height: 88 }).setDepth(DEPTH.content + 1);
  }

  private defeat(): void {
    const cx = GAME_WIDTH / 2;
    const stage = getStage(this.payload.stageId);
    new Panel(this, cx, 560, 640, 620, 'ui_panel').setDepth(DEPTH.content);
    this.add.text(cx, 330, 'DEFEAT', titleStyle(72, { color: TEXT.red, strokeThickness: 8 })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    this.add.text(cx, 400, `${stage.name} was too strong... this time.`, textStyle(26, { color: TEXT.light })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    const tips = [
      'Tip: merge the same direction to build a big ninja in a corner.',
      'Tip: Upgrade Vitality in the village for more HP.',
      'Tip: Push potions to the board edge (or tap them) to heal.',
      'Tip: Equipment adds Attack, HP and Defense.',
      'Tip: Watch the "Enemy attack in" counter and set up combos.',
    ];
    this.add.text(cx, 480, Phaser.Utils.Array.GetRandom(tips), textStyle(22, { color: TEXT.muted, wordWrapWidth: 540 })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    this.add.text(cx, 560, 'Your level, gold and gear are safe.', textStyle(22, { color: TEXT.green })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    new Button(this, cx, 680, 'Retry Battle', () => goTo(this, SCENES.BATTLE, { stageId: this.payload.stageId }), { width: 500, height: 92, fontSize: 30, color: TEXT.gold }).setDepth(DEPTH.content + 1);
    new Button(this, cx, 790, 'Return to Village', () => goTo(this, SCENES.VILLAGE), { width: 500, height: 88 }).setDepth(DEPTH.content + 1);
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
