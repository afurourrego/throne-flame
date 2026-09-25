import type { Action } from '../sim/types';
import { Btn } from './Btn';
import { rf } from './format';
import type { HudData } from './hudData';

type Props = { hud: HudData; onAct(a: Action): void; onNudge(dir: -1 | 1): void; onMenu(): void; onSkip(): void };

export function ActionBar({ hud, onAct, onNudge, onMenu, onSkip }: Props) {
  const y = hud.you, live = hud.phase === 'round';
  if (y.out) return <div className="tf-actions"><span>You are out of RF.</span><Btn className="tf-primary" onClick={onSkip}>Skip to results</Btn><Btn onClick={onMenu} aria-label="Menu">≡</Btn></div>;
  const shown = y.pendingPrice ?? y.price;
  const info = y.isKing ? `tax ${rf(y.taxPerMin)}/min · tribute ~${rf(y.tributePerMin)}/min`
    : 'Take the throne to set your own price and collect tribute';
  return <div className="tf-actions">
    <div className="tf-actions-row">
      <span className="tf-logbtn">
        <Btn className="tf-primary" disabled={!live || !y.canLog} title={y.logWhy || 'Space'} onClick={() => onAct({ type: 'addLog' })}>Add log · 0.1 RF</Btn>
        <span className="tf-cool" aria-hidden="true" style={{ width: `${y.cooldown * 10}%` }} />
      </span>
      {y.isKing
        ? <span className="tf-price">
            <Btn aria-label="Lower price" disabled={!live} onClick={() => onNudge(-1)}>-</Btn>
            <b>{rf(shown)}</b>
            <Btn aria-label="Raise price" disabled={!live} onClick={() => onNudge(1)}>+</Btn>
          </span>
        : <Btn disabled={!live || !y.canTake} title={y.takeWhy || 'T'} onClick={() => onAct({ type: 'takeThrone', expectedPrice: y.takePrice })}>Take throne · {rf(y.takePrice)}</Btn>}
      <Btn onClick={onMenu} aria-label="Menu">≡</Btn>
    </div>
    {/* always present, so the bar keeps its height and the buttons never move when the numbers change */}
    <small className="tf-actions-info">{info}</small>
  </div>;
}
