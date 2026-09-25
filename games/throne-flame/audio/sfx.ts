import type { SimEvent } from '../sim/types';

/**
 * Chiptune action sounds synthesized with Web Audio (square/triangle/saw sweeps and filtered noise): no files, no
 * network. The SDK sound kit keeps the UI and reward cues; these cover the kingdom (logs, coins, crown).
 */
export type SfxName = 'log' | 'coin' | 'crown' | 'lost' | 'reject' | 'tick' | 'crackle' | 'pot';
type Def = Readonly<{ wave: OscillatorType | 'noise'; from: number; to: number; ms: number; gain: number; gap: number }>;
export const SFX: Readonly<Record<SfxName, Def>> = {
  log: { wave: 'noise', from: 900, to: 260, ms: 70, gain: 0.07, gap: 60 },        // a log thuds into the fire
  coin: { wave: 'triangle', from: 1320, to: 1760, ms: 60, gain: 0.05, gap: 50 },  // tribute / price set
  crown: { wave: 'square', from: 660, to: 1320, ms: 220, gain: 0.07, gap: 300 },  // a new king
  lost: { wave: 'sawtooth', from: 300, to: 90, ms: 260, gain: 0.07, gap: 300 },   // the throne falls empty
  reject: { wave: 'square', from: 220, to: 180, ms: 80, gain: 0.05, gap: 150 },
  tick: { wave: 'square', from: 1500, to: 1100, ms: 25, gain: 0.04, gap: 120 },   // last 5 seconds
  crackle: { wave: 'noise', from: 4000, to: 2500, ms: 30, gain: 0.02, gap: 90 },
  pot: { wave: 'triangle', from: 880, to: 1760, ms: 320, gain: 0.08, gap: 400 },  // someone takes the pot
};
export const SFX_FOR_EVENT: Readonly<Partial<Record<SimEvent['type'], SfxName>>> = {
  log: 'log', potWon: 'pot', throneTaken: 'crown', throneLost: 'lost', priceSet: 'coin', rejected: 'reject', priceChanged: 'reject',
};

/** A sound cannot repeat faster than its gap, so a burst of logs never saturates the mix. */
export class Throttle {
  private last = new Map<SfxName, number>();
  allow(name: SfxName, now: number): boolean {
    const prev = this.last.get(name);
    if (prev !== undefined && now - prev < SFX[name].gap) return false;
    this.last.set(name, now);
    return true;
  }
}

const MAX_VOICES = 8, MASTER = 0.8;
export function createSfx() {
  let ctx: AudioContext | null = null, master: GainNode | null = null, noise: AudioBuffer | null = null, muted = true, voices = 0;
  const throttle = new Throttle();
  const onVisibility = () => { if (document.hidden) void ctx?.suspend(); else if (!muted) void ctx?.resume(); };
  document.addEventListener('visibilitychange', onVisibility);
  return {
    /** Call from a player gesture (autoplay rules). */
    async unlock(): Promise<boolean> {
      try {
        if (!ctx) {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return false;
          ctx = new AC();
          master = ctx.createGain(); master.gain.value = muted ? 0 : MASTER; master.connect(ctx.destination);
          noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
          const d = noise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        await ctx.resume();
        return true;
      } catch { return false; }
    },
    setMuted(value: boolean): void { muted = value; if (master) master.gain.value = value ? 0 : MASTER; },
    play(name: SfxName): boolean {
      if (!ctx || !master || !noise || muted || document.hidden || ctx.state !== 'running' || voices >= MAX_VOICES) return false;
      if (!throttle.allow(name, performance.now())) return false;
      const def = SFX[name], t = ctx.currentTime, end = t + def.ms / 1000, env = ctx.createGain();
      env.gain.setValueAtTime(def.gain, t); env.gain.exponentialRampToValueAtTime(0.0001, end); env.connect(master);
      let src: AudioScheduledSourceNode;
      if (def.wave === 'noise') {
        const n = ctx.createBufferSource(), f = ctx.createBiquadFilter();
        n.buffer = noise; f.type = 'bandpass';
        f.frequency.setValueAtTime(def.from, t); f.frequency.exponentialRampToValueAtTime(def.to, end);
        n.connect(f); f.connect(env); src = n;
      } else {
        const o = ctx.createOscillator();
        o.type = def.wave; o.frequency.setValueAtTime(def.from, t); o.frequency.exponentialRampToValueAtTime(def.to, end);
        o.connect(env); src = o;
      }
      voices++;
      src.onended = () => { voices--; env.disconnect(); };
      src.start(t); src.stop(end + 0.02);
      return true;
    },
    dispose(): void { document.removeEventListener('visibilitychange', onVisibility); void ctx?.close(); ctx = null; master = null; },
  };
}
export type Sfx = ReturnType<typeof createSfx>;
