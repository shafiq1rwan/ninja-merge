import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { UPGRADES } from '../data/balance';
import { UPGRADE_DEFS } from '../data/progression';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Card } from '../ui/Card';
import { drawHeader, fadeIn, goTo, PlayerStrip } from '../ui/Hud';
import { motion } from '../ui/motion';
import { toast } from '../ui/Toast';
import { DEPTH, TEXT, textStyle } from '../ui/theme';

type UpgradeId = (typeof UPGRADE_DEFS)[number]['id'];

/** Permanent training upgrades bought with gold (or free with skill points). */
export class UpgradeScene extends Phaser.Scene {
  private strip!: PlayerStrip;
  private dynamic: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super(SCENES.UPGRADE);
  }

  create(): void {
    drawBackground(this, 'village', { decorY: GAME_HEIGHT + 20, decorCount: 0, particles: 4 });
    fadeIn(this);
    drawHeader(this, 'Upgrade Ninja', () => goTo(this, SCENES.VILLAGE), 'Permanent training - cost doubles each level');
    this.strip = new PlayerStrip(this, 150);
    this.render();
  }

  private render(): void {
    for (const o of this.dynamic) o.destroy(true);
    this.dynamic = [];
    this.strip.refresh();
    const sp = save.data.player.skillPoints;
    this.dynamic.push(
      this.add.text(GAME_WIDTH / 2, 214, sp > 0 ? `${sp} skill point${sp > 1 ? 's' : ''} available - spend for free training!` : 'Every 3 player levels grants a skill point for free training', textStyle(20, { color: sp > 0 ? TEXT.green : TEXT.muted }))
        .setOrigin(0.5).setDepth(DEPTH.content),
    );

    let top = 244;
    for (const def of UPGRADE_DEFS) {
      const level = progression.upgradeLevel(def.id);
      const cost = progression.upgradeCost(def.id);
      const maxed = level >= UPGRADES.maxLevel;
      const card = new Card(this, { top, padding: 16, gap: 10 });
      card.custom(96, (cx, t, w) => {
        const objs: Phaser.GameObjects.GameObject[] = [];
        const left = cx - w / 2;
        if (this.textures.exists(def.icon)) objs.push(this.add.image(left + 44, t + 48, def.icon).setScale(3.2));
        objs.push(this.add.text(left + 96, t + 4, def.name, textStyle(28, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0));
        objs.push(this.add.text(left + 96, t + 40, `${def.perLevel} per level  -  ${def.description}`, textStyle(19, { color: TEXT.light, align: 'left', wordWrapWidth: w - 230 })).setOrigin(0, 0));
        objs.push(this.add.text(cx + w / 2, t + 8, `Lv ${level} / ${UPGRADES.maxLevel}`, textStyle(22, { color: TEXT.muted, align: 'right' })).setOrigin(1, 0));
        // Level pips
        const g = this.add.graphics();
        const pipW = 10;
        const pips = UPGRADES.maxLevel;
        const pipGap = 3;
        const totalW = pips * pipW + (pips - 1) * pipGap;
        for (let i = 0; i < pips; i++) {
          g.fillStyle(i < level ? 0xd9a441 : 0x3a2f26, 1);
          g.fillRect(cx + w / 2 - totalW + i * (pipW + pipGap), t + 40, pipW, 8);
        }
        objs.push(g);
        return objs;
      });
      const defs = [{
        label: maxed ? 'MAXED' : `Train  -  ${cost} gold`,
        onClick: () => this.buy(def.id),
        opts: { variant: 'primary' as const, fontSize: 24, disabled: maxed || !progression.canUpgrade(def.id), icon: maxed ? undefined : 'item_GoldCoin', iconScale: 3 },
      }];
      if (sp > 0 && !maxed) defs.push({ label: 'Use skill point', onClick: () => this.spendSp(def.id), opts: { variant: 'secondary' as unknown as 'primary', fontSize: 22, disabled: false, icon: undefined, iconScale: 3 } });
      card.buttonRow(defs, 76);
      const c = card.finish();
      this.dynamic.push(c);
      top = card.bottom + 12;
    }
  }

  private buy(id: UpgradeId): void {
    if (progression.buyUpgrade(id)) {
      audio.play('powerup');
      toast(this, 'Training complete!', TEXT.green);
      this.render();
    } else {
      audio.play('cancel');
      toast(this, 'Not enough gold', TEXT.red);
    }
  }

  private spendSp(id: UpgradeId): void {
    if (progression.spendSkillPoint(id)) {
      audio.play('levelup');
      toast(this, 'Skill point spent!', TEXT.green);
      this.render();
    }
  }
}
