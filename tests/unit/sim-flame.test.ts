import { describe, expect, test } from 'vitest';
import { RF, RULES, sec } from '../../games/throne-flame/sim/rules';
import { addLog, burnDown, capTicks, newFlame, splitLog } from '../../games/throne-flame/sim/flame';
import { createRng } from '../../games/throne-flame/sim/rng';
import { totalRF } from '../../games/throne-flame/sim/ledger';
import { emptySeason } from '../../games/throne-flame/sim/state';

describe('fire', () => {
  test('a 0.1 RF log splits 40% burn / 50% pot / 10% tribute, exactly', () => {
    expect(splitLog()).toEqual({ burned: RF * 4n / 100n, pot: RF * 5n / 100n, tribute: RF / 100n });
    const p = splitLog(); expect(p.burned + p.pot + p.tribute).toBe(RULES.log.price);
  });
  test('the cap starts at 45 s and loses 5 s every 20 s, reaching 0 at 3:00', () => {
    expect([capTicks(0), capTicks(sec(19.9)), capTicks(sec(20)), capTicks(sec(179.9)), capTicks(sec(180))])
      .toEqual([sec(45), sec(45), sec(40), sec(5), 0]);
  });
  test('the hidden wood limit is between 2:00 and 3:00 and varies with the seed', () => {
    const outs = Array.from({ length: 500 }, (_, i) => newFlame(createRng(i)).woodOut);
    expect(Math.min(...outs)).toBeGreaterThanOrEqual(sec(120));
    expect(Math.max(...outs)).toBeLessThanOrEqual(sec(180));
    expect(new Set(outs).size).toBeGreaterThan(100);
    expect(newFlame(createRng(1))).toMatchObject({ timer: sec(30), elapsed: 0, lastLog: null });
  });
  test('with an empty throne the tribute burns too; the log adds 5 s and marks the last log', () => {
    const s = emptySeason(1); s.flame = newFlame(s.rng);
    expect(addLog(s, 2)).toBe('ok');
    expect(s.seats[2].balance).toBe(10n * RF - RULES.log.price);
    expect(s.pot).toBe(splitLog().pot);
    expect(s.burned.log).toBe(splitLog().burned + splitLog().tribute);
    expect(s.seats[2].burned).toBe(splitLog().burned + splitLog().tribute);
    expect(s.flame).toMatchObject({ timer: sec(35), lastLog: 2 });
    expect(s.seats[2].cooldown).toBe(RULES.log.cooldownTicks);
    expect(s.events).toEqual([{ type: 'log', seat: 2, ante: false }]);
    expect(totalRF(s)).toBe(60n * RF);
  });
  test('the king collects the tribute of every log, their own included', () => {
    const s = emptySeason(1); s.flame = newFlame(s.rng); s.throne.king = 1;
    addLog(s, 3); addLog(s, 1);
    expect(s.seats[1].tribute).toBe(2n * splitLog().tribute);
    expect(s.seats[1].balance).toBe(10n * RF - RULES.log.price + 2n * splitLog().tribute);
    expect(totalRF(s)).toBe(60n * RF);
  });
  test('a log never pushes the timer past the current cap', () => {
    const s = emptySeason(1); s.flame = { ...newFlame(s.rng), timer: sec(44) };
    addLog(s, 0); expect(s.flame.timer).toBe(sec(45));
    s.flame = { ...s.flame, elapsed: sec(100), timer: sec(19) }; s.seats[1].cooldown = 0;
    addLog(s, 1); expect(s.flame.timer).toBe(sec(20)); // cap at 100 s = 45 − 5·5 = 20 s
  });
  test('cooldown and funds reject the log without touching anything', () => {
    const s = emptySeason(1); s.flame = newFlame(s.rng);
    addLog(s, 0);
    const before = JSON.stringify(s, (_, v) => typeof v === 'bigint' ? String(v) : v);
    expect(addLog(s, 0)).toBe('cooldown');
    s.seats[4].balance = RF / 20n;
    expect(addLog(s, 4)).toBe('funds');
    s.seats[4].balance = 10n * RF; // restore to compare
    expect(JSON.stringify(s, (_, v) => typeof v === 'bigint' ? String(v) : v)).toBe(before);
  });
  test('an opening (ante) log pays the split but adds no time, ignores cooldown and is never the last log', () => {
    const s = emptySeason(1); s.flame = newFlame(s.rng); s.seats[0].cooldown = 5;
    expect(addLog(s, 0, true)).toBe('ok');
    expect(s.flame).toMatchObject({ timer: sec(30), lastLog: null });
    expect(s.seats[0].cooldown).toBe(5);
    expect(s.events).toEqual([{ type: 'log', seat: 0, ante: true }]);
  });
  test('burnDown trims the timer when the cap steps down and stops at the timer or the wood', () => {
    const f = { timer: sec(45), elapsed: sec(20) - 1, woodOut: sec(150), lastLog: 1 };
    expect(burnDown(f)).toBe(false);
    expect(f.timer).toBe(sec(40));
    const g = { timer: 1, elapsed: 0, woodOut: sec(150), lastLog: null };
    expect(burnDown(g)).toBe(true);
    const h = { timer: sec(20), elapsed: sec(150) - 1, woodOut: sec(150), lastLog: 2 };
    expect(burnDown(h)).toBe(true);
  });
});
