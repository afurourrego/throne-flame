import { describe, expect, test } from 'vitest';
import { RF } from '../../games/throne-flame/sim/rules';
import { keyIntent, nextPrice, seasonRunning } from '../../games/throne-flame/ui/input';

const key = (code: string, type = 'keydown', repeat = false) => keyIntent({ code, type, repeat });
describe('input', () => {
  test('one log per Space press: repeats and keyups do nothing but are still swallowed', () => {
    expect(key('Space')).toEqual({ intent: 'log', prevent: true });
    expect(key('Space', 'keydown', true)).toEqual({ intent: null, prevent: true });
    expect(key('Space', 'keyup')).toEqual({ intent: null, prevent: true });
  });
  test('T takes, arrows change the price, P/Esc menu, M mute, others ignored', () => {
    expect([key('KeyT').intent, key('ArrowLeft').intent, key('ArrowRight').intent, key('KeyP').intent, key('Escape').intent, key('KeyM').intent])
      .toEqual(['take', 'lower', 'raise', 'menu', 'menu', 'mute']);
    expect(key('KeyQ')).toEqual({ intent: null, prevent: false });
  });
  test('the season only ticks when nothing holds it', () => {
    const base = { paused: false, menu: false, hidden: false, phase: 'round' as const };
    expect(seasonRunning(base)).toBe(true);
    expect(seasonRunning({ ...base, phase: 'break' })).toBe(true);
    for (const k of ['paused', 'menu', 'hidden'] as const) expect(seasonRunning({ ...base, [k]: true })).toBe(false);
    expect(seasonRunning({ ...base, phase: 'over' })).toBe(false);
  });
  test('price steps of 0.1 RF, clamped to 0.5–50', () => {
    expect([nextPrice(RF, 1), nextPrice(RF / 2n, -1), nextPrice(50n * RF, 1)]).toEqual([RF * 11n / 10n, RF / 2n, 50n * RF]);
  });
});
