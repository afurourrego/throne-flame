import type { TicketResult } from '../economy/ticket';

export function ticketText(t: TicketResult | null): string {
  if (!t) return 'Settling your season ticket…';
  if (t.kind === 'sealing') return 'Still sealing… try again in a moment.';
  if (t.kind === 'rekindle') return 'Rekindle! Your 10 RF ticket comes back: your next season is free.';
  return 'Settled. 1% of tickets rekindle; this one did not.';
}
export const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
