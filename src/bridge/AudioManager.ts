// [8] Bộ quản lý âm thanh (GDD 08 §7): nhạc nền theo khuôn văn minh & tâm trạng, âm thanh môi trường theo cảnh, âm báo sự kiện quan trọng
import type { SceneDescriptor } from '@core/index';
import type { UserSettings } from './SettingsStore';

export type MusicMood = 'yen_binh' | 'cang_thang' | 'tang_toc';
export type AmbientKind = 'mua' | 'dong_que' | 'cho' | 'song_nuoc';
export type SfxKind = 'decision' | 'newYear' | 'cutscene' | 'death' | 'saved' | 'error' | 'click';

export interface AudioConfig {
  music: Record<
    string,
    Record<
      MusicMood,
      {
        tempoBpm: number;
        notes: number[];
        wave: OscillatorType;
        gain: number;
      }
    >
  >;
  ambient: Record<
    AmbientKind,
    {
      type: string;
      baseFreq: number;
      gain: number;
    }
  >;
  sfx: Record<
    SfxKind,
    {
      freqs: number[];
      durationMs: number;
      wave: OscillatorType;
      gain: number;
    }
  >;
}

const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  music: {
    nho_giao: {
      yen_binh: { tempoBpm: 68, notes: [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66], wave: 'sine', gain: 0.08 },
      cang_thang: { tempoBpm: 92, notes: [220.0, 246.94, 261.63, 329.63, 293.66, 261.63, 246.94, 196.0], wave: 'triangle', gain: 0.09 },
      tang_toc: { tempoBpm: 52, notes: [196.0, 220.0, 261.63, 220.0, 174.61, 196.0, 164.81, 146.83], wave: 'sine', gain: 0.07 },
    },
  },
  ambient: {
    mua: { type: 'rain', baseFreq: 620, gain: 0.04 },
    dong_que: { type: 'breeze', baseFreq: 340, gain: 0.025 },
    cho: { type: 'market', baseFreq: 480, gain: 0.03 },
    song_nuoc: { type: 'water', baseFreq: 280, gain: 0.03 },
  },
  sfx: {
    decision: { freqs: [523.25, 659.25, 783.99], durationMs: 140, wave: 'triangle', gain: 0.14 },
    newYear: { freqs: [392.0, 523.25], durationMs: 160, wave: 'sine', gain: 0.12 },
    cutscene: { freqs: [440.0, 554.37, 659.25, 880.0], durationMs: 150, wave: 'triangle', gain: 0.15 },
    death: { freqs: [293.66, 246.94, 196.0], durationMs: 240, wave: 'sine', gain: 0.14 },
    saved: { freqs: [587.33, 880.0], durationMs: 90, wave: 'sine', gain: 0.1 },
    error: { freqs: [220.0, 185.0], durationMs: 110, wave: 'sawtooth', gain: 0.1 },
    click: { freqs: [660.0], durationMs: 35, wave: 'sine', gain: 0.06 },
  },
};

export class AudioManager {
  private config: AudioConfig = DEFAULT_AUDIO_CONFIG;
  private ctx: AudioContext | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;
  private currentMood: MusicMood = 'yen_binh';
  private currentAmbient: AmbientKind = 'dong_que';
  private currentCulture = 'nho_giao';
  private settings: Pick<UserSettings, 'musicVolume' | 'ambientVolume' | 'sfxVolume' | 'muted'> = {
    musicVolume: 60,
    ambientVolume: 50,
    sfxVolume: 70,
    muted: false,
  };

  constructor() {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('assets/common/placeholder/audio.json')
        .then((r) => r.json() as Promise<AudioConfig>)
        .then((cfg) => {
          if (cfg && cfg.music && cfg.sfx) this.config = cfg;
        })
        .catch(() => {
          // Giữ cấu hình mặc định khi chạy môi trường không có mạng/file
        });
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.settings.muted) return null;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  applySettings(settings: Pick<UserSettings, 'musicVolume' | 'ambientVolume' | 'sfxVolume' | 'muted'>): void {
    this.settings = { ...settings };
    if (settings.muted || settings.musicVolume <= 0) {
      this.stopMusicLoop();
    }
  }

