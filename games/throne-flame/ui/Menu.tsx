import { useState } from 'react';
import { Btn } from './Btn';

type Props = { muted: boolean; reducedMotion: boolean; onResume(): void; onToggleMute(): void; onToggleReducedMotion(): void; onLeave(): void };

export function Menu(p: Props) {
  const [confirm, setConfirm] = useState(false);
  return <div className="tf-menu" role="dialog" aria-modal="true" aria-label="Menu">
    <div className="tf-card tf-menu-card">
      <h2>Paused</h2>
      <Btn className="tf-primary" onClick={p.onResume}>Resume</Btn>
      <Btn onClick={p.onToggleMute}>Sound {p.muted ? 'off' : 'on'}</Btn>
      <Btn onClick={p.onToggleReducedMotion}>Reduce motion {p.reducedMotion ? 'on' : 'off'}</Btn>
      <details>
        <summary>Rules</summary>
        <ul className="tf-rules">
          <li>A log costs 0.1 RF: 40% burns, 50% goes to the pot, 10% to the king (burned if the throne is empty). One per second.</li>
          <li>The last log before the fire dies takes the pot. The fire holds less time as the round goes on; the wood runs out between 2:00 and 3:00.</li>
          <li>The throne costs the king's price (empty: 0.5 RF, burned). The old king gets 95%; 5% burns. The king pays 1% of their price every 10 s, burned.</li>
          <li>Each round starts with an opening log from everyone. The throne is not refunded at the end.</li>
        </ul>
      </details>
      {confirm
        ? <><p>Leave now? Your balance freezes and the season plays out without you.</p>
            <Btn onClick={p.onLeave}>Yes, leave season</Btn><Btn onClick={() => setConfirm(false)}>Stay</Btn></>
        : <Btn onClick={() => setConfirm(true)}>Leave season</Btn>}
    </div>
  </div>;
}
