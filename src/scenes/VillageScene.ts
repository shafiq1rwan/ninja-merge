import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { charWalkKey, HERO_CHARACTER } from '../data/assets';
import { getStage } from '../data/stages';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Card } from '../ui/Card';
import { drawHeader, fadeIn, goTo, PlayerStrip } from '../ui/Hud';
import { DEPTH, TEXT, textStyle } from '../ui/theme';

/** Hub menu: Continue Adventure, Equipment, Upgrade Ninja, Shop, Settings. */
export class VillageScene extends Phaser.Scene {
  constructor() {
    super(SCENES.VILLAGE);
  }

  create(): void {
    drawBackground(this, 'village', { decorY: 520, decorCount: 6, particles: 6 });
    fadeIn(this);
    audio.playMusic('music_village');
    drawHeader(this, 'Village', undefined, 'Rest, train, then head out');
    new PlayerStrip(this, 150);

    // Hero idling in the square
    const walk = charWalkKey(HERO_CHARACTER);
    if (this.textures.exists(walk)) {
      if (!this.anims.exists('hero_walk')) {
        this.anims.create({ key: 'hero_walk', frames: this.anims.generateFrameNumbers(walk, { frames: [0, 4, 8, 12] }), frameRate: 6, repeat: -1 });
      }
      this.add.sprite(GAME_WIDTH / 2, 505, walk, 0).setScale(7).setOrigin(0.5, 1).setDepth(DEPTH.decor + 2).play('hero_walk');
    }

    const current = getStage(progression.currentStageId());
    const sp = save.data.player.skillPoints;

    const menu = new Card(this, { top: 560, padding: 24, gap: 12 });
    menu.button('Continue Adventure', () => goTo(this, SCENES.WORLD_MAP), { variant: 'primary', icon: 'icon_Kunai', iconScale: 2.5, fontSize: 32, height: 96 });
    menu.text(`Next battle: ${current.name}`, 20, { color: TEXT.muted });
    menu.button('Equipment', () => goTo(this, SCENES.EQUIPMENT), { icon: 'icon_Armor', iconScale: 2.5, fontSize: 30 });
    menu.button(sp > 0 ? `Upgrade Ninja  (${sp} skill point${sp > 1 ? 's' : ''}!)` : 'Upgrade Ninja', () => goTo(this, SCENES.UPGRADE), { icon: 'icon_AttackUpgrade', iconScale: 2.5, fontSize: 30, color: sp > 0 ? TEXT.green : undefined });
    menu.button('Shop', () => goTo(this, SCENES.SHOP), { icon: 'icon_Money', iconScale: 2.5, fontSize: 30 });
    menu.button('Settings', () => goTo(this, SCENES.SETTINGS), { icon: 'icon_Repair', iconScale: 2.5, fontSize: 30 });
    menu.finish();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'Progress saves automatically', textStyle(18, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content);
  }
}
