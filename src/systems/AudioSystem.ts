import Phaser from 'phaser';
import type { SfxKey } from '../data/assets';
import { save } from './SaveSystem';

/**
 * Thin wrapper over Phaser's global sound manager.
 * - Reads volumes/mutes from the save settings.
 * - Handles mobile autoplay: if the AudioContext is locked, music starts on the 'unlocked' event.
 * - One looping music track at a time.
 */
export class AudioSystem {
  private game: Phaser.Game | null = null;
  private music: Phaser.Sound.BaseSound | null = null;
  private musicKey: string | null = null;
  private pendingMusic: string | null = null;

  attach(game: Phaser.Game): void {
    this.game = game;
    game.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
      if (this.pendingMusic) {
        const key = this.pendingMusic;
        this.pendingMusic = null;
        this.playMusic(key);
      }
    });
    game.sound.pauseOnBlur = true;
  }

  private get sound(): Phaser.Sound.BaseSoundManager | null {
    return this.game?.sound ?? null;
  }

  private get settings() {
    return save.data.settings;
  }

  get musicVolume(): number {
    return this.settings.musicMuted ? 0 : this.settings.musicVolume;
  }

  get sfxVolume(): number {
    return this.settings.sfxMuted ? 0 : this.settings.sfxVolume;
  }

  /** Whether the browser still requires a user gesture before audio can play. */
  get locked(): boolean {
    return !!this.sound?.locked;
  }

  playMusic(key: string): void {
    const sound = this.sound;
    if (!sound) return;
    if (sound.locked) {
      this.pendingMusic = key;
      return;
    }
    if (this.musicKey === key && this.music?.isPlaying) return;
    this.stopMusic();
    if (!this.game?.cache.audio.exists(key)) return;
    try {
      this.music = sound.add(key, { loop: true, volume: this.musicVolume });
      this.musicKey = key;
      this.music.play();
    } catch (err) {
      console.warn('[Audio] could not play music', key, err);
    }
  }

  stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
      this.musicKey = null;
    }
  }

  play(key: SfxKey, opts: { volume?: number; rate?: number; detune?: number } = {}): void {
    const sound = this.sound;
    if (!sound || sound.locked) return;
    const vol = this.sfxVolume * (opts.volume ?? 1);
    if (vol <= 0) return;
    const full = `sfx_${key}`;
    if (!this.game?.cache.audio.exists(full)) return;
    try {
      sound.play(full, { volume: vol, rate: opts.rate ?? 1, detune: opts.detune ?? 0 });
    } catch (err) {
      console.warn('[Audio] could not play sfx', key, err);
    }
  }

  /** Re-apply volumes after a settings change. */
  refresh(): void {
    if (this.music && 'setVolume' in this.music) {
      (this.music as Phaser.Sound.WebAudioSound).setVolume(this.musicVolume);
    }
  }

  setMusicVolume(v: number): void {
    this.settings.musicVolume = Phaser.Math.Clamp(v, 0, 1);
    this.refresh();
  }

  setSfxVolume(v: number): void {
    this.settings.sfxVolume = Phaser.Math.Clamp(v, 0, 1);
  }

  setMusicMuted(m: boolean): void {
    this.settings.musicMuted = m;
    this.refresh();
  }

  setSfxMuted(m: boolean): void {
    this.settings.sfxMuted = m;
  }
}

export const audio = new AudioSystem();
