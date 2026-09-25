import type { ChanceGameDefinition, GameSnapshot } from '@rarefriends/friendsdk/game';
import type { GenerationSprites } from '@rarefriends/friendsdk/sprites';
import logoUrl from '../logo.png';
import { pendingPlay, startCheck, unclaimedRekindles } from '../economy/ticket';
import { Btn } from './Btn';
import { FriendPortrait } from './FriendPortrait';
import { rf } from './format';

type Props = {
  sprites: GenerationSprites; snapshot: GameSnapshot; definition: ChanceGameDefinition;
  busy: boolean; paused: boolean; error: string; reducedMotion: boolean;
  onStart(): void; onSettlePending(): void; onRedeem(): void;
};

export function Title(p: Props) {
  const check = startCheck(p.snapshot, p.definition), pending = pendingPlay(p.snapshot), rekindles = unclaimedRekindles(p.snapshot);
  const locked = p.busy || p.paused;
  return <div className="tf-title">
    <header>
      <img className="tf-logo" src={logoUrl} alt="Throne & Flame" />
      <p className="tf-muted">Feed the fire. Take the throne. Everything burns.</p>
    </header>
    <div className="tf-title-grid">
      <section className="tf-card tf-friend">
        <FriendPortrait sprites={p.sprites} reducedMotion={p.reducedMotion} />
        <div>
          <h2>{p.sprites.familyName} Friend #{String(p.sprites.tokenId)}</h2>
          <p className="tf-muted">Plays as <b>You</b> against five Friends: Miser, Whale, Sniper, Steady and Flipper.</p>
        </div>
      </section>
      <section className="tf-card">
        <h2>How a season works</h2>
        <ol className="tf-rules">
          <li><b>Add logs</b> (0.1 RF): 40% burns, 50% feeds the pot, 10% pays the king. The last log before the fire dies takes the pot.</li>
          <li><b>Take the throne</b> by paying the king's price. Then you set your own price and pay 1% of it every 10 s as tax, burned. Anyone can buy you out at that price.</li>
          <li><b>Everything burns RF</b>: logs, tax and takeovers. 3 rounds; the wood runs out between 2:00 and 3:00.</li>
        </ol>
      </section>
    </div>
    <div className="tf-start">
      <p className="tf-fine">Balance {rf(p.snapshot.rfBalance)} · Simulated RF (20 per session, reload to reset). A season ticket costs {rf(p.definition.price)}; 1% of tickets rekindle (the 10 RF comes back).</p>
      {pending
        ? <><p role="status">You have an unsettled season ticket.</p><Btn className="tf-primary" disabled={locked} onClick={p.onSettlePending}>Settle ticket</Btn></>
        : <Btn className="tf-primary tf-start-btn" disabled={!check.ok || locked} onClick={p.onStart}>Start season · {rf(p.definition.price)}</Btn>}
      {rekindles > 0n && <Btn disabled={locked} onClick={p.onRedeem}>Redeem rekindle · {rf(p.definition.outcomes[1].reward)}</Btn>}
      {!pending && !check.ok && <p className="tf-status-line" role="status">{check.reason}</p>}
      {p.error && <p className="tf-status-line" role="alert">{p.error}</p>}
    </div>
  </div>;
}
