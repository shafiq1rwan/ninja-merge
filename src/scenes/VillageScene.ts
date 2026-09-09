import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { charWalkKey, HERO_CHARACTER } from '../data/assets';
import { getStage } from '../data/stages';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Button } from '../ui/Button';
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

    const cx = GAME_WIDTH / 2;
    const current = getStage(progression.currentStageId());
    const items: { label: string; scene: string; icon?: string; sub?: string }[] = [
      { label: 'Continue Adventure', scene: SCENES.WORLD_MAP, icon: 'icon_Kunai', sub: `Next: ${current.name}` },
      { label: 'Equipment', scene: SCENES.EQUIPMENT, icon: 'icon_Armor' },
      { label: 'Upgrade Ninja', scene: SCENES.UPGRADE, icon: 'icon_AttackUpgrade' },
      { label: 'Shop', scene: SCENES.SHOP, icon: 'icon_Money' },
      { label: 'Settings', scene: SCENES.SETTINGS, icon: 'icon_Repair' },
    ];
    let y = 640;
    for (const it of items) {
      const btn = new Button(this, cx, y, it.label, () => goTo(this, it.scene), { width: 520, height: 96, icon: it.icon, iconScale: 2.5, fontSize: 32 });
      btn.setDepth(DEPTH.content);
      if (it.sub) this.add.text(cx, y + 60, it.sub, textStyle(20, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content);
      y += it.sub ? 132 : 112;
    }

    const sp = save.data.player.skillPoints;
    if (sp > 0) {
      this.add.text(cx, GAME_HEIGHT - 40, `You have ${sp} skill point${sp > 1 ? 's' : ''} to spend!`, textStyle(24, { color: TEXT.green })).setOrigin(0.5).setDepth(DEPTH.content);
    }
  }
}
