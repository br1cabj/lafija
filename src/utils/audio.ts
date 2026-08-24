// Web Audio API Synthesizer & Mobile Haptics Engine (No external sound files required)

const MUTED_KEY = 'lafija_sound_muted';

function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeMutedPreference(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    // Storage bloqueado (p.ej. Safari privado): se ignora.
  }
}

interface ToneOptions {
  type: OscillatorType;
  /** Frecuencia inicial en Hz */
  freq: number;
  /** Frecuencia final opcional para rampa exponencial */
  freqEnd?: number;
  /** Duración de la rampa de frecuencia (default: duración completa) */
  freqRampTime?: number;
  duration: number;
  peakGain: number;
  startDelay?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = readMutedPreference();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.getContext();
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('click', unlock);
      };
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    writeMutedPreference(this.isMuted);
    return this.isMuted;
  }

  /** Reproduce una nota con envolvente de ganancia exponencial. */
  private playTone(ctx: AudioContext, opts: ToneOptions): void {
    const now = ctx.currentTime + (opts.startDelay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        opts.freqEnd,
        now + (opts.freqRampTime ?? opts.duration),
      );
    }

    gain.gain.setValueAtTime(opts.peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + opts.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + opts.duration);
  }

  // Cyber Chime when a condition is met (HIT!)
  public playHitSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.playTone(ctx, {
      type: 'sine',
      freq: 880, // A5
      freqEnd: 1318.5, // E6
      freqRampTime: 0.15,
      duration: 0.35,
      peakGain: 0.18,
    });
    this.vibrate([40, 30, 60]);
  }

  // Victorious Esports Fanfare when a full bet is WON!
  public playWinSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      this.playTone(ctx, {
        type: 'triangle',
        freq,
        duration: 0.6,
        peakGain: 0.2,
        startDelay: index * 0.08,
      });
    });

    this.vibrate([100, 50, 100, 50, 200]);
  }

  // Warning pulse for Clutch danger moments
  public playDangerSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.25);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    this.vibrate([120, 60, 120]);
  }

  // Subtle UI click sound
  public playClickSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.playTone(ctx, {
      type: 'sine',
      freq: 1200,
      duration: 0.04,
      peakGain: 0.05,
    });
  }

  // Mobile Native Haptics
  private vibrate(pattern: number[]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe ignore
      }
    }
  }
}

export const sounds = new SoundEngine();
