import { describe, expect, test } from 'vitest';
import { flow, type Screen } from '../../games/throne-flame/app/flow';
import type { SeasonSummary } from '../../games/throne-flame/sim/season';

const summary = { place: 2 } as unknown as SeasonSummary;
describe('screen flow', () => {
  test('load → title → starting → season → results → settled → done → title', () => {
    let s: Screen = { name: 'loading' };
    s = flow(s, { type: 'loaded' }); expect(s.name).toBe('title');
    s = flow(s, { type: 'start' }); expect(s.name).toBe('starting');
    s = flow(s, { type: 'started', playId: 4n }); expect(s).toEqual({ name: 'season', playId: 4n });
    s = flow(s, { type: 'ended', summary }); expect(s).toEqual({ name: 'results', playId: 4n, summary, ticket: null });
    s = flow(s, { type: 'done' }); expect(s.name).toBe('results'); // not settled yet
    s = flow(s, { type: 'settled', result: { kind: 'sealing', playId: 4n } });
    s = flow(s, { type: 'done' }); expect(s.name).toBe('results'); // still sealing
    s = flow(s, { type: 'settled', result: { kind: 'season', playId: 4n } });
    s = flow(s, { type: 'done' }); expect(s.name).toBe('title');
  });
  test('a cancelled confirmation returns to the title', () => {
    expect(flow({ name: 'starting' }, { type: 'startFailed' })).toEqual({ name: 'title' });
  });
  test('an unsettled ticket from the title goes to results without a summary', () => {
    expect(flow({ name: 'title' }, { type: 'resume', playId: 9n })).toEqual({ name: 'results', playId: 9n, summary: null, ticket: null });
  });
  test('actions that do not apply leave the screen unchanged', () => {
    const season: Screen = { name: 'season', playId: 1n };
    expect(flow(season, { type: 'start' })).toBe(season);
    expect(flow(season, { type: 'resume', playId: 2n })).toBe(season);
    expect(flow({ name: 'title' }, { type: 'ended', summary })).toEqual({ name: 'title' });
  });
});
