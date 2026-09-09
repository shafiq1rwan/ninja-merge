import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { BOSSES } from '../data/bosses';
import { getStage, REGIONS } from '../data/stages';
import { audio } from '../systems/AudioSystem';
import { progression } from '../systems/ProgressionSystem';
import type { RegionDef, StageDef } from '../types';
import { drawBackground } from '../ui/Background';
import { Button } from '../ui/Button';
import { drawHeader, fadeIn, goTo } from '../ui/Hud';
import { motion } from '../ui/motion';
import { Panel, flatPanel } from '../ui/Panel';
import { COLORS, DEPTH, TEXT, textStyle } from '../ui/theme';

/**
 * Node-based world map. Regions are nodes on a winding path; the selected region's six stages
 * appear in the panel at the bottom. Locked nodes are visibly greyed and labelled.
 */
export class WorldMapScene extends Phaser.Scene {
  private stagePanel?: Phaser.GameObjects.Container;
  private selected?: RegionDef;
  private nodeMarkers = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super(SCENES.WORLD_MAP);
  }

  create(): void {
    drawBackground(this, 'map', { decorY: GAME_HEIGHT + 10, decorCount: 0, particles: 6 });
    fadeIn(this);
    audio.playMusic('music_worldmap');
    drawHeader(this, 'World Map', () => goTo(this, SCENES.VILLAGE), 'Choose your next battle');

    const current = getStage(progression.currentStageId());
    const layoutY = (i: number) => 190 + i * 118;
    const layoutX = (i: number) => (i % 2 === 0 ? 220 : 500);

    // Path
    const path = this.add.graphics().setDepth(DEPTH.background + 1);
    path.lineStyle(14, COLORS.ink, 0.5);
    path.beginPath();
    path.moveTo(GAME_WIDTH / 2, 120);
    REGIONS.forEach((_, i) => path.lineTo(layoutX(i), layoutY(i)));
    path.strokePath();
    path.lineStyle(6, COLORS.parchmentDark, 0.8);
    path.beginPath();
    path.moveTo(GAME_WIDTH / 2, 120);
    REGIONS.forEach((_, i) => path.lineTo(layoutX(i), layoutY(i)));
    path.strokePath();

    // Village start marker
    this.add.text(GAME_WIDTH / 2, 118, 'Village', textStyle(20, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content);

    REGIONS.forEach((region, i) => this.drawRegionNode(region, layoutX(i), layoutY(i)));

    this.selectRegion(REGIONS.find((r) => r.id === current.regionId) ?? REGIONS[0]);
  }

  private drawRegionNode(region: RegionDef, x: number, y: number): void {
    const unlocked = progression.isRegionUnlocked(region.id);
    const prog = progression.regionProgress(region.id);
    const done = prog.done === prog.total;
    const c = this.add.container(x, y).setDepth(DEPTH.content);

    const ring = this.add.circle(0, 0, 46, unlocked ? (done ? COLORS.goldLight : COLORS.parchment) : 0x555049).setStrokeStyle(6, unlocked ? COLORS.woodDark : 0x2a2622);
    c.add(ring);
    const boss = BOSSES[region.stages[5].enemyId];
    const faceKey = boss ? boss.sprite.replace(/_idle$/, '_face') : '';
    if (faceKey && this.textures.exists(faceKey)) {
      const face = this.add.image(0, 0, faceKey).setScale(2);
      if (!unlocked) face.setTint(0x333333);
      c.add(face);
    }
    const labelSide = x < GAME_WIDTH / 2 ? 1 : -1;
    const name = this.add.text(labelSide * 64, -14, region.name, textStyle(28, { color: unlocked ? TEXT.light : TEXT.muted, align: labelSide > 0 ? 'left' : 'right' }))
      .setOrigin(labelSide > 0 ? 0 : 1, 0.5);
    const sub = this.add.text(labelSide * 64, 20, unlocked ? `${prog.done} / ${prog.total} cleared` : 'LOCKED', textStyle(20, { color: unlocked ? TEXT.muted : TEXT.red }))
      .setOrigin(labelSide > 0 ? 0 : 1, 0.5);
    c.add([name, sub]);
    if (done) c.add(this.add.text(30, -34, 'OK', textStyle(18, { color: TEXT.green })).setOrigin(0.5));

    const hit = this.add.circle(0, 0, 56, 0xffffff, 0).setInteractive({ useHandCursor: unlocked });
    c.add(hit);
    hit.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!unlocked) {
        audio.play('cancel');
        this.tweens.add({ targets: c, x: x + 6, duration: 40, yoyo: true, repeat: 2 });
        return;
      }
      audio.play('button');
      this.selectRegion(region);
    });
    this.nodeMarkers.set(region.id, c);
  }

  private selectRegion(region: RegionDef): void {
    this.selected = region;
    for (const [id, node] of this.nodeMarkers) {
      this.tweens.killTweensOf(node);
      node.setScale(1);
      if (id === region.id && !motion.reduced) this.tweens.add({ targets: node, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.stagePanel?.destroy();
    const panelY = GAME_HEIGHT - 240;
    const c = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.stagePanel = c;
    c.add(new Panel(this, GAME_WIDTH / 2, panelY + 20, GAME_WIDTH - 32, 400, 'ui_panel'));
    c.add(this.add.text(GAME_WIDTH / 2, panelY - 150, region.name, textStyle(36, { color: TEXT.gold })).setOrigin(0.5));
    c.add(this.add.text(GAME_WIDTH / 2, panelY - 112, region.subtitle, textStyle(22, { color: TEXT.muted })).setOrigin(0.5));

    const cols = 3;
    const bw = 200;
    const bh = 96;
    const gapX = 16;
    const gapY = 24;
    const startX = GAME_WIDTH / 2 - ((cols - 1) * (bw + gapX)) / 2;
    region.stages.forEach((stage, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (bw + gapX);
      const y = panelY - 40 + row * (bh + gapY);
      c.add(this.stageButton(stage, x, y, bw, bh));
    });
  }

  private stageButton(stage: StageDef, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const unlocked = progression.isUnlocked(stage.id);
    const completed = progression.isCompleted(stage.id);
    const wrap = this.add.container(0, 0);
    const label = stage.isBoss ? `${stage.name}` : stage.name;
    const isNext = unlocked && !completed;
    const btn = new Button(this, x, y, label, () => this.startStage(stage), {
      width: w, height: h, fontSize: 26, disabled: !unlocked, variant: isNext ? 'primary' : 'secondary',
    });
    wrap.add(btn);
    const status = !unlocked ? 'Locked' : completed ? 'Cleared' : stage.isBoss ? 'BOSS' : `Lv ${stage.level}`;
    const color = !unlocked ? TEXT.muted : completed ? TEXT.green : stage.isBoss ? TEXT.gold : TEXT.muted;
    wrap.add(flatPanel(this, x, y + h / 2 + 2, 110, 26, 0x1a1008, 0.9, 8));
    wrap.add(this.add.text(x, y + h / 2 + 2, status, textStyle(18, { color })).setOrigin(0.5));
    return wrap;
  }

  private startStage(stage: StageDef): void {
    if (!progression.isUnlocked(stage.id)) return;
    goTo(this, SCENES.BATTLE, { stageId: stage.id });
  }
}
