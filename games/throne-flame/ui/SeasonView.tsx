import React, { useEffect, useRef, useState } from 'react';
import type { GenerationSprites } from '@rarefriends/friendsdk/sprites';
import type { Music } from '../audio/music';
import { SFX_FOR_EVENT, type Sfx } from '../audio/sfx';
import { Fx } from '../render/fx';
import { createFixedLoop } from '../render/loop';
import { LOW_H, LOW_W, integerScale } from '../render/pixel';
import { createSceneAssets, drawScene } from '../render/scene';
import { TICK_HZ, sec } from '../sim/rules';
import { createSeason, finishSeason, leaveSeason, step, summarize, type SeasonSummary } from '../sim/season';
import { currentPrice } from '../sim/throne';
import type { Action, SeasonState } from '../sim/types';
import { ActionBar } from './ActionBar';
import { Hud, HudTop } from './Hud';
import { feedLine, hudData, hudKey, type HudData } from './hudData';
import { keyIntent, nextPrice, seasonRunning } from './input';
import { Menu } from './Menu';

type Props = {
  sprites: GenerationSprites; paused: boolean; muted: boolean; reducedMotion: boolean; sfx: Sfx | null; music: Music | null;
  onToggleMute(): void; onToggleReducedMotion(): void; onEnd(summary: SeasonSummary): void;
};

export function SeasonView(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null), stageRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudData | null>(null), [feed, setFeed] = useState(''), [menu, setMenu] = useState(false), [scale, setScale] = useState(1);
  const live = useRef({ props, menu }); live.current = { props, menu };
  const [focused, setFocused] = useState(() => document.hasFocus());
  const api = useRef<{ act(a: Action): void; nudge(dir: -1 | 1): void; leave(): void; skip(): void } | null>(null);

  useEffect(() => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const state: SeasonState = createSeason(seed), queue: Action[] = [], fx = new Fx();
    const assets = createSceneAssets(live.current.props.sprites, seed), ctx = canvasRef.current!.getContext('2d')!;
    let lastKey = '', finished = false, lastSecond = -1, logsQueued = 0, wanted: bigint | null = null;
    const finish = () => {
      if (finished) return;
      finished = true; loop.stop();
      live.current.props.music?.hold(false); live.current.props.music?.stop(); // leaving from the menu: the music was held

      live.current.props.onEnd(summarize(state));
    };
    const sync = () => { const d = hudData(state), k = hudKey(d); if (k !== lastKey) { lastKey = k; setHud(d); } };
    const sounds = () => {
      const sfx = live.current.props.sfx;
      for (const e of state.events) {
        if ((e.type === 'rejected' || e.type === 'priceChanged') && e.seat !== 0) continue;
        if (e.type === 'log' && e.ante) continue;
        const name = SFX_FOR_EVENT[e.type];
        if (name) sfx?.play(name);
      }
      if (state.phase !== 'round') return;
      const secs = Math.ceil(state.flame.timer / TICK_HZ);
      if (secs <= 5 && secs !== lastSecond) { lastSecond = secs; sfx?.play('tick'); } else if (secs > 5) lastSecond = -1;
      if (state.tick % 6 === 0) sfx?.play('crackle');
      live.current.props.music?.play(state.flame.timer <= sec(10) ? 'rush' : 'camp');
    };
    const act = (a: Action) => {
      if (state.phase !== 'round' || finished) return;
      queue.push(a);
      if (a.type === 'addLog') stageRef.current!.dataset.logs = String(++logsQueued); // tests: exactly one per press
    };
    /** Price clicks add up within a tick: each nudge starts from the last requested price, not the one on screen. */
    const nudge = (dir: -1 | 1) => {
      if (state.throne.king !== 0) return;
      wanted = nextPrice(wanted ?? state.throne.pendingPrice ?? state.throne.price, dir);
      act({ type: 'setPrice', price: wanted });
    };
    const loop = createFixedLoop({
      hz: TICK_HZ,
      running: () => seasonRunning({ paused: live.current.props.paused, menu: live.current.menu, hidden: document.hidden, phase: state.phase }),
      tick: () => {
        step(state, queue.splice(0)); wanted = null;
        fx.push(state.events, state.throne.king, performance.now(), live.current.props.reducedMotion);
        const line = state.events.map(e => feedLine(e, state)).filter((l): l is string => l !== null).pop();
        if (line) setFeed(line);
        sounds();
        if (state.phase === 'over') finish();
      },
      render: () => { drawScene(ctx, state, assets, fx.items(performance.now()), performance.now(), live.current.props.reducedMotion); sync(); },
    });
    api.current = {
      act, nudge,
      leave: () => { leaveSeason(state); finishSeason(state); finish(); },
      skip: () => { finishSeason(state); finish(); },
    };
    const onKey = (e: KeyboardEvent) => {
      const { intent, prevent } = keyIntent(e);
      if (prevent) e.preventDefault();
      if (!intent) return;
      if (intent === 'menu') { setMenu(m => !m); return; }
      if (intent === 'mute') { live.current.props.onToggleMute(); return; }
      if (live.current.menu || live.current.props.paused) return;
      if (intent === 'log') act({ type: 'addLog' });
      else if (intent === 'take') { if (state.throne.king !== 0) act({ type: 'takeThrone', expectedPrice: currentPrice(state.throne) }); }
      else nudge(intent === 'lower' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    const onBlur = () => { setFocused(false); setMenu(true); }; // spec §5: losing focus pauses (the menu holds the season)
    const onFocus = () => setFocused(true);
    window.addEventListener('blur', onBlur); window.addEventListener('focus', onFocus);
    // After the runtime's "Confirm preview" (in the host page) focus is outside the iframe: try to take it, else show a hint.
    stageRef.current!.focus();
    const resize = () => { const el = stageRef.current; if (el) setScale(integerScale(el.clientWidth, el.clientHeight)); };
    const observer = new ResizeObserver(resize); observer.observe(stageRef.current!); resize();
    live.current.props.music?.play('camp');
    loop.start(); sync();
    return () => { loop.stop(); observer.disconnect(); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); live.current.props.music?.stop(); };
  }, []);

  useEffect(() => { props.music?.hold(props.paused || menu); }, [props.music, props.paused, menu]);

  return <div className="tf-stage" ref={stageRef} tabIndex={-1} style={{ '--u': scale } as React.CSSProperties}>
    <div className="tf-scene" style={{ width: LOW_W * scale, height: LOW_H * scale }}>
      <canvas ref={canvasRef} width={LOW_W} height={LOW_H} className="tf-canvas" role="img" aria-label="Throne & Flame season" />
      {hud && <Hud hud={hud} />}
    </div>
    {hud && <HudTop hud={hud} feed={feed} />}
    {!focused && !menu && <p className="tf-hint">Click the scene to use the keys (Space · T · ← →)</p>}
    {hud && <ActionBar hud={hud} onAct={a => api.current?.act(a)} onNudge={d => api.current?.nudge(d)} onMenu={() => setMenu(true)} onSkip={() => api.current?.skip()} />}
    {menu && <Menu muted={props.muted} reducedMotion={props.reducedMotion} onResume={() => setMenu(false)}
      onToggleMute={props.onToggleMute} onToggleReducedMotion={props.onToggleReducedMotion} onLeave={() => { setMenu(false); api.current?.leave(); }} />}
  </div>;
}