  syncScene(scene: SceneDescriptor | null, stress = 0, mourningMonths = 0): void {
    if (!scene) {
      this.stopMusicLoop();
      return;
    }
    this.currentCulture = scene.cultureSet || 'nho_giao';
    const nextMood: MusicMood =
      mourningMonths > 0 || scene.condition === 'cu_tang'
        ? 'tang_toc'
        : stress >= 65 || scene.condition === 'ngheo_doi' || scene.condition === 'ngap_lut'
          ? 'cang_thang'
          : 'yen_binh';

    const nextAmbient: AmbientKind =
      scene.weather === 'mua' || scene.weather === 'bao'
        ? 'mua'
        : scene.location === 'thi_tran_ben_song' || scene.location === 'phu_thanh'
          ? 'cho'
          : 'dong_que';

    const moodChanged = nextMood !== this.currentMood;
    this.currentMood = nextMood;
    this.currentAmbient = nextAmbient;

    if (moodChanged && this.musicTimer) {
      this.stopMusicLoop();
      this.startMusicLoop();
    }
  }

  startMusicLoop(): void {
    if (this.musicTimer || this.settings.muted || this.settings.musicVolume <= 0) return;
    if (typeof window === 'undefined') return;
    const pack = this.config.music[this.currentCulture] ?? this.config.music.nho_giao;
    const track = pack?.[this.currentMood] ?? DEFAULT_AUDIO_CONFIG.music.nho_giao.yen_binh;
    const intervalMs = Math.max(400, Math.round((60 / track.tempoBpm) * 1000));
    this.musicTimer = setInterval(() => {
      this.playMusicStep();
    }, intervalMs);
  }

  stopMusicLoop(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playMusicStep(): void {
    if (this.settings.muted || this.settings.musicVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const pack = this.config.music[this.currentCulture] ?? this.config.music.nho_giao;
    const track = pack?.[this.currentMood] ?? DEFAULT_AUDIO_CONFIG.music.nho_giao.yen_binh;
    const freq = track.notes[this.noteIndex % track.notes.length] ?? 261.63;
    this.noteIndex += 1;

    const vol = (this.settings.musicVolume / 100) * track.gain;
    this.playTone(ctx, freq, 0.35, track.wave, vol);

    // Chèn âm thanh môi trường nhẹ vào nhịp
    if (this.settings.ambientVolume > 0 && this.noteIndex % 3 === 0) {
      const amb = this.config.ambient[this.currentAmbient] ?? DEFAULT_AUDIO_CONFIG.ambient.dong_que;
      const ambVol = (this.settings.ambientVolume / 100) * amb.gain;
      this.playTone(ctx, amb.baseFreq, 0.18, 'sine', ambVol);
    }
  }

  playSfx(kind: SfxKind): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const spec = this.config.sfx[kind] ?? DEFAULT_AUDIO_CONFIG.sfx.click;
    const vol = (this.settings.sfxVolume / 100) * spec.gain;
    const stepSec = Math.max(0.04, spec.durationMs / 1000);
    spec.freqs.forEach((f, idx) => {
      this.playTone(ctx, f, stepSec, spec.wave, vol, idx * stepSec * 0.85);
    });
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    durationSec: number,
    wave: OscillatorType,
    gainValue: number,
    delaySec = 0,
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + delaySec;
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + durationSec + 0.02);
    } catch {
      // Bỏ qua nếu trình duyệt chặn tự phát âm thanh trước khi người dùng tương tác
    }
  }

  getState(): { mood: MusicMood; ambient: AmbientKind; culture: string } {
    return {
      mood: this.currentMood,
      ambient: this.currentAmbient,
      culture: this.currentCulture,
    };
  }
}
