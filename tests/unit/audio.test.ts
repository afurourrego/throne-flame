import { describe, expect, test } from 'vitest';
import { SFX, SFX_FOR_EVENT, Throttle } from '../../games/throne-flame/audio/sfx';
import { SONGS, songEvents, stepSeconds } from '../../games/throne-flame/audio/music';

describe('sounds', () => {
  test('every mapped event has a sound; a sound cannot repeat faster than its gap', () => {
    for (const name of Object.values(SFX_FOR_EVENT)) expect(SFX[name!]).toBeDefined();
    expect(SFX_FOR_EVENT).toMatchObject({ log: 'log', potWon: 'pot', throneTaken: 'crown', throneLost: 'lost', rejected: 'reject', priceChanged: 'reject' });
    const t = new Throttle();
    expect([t.allow('log', 0), t.allow('log', SFX.log.gap - 1), t.allow('log', SFX.log.gap)]).toEqual([true, false, true]);
  });
  test('two loops, whole bars, rush faster than camp; the sequencer loops cleanly', () => {
    expect(Object.keys(SONGS).sort()).toEqual(['camp', 'rush']);
    for (const song of Object.values(SONGS)) expect(song.steps % 16).toBe(0);
    expect(SONGS.rush.bpm).toBeGreaterThan(SONGS.camp.bpm);
    expect(stepSeconds(SONGS.camp)).toBeCloseTo(60 / SONGS.camp.bpm / 4);
    const song = SONGS.camp, whole = songEvents(song, 0, song.steps * 2);
    expect([...songEvents(song, 0, 37), ...songEvents(song, 37, song.steps * 2)]).toEqual(whole);
  });
});
