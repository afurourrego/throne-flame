import { useEffect, useReducer, useRef, useState } from 'react';
import type { GameSnapshot } from '@rarefriends/friendsdk/game';
import type { GameComponentProps } from '@rarefriends/friendsdk/runtime';
import { createFriendSoundKit, type FriendSoundKit } from '@rarefriends/friendsdk/sounds';
import { createFriendReader, type GenerationSprites } from '@rarefriends/friendsdk/sprites';
import './style.css';
import { createMusic, type Music } from './audio/music';
import { createSfx, type Sfx } from './audio/sfx';
import { flow } from './app/flow';
import { pendingPlay, redeemRekindle, settleTicket, startCheck, startSeason, unclaimedRekindles } from './economy/ticket';
import type { SeasonSummary } from './sim/season';
import { Btn } from './ui/Btn';
import { rf } from './ui/format';
import { Results } from './ui/Results';
import { SeasonView } from './ui/SeasonView';
import { Title } from './ui/Title';

const messageOf = (cause: unknown, fallback: string) => cause instanceof Error && cause.message ? cause.message : fallback;

export default function ThroneFlame({ friendId, client, paused }: GameComponentProps) {
  const [screen, dispatch] = useReducer(flow, { name: 'loading' });
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [sprites, setSprites] = useState<GenerationSprites | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(false), [reducedMotion, setReducedMotion] = useState(false);
  const sound = useRef<FriendSoundKit | null>(null), sfx = useRef<Sfx | null>(null), music = useRef<Music | null>(null), epoch = useRef(0);

  useEffect(() => {
    const version = ++epoch.current;
    dispatch({ type: 'reset' }); setError(''); setBusy(false); setMuted(false);
    sound.current = createFriendSoundKit({ muted: false });
    sfx.current = createSfx(); sfx.current.setMuted(false); music.current = createMusic();
    // Read first: the runtime reports an error if the game has not read within 10 s.
    Promise.all([client.read(), createFriendReader().read(friendId)]).then(([value, art]) => {
      if (version !== epoch.current) return;
      setSnapshot(value); setSprites(art); dispatch({ type: 'loaded' });
    }).catch(cause => { if (version === epoch.current) dispatch({ type: 'failed', message: messageOf(cause, 'Could not load your Friend.') }); });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => {
      epoch.current++; sound.current?.dispose(); sound.current = null; sfx.current?.dispose(); sfx.current = null; music.current?.dispose(); music.current = null;
      media.removeEventListener('change', update);
    };
  }, [client, friendId, attempt]);

  async function act(work: () => Promise<void>) {
    const version = epoch.current;
    setBusy(true); setError('');
    try { await work(); }
    catch (cause) { if (version === epoch.current) setError(messageOf(cause, 'The preview action failed.')); }
    finally {
      if (version === epoch.current) {
        // Re-read first, then unlock the buttons, so they are never judged against a stale snapshot.
        try { const value = await client.read(); if (version === epoch.current) setSnapshot(value); } catch { /* keep the last snapshot */ }
        if (version === epoch.current) setBusy(false);
      }
    }
  }
  const unlock = () => { void sound.current?.unlock(); void sfx.current?.unlock(); void music.current?.unlock(); };
  const toggleMute = () => {
    const next = !muted; setMuted(next); sound.current?.setMuted(next); sfx.current?.setMuted(next); music.current?.setMuted(next);
    if (!next) unlock();
  };
  const onSeasonEnd = (summary: SeasonSummary) => {
    if (screen.name !== 'season') return;
    const playId = screen.playId;
    dispatch({ type: 'ended', summary });
    void settle(playId);
  };
  const start = () => {
    if (busy || paused) return;
    unlock(); dispatch({ type: 'start' });
    void act(async () => {
      try { const playId = await startSeason(client); sound.current?.play('action-start'); dispatch({ type: 'started', playId }); }
      catch (cause) { dispatch({ type: 'startFailed' }); throw cause; }
    });
  };
  const settle = (playId: bigint) => act(async () => {
    const result = await settleTicket(client, playId);
    if (result.kind === 'rekindle') sound.current?.play('reveal-legendary');
    dispatch({ type: 'settled', result });
  });
  const redeem = () => act(async () => { await redeemRekindle(client); sound.current?.play('reward'); });

  if (screen.name === 'loading') return <div className="tf-root"><p className="tf-status" role="status">Loading your Friend…</p></div>;
  if (screen.name === 'error') return <div className="tf-root"><p className="tf-status" role="alert">{screen.message}</p><Btn onClick={() => setAttempt(a => a + 1)}>Retry</Btn></div>;
  if (!snapshot || !sprites) return null;
  if (snapshot.friendId !== friendId) return <div className="tf-root"><p role="alert">This game session does not match the selected Friend.</p></div>;

  if (screen.name === 'season') return <div className="tf-root tf-playing">
    <SeasonView key={String(screen.playId)} sprites={sprites} paused={paused} muted={muted} reducedMotion={reducedMotion} sfx={sfx.current} music={music.current}
      onToggleMute={toggleMute} onToggleReducedMotion={() => setReducedMotion(r => !r)} onEnd={onSeasonEnd} />
  </div>;
  if (screen.name === 'results') {
    const again = startCheck(snapshot, client.definition);
    return <div className="tf-root">
      <Results summary={screen.summary} ticket={screen.ticket} busy={busy} error={error} unclaimed={unclaimedRekindles(snapshot)}
        rekindleReward={client.definition.outcomes[1].reward}
        playAgain={{ ok: again.ok, label: `Play again · ${rf(client.definition.price)}`, reason: again.ok ? '' : again.reason }}
        onRetry={() => void settle(screen.playId)} onRedeem={() => void redeem()}
        onPlayAgain={() => { dispatch({ type: 'done' }); start(); }} onTitle={() => dispatch({ type: 'done' })} />
    </div>;
  }
  return <div className="tf-root">
    <Title sprites={sprites} snapshot={snapshot} definition={client.definition} busy={busy || screen.name === 'starting'} paused={paused}
      error={error} reducedMotion={reducedMotion} onStart={start} onRedeem={() => void redeem()}
      onSettlePending={() => { const p = pendingPlay(snapshot); if (p) { dispatch({ type: 'resume', playId: p.id }); void settle(p.id); } }} />
  </div>;
}
