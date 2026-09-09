import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { UPGRADES } from '../data/balance';
import { UPGRADE_DEFS } from '../data/progression';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Button } from '../ui/Button';
import { drawHeader, fadeIn, goTo, PlayerStrip } from '../ui/Hud';
import { motion } from '../ui/motion';
import { Panel } from '../ui/Panel';
import { toast } from '../ui/Toast';
import { DEPTH, TEXT, textStyle } from '../ui/theme';

/** Permanent training upgrades bought with gold (or free with skill points). */
export class UpgradeScene extends Phaser.Scene {
  private strip!: PlayerStrip;
  private rows: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super(SCENES.UPGRADE);
  }

  create(): void {
    drawBackground(this, 'village', { decorY: GAME_HEIGHT + 20, decorCount: 0, particles: 4 });
    fadeIn(this);
    drawHeader(this, 'Upgrade Ninja', () => goTo(this, SCENES.VILLAGE), 'Permanent training - costs double each level');
    this.strip = new PlayerStrip(this, 150);
    this.render();
  }

  private render(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
    this.strip.refresh();
    const cx = GAME_WIDTH / 2;
    const sp = save.data.player.skillPoints;
    this.rows.push(
      this.add.text(cx, 222, sp > 0 ? `Skill points available: ${sp}  (free training!)` : 'Level up every 3 levels to earn skill points', textStyle(22, { color: sp > 0 ? TEXT.green : TEXT.muted }))
        .setOrigin(0.5).setDepth(DEPTH.content),
    );

    UPGRADE_DEFS.forEach((def, i) => {
      const y = 330 + i * 212;
      const level = progression.upgradeLevel(def.id);
      const cost = progression.upgradeCost(def.id);
      const maxed = level >= UPGRADES.maxLevel;
      const c = this.add.container(0, 0).setDepth(DEPTH.content);
      c.add(new Panel(this, cx, y, GAME_WIDTH - 48, 190, 'ui_panel'));
      if (this.textures.exists(def.icon)) c.add(this.add.image(80, y - 30, def.icon).setScale(3.5));
      c.add(this.add.text(140, y - 62, def.name, textStyle(30, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0.5));
      c.add(this.add.text(140, y - 26, `Level ${level} / ${UPGRADES.maxLevel}   -   ${def.perLevel} per level`, textStyle(21, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5));
      c.add(this.add.text(140, y + 4, def.description, textStyle(19, { color: TEXT.muted, align: 'left' })).setOrigin(0, 0.5));

      const buy = new Button(this, sp > 0 ? cx - 130 : cx + 70, y + 56, maxed ? 'MAXED' : `Train  ${cost} g`, () => this.buy(def.id, c), {
        width: sp > 0 ? 300 : 380, height: 76, fontSize: 24, disabled: maxed || !progression.canUpgrade(def.id), icon: maxed ? undefined : 'item_GoldCoin', iconScale: 3,
      });
      c.add(buy);
      if (sp > 0 && !maxed) {
        c.add(new Button(this, cx + 190, y + 56, 'Use skill point', () => this.spendSp(def.id, c), { width: 300, height: 76, fontSize: 22, color: TEXT.green }));
      }
      this.rows.push(c);
    });
  }

  private buy(id: (typeof UPGRADE_DEFS)[number]['id'], card: Phaser.GameObjects.Container): void {
    if (progression.buyUpgrade(id)) {
      audio.play('powerup');
      this.flash(card);
      toast(this, 'Training complete!', TEXT.green);
      this.render();
    } else {
      audio.play('cancel');
      toast(this, 'Not enough gold', TEXT.red);
    }
  }

  private spendSp(id: (typeof UPGRADE_DEFS)[number]['id'], card: Phaser.GameObjects.Container): void {
    if (progression.spendSkillPoint(id)) {
      audio.play('levelup');
      this.flash(card);
      toast(this, 'Skill point spent!', TEXT.green);
      this.render();
    }
  }

  private flash(card: Phaser.GameObjects.Container): void {
    if (motion.reduced) return;
    this.tweens.add({ targets: card, scaleX: 1.02, scaleY: 1.02, duration: 90, yoyo: true });
  }
}
