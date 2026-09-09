import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_TITLE, GAME_VERSION, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { rankName } from '../data/ranks';
import { audio } from '../systems/AudioSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Card } from '../ui/Card';
import { drawHeader, fadeIn, goTo } from '../ui/Hud';
import { confirmModal, Modal } from '../ui/Modal';
import { Slider } from '../ui/Slider';
import { toast } from '../ui/Toast';
import { Toggle } from '../ui/Toggle';
import { DEPTH, TEXT, textStyle } from '../ui/theme';

/** Audio, accessibility and save-management settings. All changes persist immediately. */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SETTINGS);
  }

  create(): void {
    drawBackground(this, 'village', { decorY: GAME_HEIGHT + 20, decorCount: 0, particles: 3 });
    fadeIn(this);
    drawHeader(this, 'Settings', () => goTo(this, SCENES.VILLAGE));
    const s = save.data.settings;

    // Audio
    const audioCard = new Card(this, { top: 124, padding: 22, gap: 10 });
    audioCard.text('Audio', 26, { color: TEXT.gold });
    this.sliderRow(audioCard, 'Music volume', s.musicVolume, (v) => { audio.setMusicVolume(v); save.persist(); });
    this.sliderRow(audioCard, 'Sound effects volume', s.sfxVolume, (v) => { audio.setSfxVolume(v); save.persist(); audio.play('button'); });
    audioCard.object(new Toggle(this, audioCard.x, 0, audioCard.innerWidth, 'Mute music', s.musicMuted, (v) => { audio.setMusicMuted(v); save.persist(); }), 56);
    audioCard.object(new Toggle(this, audioCard.x, 0, audioCard.innerWidth, 'Mute sound effects', s.sfxMuted, (v) => { audio.setSfxMuted(v); save.persist(); }), 56);
    audioCard.finish();

    // Display & accessibility
    const display = new Card(this, { top: audioCard.bottom + 14, padding: 22, gap: 10 });
    display.text('Display & Accessibility', 26, { color: TEXT.gold });
    display.object(new Toggle(this, display.x, 0, display.innerWidth, 'Screen shake', s.screenShake, (v) => { s.screenShake = v; save.persist(); }), 56);
    display.object(new Toggle(this, display.x, 0, display.innerWidth, 'Damage numbers', s.damageNumbers, (v) => { s.damageNumbers = v; save.persist(); }), 56);
    display.object(new Toggle(this, display.x, 0, display.innerWidth, 'Reduced motion', s.reducedMotion, (v) => { s.reducedMotion = v; save.persist(); }), 56);
    display.finish();

    // Save data
    const data = new Card(this, { top: display.bottom + 14, padding: 22, gap: 12 });
    data.text('Save Data', 26, { color: TEXT.gold });
    data.buttonRow([
      { label: 'Export Save', onClick: () => this.exportSave(), opts: { fontSize: 24 } },
      { label: 'Import Save', onClick: () => this.importSave(), opts: { fontSize: 24 } },
    ], 80);
    data.buttonRow([
      { label: 'Statistics', onClick: () => this.showStats(), opts: { fontSize: 24 } },
      { label: 'Reset Progress', onClick: () => this.resetSave(), opts: { fontSize: 24, variant: 'danger' } },
    ], 80);
    data.finish();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, `${GAME_TITLE} v${GAME_VERSION}\nArt & audio: Ninja Adventure Asset Pack by Pixel-Boy (CC0)`, textStyle(16, { color: TEXT.muted, wordWrapWidth: GAME_WIDTH - 80 }))
      .setOrigin(0.5).setDepth(DEPTH.content + 1);
  }

  private sliderRow(card: Card, label: string, value: number, onChange: (v: number) => void): void {
    card.custom(76, (cx, top, w) => {
      const text = this.add.text(cx - w / 2, top, label, textStyle(22, { color: TEXT.light, align: 'left' })).setOrigin(0, 0);
      const slider = new Slider(this, cx - 60, top + 52, w - 150, value, onChange);
      return [text, slider];
    });
  }

  private async exportSave(): Promise<void> {
    const json = save.exportJson();
    let copied = false;
    try {
      await navigator.clipboard?.writeText(json);
      copied = true;
    } catch {
      copied = false;
    }
    // Also offer a file download (works on desktop; some mobile browsers ignore it).
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ninja-merge-rpg-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.warn('download failed', err);
    }
    if (copied) toast(this, 'Save copied to clipboard (and downloaded)', TEXT.green, 140, 2400);
    else this.showExportFallback(json);
  }

  /** Clipboard blocked: show the JSON in the DOM textarea so the user can copy manually. */
  private showExportFallback(json: string): void {
    const overlay = document.getElementById('import-overlay');
    const text = document.getElementById('import-text') as HTMLTextAreaElement | null;
    const title = document.getElementById('import-title');
    const confirm = document.getElementById('import-confirm') as HTMLButtonElement | null;
    const cancel = document.getElementById('import-cancel') as HTMLButtonElement | null;
    if (!overlay || !text || !confirm || !cancel) return;
    if (title) title.textContent = 'Export Save';
    text.value = json;
    confirm.hidden = true;
    overlay.hidden = false;
    text.focus();
    text.select();
    const close = () => {
      overlay.hidden = true;
      confirm.hidden = false;
      if (title) title.textContent = 'Import Save';
      cancel.removeEventListener('click', close);
    };
    cancel.addEventListener('click', close);
  }

  private importSave(): void {
    const overlay = document.getElementById('import-overlay');
    const text = document.getElementById('import-text') as HTMLTextAreaElement | null;
    const confirm = document.getElementById('import-confirm') as HTMLButtonElement | null;
    const cancel = document.getElementById('import-cancel') as HTMLButtonElement | null;
    if (!overlay || !text || !confirm || !cancel) return;
    text.value = '';
    overlay.hidden = false;
    text.focus();
    const cleanup = () => {
      overlay.hidden = true;
      confirm.removeEventListener('click', onConfirm);
      cancel.removeEventListener('click', onCancel);
    };
    const onCancel = () => cleanup();
    const onConfirm = () => {
      const raw = text.value.trim();
      cleanup();
      try {
        save.importJson(raw);
        audio.refresh();
        audio.play('powerup');
        toast(this, 'Save imported!', TEXT.green);
        this.time.delayedCall(600, () => this.scene.restart());
      } catch (err) {
        audio.play('cancel');
        new Modal(this, { title: 'Import failed', message: String((err as Error).message ?? err), buttons: [{ label: 'OK' }] });
      }
    };
    confirm.addEventListener('click', onConfirm);
    cancel.addEventListener('click', onCancel);
  }

  private resetSave(): void {
    confirmModal(this, 'Reset progress?', 'This deletes your level, gold, gear and stage progress. Settings are kept. This cannot be undone.', () => {
      const settings = { ...save.data.settings };
      save.reset();
      save.data.settings = settings;
      save.persist();
      audio.play('cancel');
      toast(this, 'Progress reset', TEXT.red);
      this.time.delayedCall(500, () => goTo(this, SCENES.TITLE));
    }, 'Reset everything', 'Keep my save');
  }

  private showStats(): void {
    const st = save.data.stats;
    const p = save.data.player;
    const lines = [
      `Player level: ${p.level}`,
      `Battles won: ${st.battlesWon}   lost: ${st.battlesLost}`,
      `Bosses defeated: ${st.bossesDefeated}`,
      `Total merges: ${st.totalMerges}`,
      `Total damage: ${st.totalDamage}`,
      `Critical hits: ${st.criticalHits}`,
      `Best combo: x${st.highestCombo}`,
      `Highest ninja rank: ${st.highestRank ? rankName(st.highestRank) : '-'}`,
      `Gold earned: ${st.goldEarned}`,
      `Potions used: ${st.potionsUsed}   Bombs used: ${st.bombsUsed}`,
    ];
    new Modal(this, { title: 'Statistics', message: lines.join('\n'), buttons: [{ label: 'Close' }] });
  }
}
