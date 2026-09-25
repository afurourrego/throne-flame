import type { TicketResult } from '../economy/ticket';
import type { SeasonSummary } from '../sim/season';
import { Btn } from './Btn';
import { formatTimer, rf, signedRf } from './format';
import { ordinal, ticketText } from './resultsText';

type Props = {
  summary: SeasonSummary | null; ticket: TicketResult | null; busy: boolean; error: string; unclaimed: bigint; rekindleReward: bigint;
  playAgain: Readonly<{ ok: boolean; label: string; reason: string }>;
  onRetry(): void; onRedeem(): void; onPlayAgain(): void; onTitle(): void;
};

export function Results(p: Props) {
  const s = p.summary, settled = p.ticket !== null && p.ticket.kind !== 'sealing';
  return <div className="tf-results">
    <header>
      <h1>{s?.you.left ? 'You left the season' : 'Season over'}</h1>
      {s && <p className="tf-muted">You placed {ordinal(s.place)} of 6 · {signedRf(s.you.net)}</p>}
    </header>
    {s && <div className="tf-results-grid">
      <section className="tf-card">
        <h2>Ranking</h2>
        <table className="tf-table">
          <thead><tr><th>#</th><th>Friend</th><th>Net</th><th>Burned</th></tr></thead>
          <tbody>{s.ranking.map((r, i) => <tr key={r.seat} className={r.seat === 0 ? 'tf-you-row' : undefined}>
            <td>{i + 1}</td><td>{r.name}</td><td>{signedRf(r.net)}</td><td>{rf(r.burned)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="tf-card">
        <h2>Your season</h2>
        <dl className="tf-stats">
          <dt>Net</dt><dd>{signedRf(s.you.net)}</dd>
          <dt>RF you burned</dt><dd>{rf(s.you.burned)}</dd>
          <dt>Reign</dt><dd>{formatTimer(s.you.reignTicks)}</dd>
          <dt>Tribute collected</dt><dd>{rf(s.you.tribute)}</dd>
          <dt>Pots won</dt><dd>{s.you.potsWon} ({rf(s.you.potWinnings)})</dd>
        </dl>
      </section>
      <section className="tf-card tf-burn-card">
        <h2>Burned this season</h2>
        <p className="tf-big">{rf(s.totalBurned)}</p>
        <p>logs {rf(s.burned.log)} · tax {rf(s.burned.tax)} · throne {rf(s.burned.throne)} · unclaimed {rf(s.burned.unclaimed)}</p>
        <p className="tf-fine">Simulated RF. In production a contract would burn and pay on-chain.</p>
      </section>
    </div>}
    <section className="tf-card tf-ticket" aria-live="polite">
      <h2>Season ticket</h2>
      <p>{ticketText(p.ticket)}</p>
      {(p.ticket?.kind === 'sealing' || (p.error && !p.ticket)) && <Btn disabled={p.busy} onClick={p.onRetry}>Retry</Btn>}
      {p.ticket?.kind === 'rekindle' && p.unclaimed > 0n && <Btn className="tf-primary" disabled={p.busy} onClick={p.onRedeem}>Redeem · {rf(p.rekindleReward)}</Btn>}
      {p.error && <p role="alert">{p.error}</p>}
    </section>
    {settled && <div className="tf-start">
      <Btn className="tf-primary" disabled={!p.playAgain.ok || p.busy} onClick={p.onPlayAgain}>{p.playAgain.label}</Btn>
      <Btn disabled={p.busy} onClick={p.onTitle}>Title</Btn>
      {!p.playAgain.ok && <p className="tf-status-line">{p.playAgain.reason}</p>}
    </div>}
  </div>;
}
