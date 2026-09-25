import { describe, expect, test } from 'vitest';
import { ordinal, ticketText } from '../../games/throne-flame/ui/resultsText';

describe('results copy', () => {
  test('ticket lines', () => {
    expect(ticketText(null)).toBe('Settling your season ticket…');
    expect(ticketText({ kind: 'sealing', playId: 1n })).toBe('Still sealing… try again in a moment.');
    expect(ticketText({ kind: 'season', playId: 1n })).toBe('Settled. 1% of tickets rekindle; this one did not.');
    expect(ticketText({ kind: 'rekindle', playId: 1n })).toBe('Rekindle! Your 10 RF ticket comes back: your next season is free.');
  });
  test('ordinals 1–6', () => {
    expect([1, 2, 3, 4, 5, 6].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '5th', '6th']);
  });
});
