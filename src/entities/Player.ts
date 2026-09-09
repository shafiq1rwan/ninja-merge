import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { charFaceKey, HERO_CHARACTER } from '../data/assets';
import { rankName } from '../data/ranks';
import { audio } from '../systems/AudioSystem';
import { HealthBar } from '../ui/HealthBar';
import { motion } from '../ui/motion';
import { flatPanel } from '../ui/Panel';
import { COLORS, DEPTH, TEXT, textStyle } from '../ui/theme';

/**
 * Bottom battle HUD: hero portrait, HP bar, player level + XP bar, gold, board rank, status.
 * (The player's battle *state* lives in CombatSystem; this is the view.)
 */
export class PlayerHud extends Phaser.GameObjects.Container {
  private portrait: Phaser.GameObjects.Image;
  private hpBar: HealthBar;
  private xpBar: HealthBar;
  private levelText: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;
  private rankText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, y: number) {
    super(scene, 0, y);
    this.setDepth(DEPTH.hud);
    this.add(flatPanel(scene, GAME_WIDTH / 2, 0, GAME_WIDTH - 20, 150, 0x1a1008, 0.75, 16));

    const faceKey = charFaceKey(HERO_CHARACTER);
    this.portrait = scene.add.image(58, -18, scene.textures.exists(faceKey) ? faceKey : 'ui_emote1').setScale(2.4);
    this.add(this.portrait);
    this.add(scene.add.rectangle(58, -18, 96, 96, 0x000000, 0).setStrokeStyle(4, COLORS.woodLight));

    this.hpBar = new HealthBar(scene, 300, -34, { width: 360, height: 36, fillColor: COLORS.green, lowColor: COLORS.red, label: 'HP' });
    this.add(this.hpBar);

    this.levelText = scene.add.text(122, 8, 'Lv 1', textStyle(24, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5);
    this.add(this.levelText);
    this.xpBar = new HealthBar(scene, 330, 8, { width: 300, height: 22, fillColor: COLORS.blue, lowColor: COLORS.blue, label: 'XP', fontSize: 16 });
    this.add(this.xpBar);

    const coin = scene.add.image(GAME_WIDTH - 130, -40, 'item_GoldCoin').setScale(4);
    this.goldText = scene.add.text(GAME_WIDTH - 108, -40, '0', textStyle(28, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0.5);
    this.add([coin, this.goldText]);

    this.rankText = scene.add.text(122, 46, 'Board Ninja Rank: -', textStyle(20, { color: TEXT.muted, align: 'left' })).setOrigin(0, 0.5);
    this.add(this.rankText);
    this.statusText = scene.add.text(GAME_WIDTH - 130, 46, '', textStyle(20, { color: TEXT.purple })).setOrigin(0.5);
    this.add(this.statusText);

    scene.add.existing(this);
  }

  setHp(hp: number, max: number, animate = true): void {
    if (animate) this.hpBar.set(hp, max);
    else this.hpBar.reset(hp, max);
  }

  setXp(level: number, xp: number, needed: number): void {
    this.levelText.setText(`Lv ${level}`);
    this.xpBar.set(xp, needed, false);
  }

  setGold(gold: number): void {
    this.goldText.setText(`${gold}`);
  }

  setHighestRank(rank: number): void {
    this.rankText.setText(rank > 0 ? `Board Ninja Rank: ${rankName(rank)}` : 'Board Ninja Rank: -');
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }

  /** Portrait flash + shake when the player is hit. */
  hitReaction(): void {
    audio.play('playerHit');
    motion.flashSprite(this.scene, this.portrait, 0xff6b5b, 120);
    motion.shake(this.scene, 0.004, 140);
    this.scene.tweens.killTweensOf(this.portrait);
    this.portrait.setPosition(58, -18);
    this.scene.tweens.add({ targets: this.portrait, x: 58 + 8, duration: 40, yoyo: true, repeat: 2 });
  }

  healReaction(): void {
    motion.flashSprite(this.scene, this.portrait, 0x8fe3c8, 140);
  }

  /** Where player-side floating numbers spawn: over the HP bar, rising within the HUD. */
  get hpBarPoint(): { x: number; y: number } {
    return { x: this.x + 300, y: this.y - 30 };
  }
}
