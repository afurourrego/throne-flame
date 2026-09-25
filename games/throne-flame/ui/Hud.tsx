import { LOW_H, LOW_W } from '../render/pixel';
import { POT_AT, SEAT_AT, THRONE_AT } from '../render/layout';
import { rf } from './format';
import type { HudData } from './hudData';

const at = (x: number, y: number) => ({ left: `${x / LOW_W * 100}%`, top: `${y / LOW_H * 100}%` });

/** Round, event feed and the BURNED counter: pinned to the stage (not the scene) so a cropped phone scene never hides them. */
export function HudTop({ hud, feed }: { hud: HudData; feed: string }) {
  const b = hud.burnedBy;
  return <div className="tf-hud-top">
    <span className="tf-round">Round {hud.round}/{hud.rounds}</span>
    <span className="tf-feed" role="status">{feed && <span>{feed}</span>}</span>
    <span className="tf-burned" aria-label={`Burned ${rf(hud.burned)}`}>
      <b>BURNED {rf(hud.burned)}</b>
      <small>logs {rf(b.log)} · tax {rf(b.tax)} · throne {rf(b.throne)}{b.unclaimed > 0n ? ` · unclaimed ${rf(b.unclaimed)}` : ''}</small>
    </span>
  </div>;
}

/** Every other number lives here, in the DOM (Silkscreen), laid over the canvas in the same 480×320 coordinates. */
export function Hud({ hud }: { hud: HudData }) {
  return <div className="tf-hud">
    <div className="tf-tag tf-throne-tag" style={at(THRONE_AT.x + 92, THRONE_AT.y - 44)}>
      {hud.king ? <><b>KING · {hud.king.name}</b><br />price {rf(hud.king.price)} · tax {rf(hud.king.taxPerMin)}/min</>
        : <><b>EMPTY THRONE</b><br />take it for {rf(hud.you.takePrice)}</>}
    </div>
    {hud.hotPotato && <div className="tf-banner tf-hot" style={at(240, 34)}>HOT POTATO · the throne is not refunded</div>}
    <div className="tf-tag tf-fire-tag" style={at(POT_AT.x, POT_AT.y)}>
      <b>POT {rf(hud.pot)}</b> · <span className={hud.lowTime ? 'tf-low' : undefined}>{hud.timer}</span>
      <br /><small>wood runs out 2:00–3:00</small>
    </div>
    {hud.seats.map(seat => {
      const p = SEAT_AT[seat.id];
      return <div key={seat.id} className={`tf-tag tf-seat${seat.you ? ' tf-you' : ''}${seat.out ? ' tf-out' : ''}`} style={at(p.x, p.y - 42)}>
        <span className="tf-name">{seat.name}</span><br />{rf(seat.balance)}
        {(seat.king || seat.last) && <><br /><small className="tf-mark">{[seat.king && 'king', seat.last && 'last log'].filter(Boolean).join(' · ')}</small></>}
      </div>;
    })}
    {hud.breakLine && <div className="tf-banner tf-break" style={at(240, 176)} role="status">{hud.breakLine}</div>}
  </div>;
}
