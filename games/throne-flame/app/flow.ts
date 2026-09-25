import type { TicketResult } from '../economy/ticket';
import type { SeasonSummary } from '../sim/season';

export type Screen =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'title' }
  | { name: 'starting' }
  | { name: 'season'; playId: bigint }
  | { name: 'results'; playId: bigint; summary: SeasonSummary | null; ticket: TicketResult | null };

export type FlowAction =
  | { type: 'reset' } | { type: 'loaded' } | { type: 'failed'; message: string }
  | { type: 'start' } | { type: 'started'; playId: bigint } | { type: 'startFailed' }
  | { type: 'ended'; summary: SeasonSummary } | { type: 'resume'; playId: bigint }
  | { type: 'settled'; result: TicketResult } | { type: 'done' };

/** Screen state machine. Actions that do not apply to the current screen return it unchanged. */
export function flow(state: Screen, action: FlowAction): Screen {
  switch (action.type) {
    case 'reset': return { name: 'loading' };
    case 'failed': return { name: 'error', message: action.message };
    case 'loaded': return state.name === 'loading' || state.name === 'error' ? { name: 'title' } : state;
    case 'start': return state.name === 'title' ? { name: 'starting' } : state;
    case 'started': return state.name === 'starting' ? { name: 'season', playId: action.playId } : state;
    case 'startFailed': return state.name === 'starting' ? { name: 'title' } : state;
    case 'ended': return state.name === 'season' ? { name: 'results', playId: state.playId, summary: action.summary, ticket: null } : state;
    case 'resume': return state.name === 'title' ? { name: 'results', playId: action.playId, summary: null, ticket: null } : state;
    case 'settled': return state.name === 'results' ? { ...state, ticket: action.result } : state;
    case 'done': return state.name === 'results' && state.ticket && state.ticket.kind !== 'sealing' ? { name: 'title' } : state;
  }
}
