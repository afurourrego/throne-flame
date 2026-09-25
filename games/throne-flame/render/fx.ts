import type { SimEvent } from '../sim/types';
import type { ArtName, SceneItem } from './art';
import { BURN_AT, FIRE_AT, POT_AT, SEAT_AT, kingSeatAt, seatAnchor } from './layout';

type Pt = Readonly<{ x: number; y: number }>;
type Flight = Readonly<{ kind: ArtName; from: Pt; to: Pt; start: number; ms: number; arc: number }>;
export const LOG_MS = 450;
const MAX = 120;

/** Presentation only: where each log, coin, spark and crown is in flight. Never reads or writes the sim. */
export class Fx {
  private flights: Flight[] = [];
  private fly(kind: ArtName, from: Pt, to: Pt, start: number, ms: number, arc: number) { this.flights.push({ kind, from, to, start, ms, arc }); }

  push(events: readonly SimEvent[], king: number | null, now: number, still: boolean): void {
    if (still) return;
    for (const e of events) {
      if (e.type === 'log') {
        const seat = seatAnchor(king, e.seat);
        this.fly('log', { x: seat.x, y: seat.y - 20 }, FIRE_AT, now, LOG_MS, 30);
        this.fly('spark', FIRE_AT, BURN_AT, now + LOG_MS, 600, 20);
        this.fly('coin', FIRE_AT, POT_AT, now + LOG_MS, 350, 10);
        if (king !== null) this.fly('coin', FIRE_AT, { x: kingSeatAt.x, y: kingSeatAt.y - 20 }, now + LOG_MS, 500, 16);
      } else if (e.type === 'potWon') {
        const to = seatAnchor(king, e.seat);
        for (let i = 0; i < 5; i++) this.fly('coin', POT_AT, { x: to.x, y: to.y - 20 }, now + i * 60, 600, 24);
      } else if (e.type === 'throneTaken') {
        const from = SEAT_AT[e.seat];
        this.fly('crown', { x: from.x, y: from.y - 40 }, { x: kingSeatAt.x, y: kingSeatAt.y - 40 }, now, 500, 30);
      }
    }
    if (this.flights.length > MAX) this.flights.splice(0, this.flights.length - MAX);
  }

  items(now: number): SceneItem[] {
    this.flights = this.flights.filter(f => now < f.start + f.ms);
    return this.flights.filter(f => now >= f.start).map(f => {
      const t = (now - f.start) / f.ms;
      return { kind: f.kind, x: Math.round(f.from.x + (f.to.x - f.from.x) * t), y: Math.round(f.from.y + (f.to.y - f.from.y) * t - f.arc * 4 * t * (1 - t)) };
    });
  }
}
