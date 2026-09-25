import type { GenerationSprites } from '@rarefriends/friendsdk/sprites';
import type { SeasonState } from '../sim/types';
import { COIN, CROWN, LOG, SPARK, STOOL, STUMP, THRONE, flamePixels, flameStage, gridPixels, woodStage, type ArtName, type Px, type SceneItem } from './art';
import {
  HORIZON, PROP_SPOTS, TORCH_AT, darkAt, embers, fireflies, lightRadius, pathStones, ringStones, skyAt, smokePuffs, stars, toneFor, treeline,
  type PropType, type Tone,
} from './backdrop';
import { ENEMY_FRIENDS } from './enemyFriends';
import { botFriendIndices, botFrontRows } from './friends';
import { FIRE_AT, SEAT_AT, THRONE_AT, seatAnchor } from './layout';
import { INK, INK30, PAPER, SIGNAL } from './palette';
import { LOW_H, LOW_W } from './pixel';
import { rasterizeProps } from './props';
import { CANONICAL, frameCanvas, prepareFriendFrames, type FriendFrames } from './sprites';

export type { ArtName, SceneItem } from './art';
export type SceneAssets = {
  you: FriendFrames;
  /** Seat id → the bot's front-facing idle frames (Colossus: its side frame). */
  bots: ReadonlyMap<number, readonly HTMLCanvasElement[]>;
  art: Readonly<Record<ArtName | 'stump', HTMLCanvasElement>>;
  props: Map<PropType, HTMLCanvasElement> | null;
  backdrops: Map<Tone, HTMLCanvasElement>;
  shades: Map<string, HTMLCanvasElement>;
  seed: number;
};

const COLOR: Record<Px['c'], string> = { ink: INK, paper: PAPER, signal: SIGNAL };
function gridCanvas(rows: readonly string[]): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d')!;
  for (const p of gridPixels(rows)) { g.fillStyle = COLOR[p.c]; g.fillRect(p.x, p.y, 1, 1); }
  return c;
}

export function createSceneAssets(sprites: GenerationSprites, seed: number): SceneAssets {
  const bots = new Map<number, HTMLCanvasElement[]>();
  botFriendIndices(seed).forEach((k, i) => {
    const f = ENEMY_FRIENDS[k], frames = Math.max(1, f.down.length);
    bots.set(i + 1, Array.from({ length: frames }, (_, n) => frameCanvas(botFrontRows(f, n), CANONICAL)));
  });
  const a: SceneAssets = {
    you: prepareFriendFrames(sprites), bots, props: null, backdrops: new Map(), shades: new Map(), seed,
    art: { throne: gridCanvas(THRONE), crown: gridCanvas(CROWN), log: gridCanvas(LOG), coin: gridCanvas(COIN), spark: gridCanvas(SPARK), stool: gridCanvas(STOOL), stump: gridCanvas(STUMP) },
  };
  // The official props arrive a moment later; the backdrops are rebaked with them (the scene works without them).
  void rasterizeProps().then(map => { a.props = map; a.backdrops.clear(); }).catch(() => { /* play without prop art */ });
  return a;
}

/** Bottom-centre anchored, whole-pixel, 2× by default. */
function blit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, cx: number, by: number, scale = 2): void {
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(by - h), w, h);
}
function plot(ctx: CanvasRenderingContext2D, pts: readonly Px[], ox: number, oy: number, scale = 2): void {
  for (const p of pts) { ctx.fillStyle = COLOR[p.c]; ctx.fillRect(ox + p.x * scale, oy + (p.y - 1) * scale, scale, scale); }
}
/** 1-bit "greyed out": a paper checkerboard over the sprite (no alpha). */
function dither(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = PAPER;
  for (let yy = 0; yy < h; yy++) for (let xx = (yy % 2); xx < w; xx += 2) ctx.fillRect(x + xx, y + yy, 1, 1);
}
function stone(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = INK; g.fillRect(x - 3, y - 1, 6, 3); g.fillStyle = PAPER; g.fillRect(x - 2, y - 1, 3, 1);
}

/** Baked once per tone (and again when the SDK props arrive): sky, treeline, ground, path, dais, torch poles, props. */
function backdrop(a: SceneAssets, tone: Tone): HTMLCanvasElement {
  const cached = a.backdrops.get(tone);
  if (cached) return cached;
  const c = document.createElement('canvas'); c.width = LOW_W; c.height = LOW_H;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAPER; g.fillRect(0, 0, LOW_W, LOW_H);
  const img = g.getImageData(0, 0, LOW_W, LOW_H), px = img.data, set = (x: number, y: number, v: number) => { const i = (y * LOW_W + x) * 4; px[i] = px[i + 1] = px[i + 2] = v; };
  const tops = treeline(a.seed), starSet = new Set(stars(a.seed).map(s => s.y * LOW_W + s.x));
  for (let y = 0; y < HORIZON; y++) for (let x = 0; x < LOW_W; x++) {
    if (y === tops[x] && tone === 'night') set(x, y, 0xee); // at night a paper rim separates the trees from the sky
    else if (y >= tops[x]) { if (tone !== 'day' || (x + y) % 2 === 0) set(x, y, 0x11); } // by day the far trees are a haze
    else if (skyAt(x, y, tone) && !(tone === 'night' && starSet.has(y * LOW_W + x))) set(x, y, 0x11);
  }
  for (let y = HORIZON + 6; y < LOW_H; y += 8) for (let x = 8; x < LOW_W; x += 8) set(x, y, 0xb0); // rarefriends.com dot grid
  g.putImageData(img, 0, 0);
  g.fillStyle = INK; g.fillRect(0, HORIZON, LOW_W, 1); // the forest's edge
  for (const p of pathStones()) stone(g, p.x, p.y);
  // the dais: one broad stone step under the throne
  g.fillStyle = INK; g.fillRect(THRONE_AT.x - 34, THRONE_AT.y - 2, 68, 8); g.fillStyle = PAPER; g.fillRect(THRONE_AT.x - 32, THRONE_AT.y, 64, 4);
  for (const t of TORCH_AT) { g.fillStyle = INK; g.fillRect(t.x - 1, t.y - 22, 2, 22); g.fillRect(t.x - 3, t.y - 24, 6, 2); }
  if (a.props) for (const s of PROP_SPOTS) { const p = a.props.get(s.type); if (p) blit(g, p, s.x, s.y, 1); }
  a.backdrops.set(tone, c);
  return c;
}

/** Darkness outside the firelight for this tone and flame size, cached (a 1-bit dither over the ground). */
function shade(a: SceneAssets, tone: Tone, stage: number): HTMLCanvasElement | null {
  if (tone === 'day') return null;
  const key = `${tone}:${stage}`, cached = a.shades.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas'); c.width = LOW_W; c.height = LOW_H;
  const g = c.getContext('2d')!, img = g.createImageData(LOW_W, LOW_H), px = img.data;
  const rx = lightRadius(stage), ry = rx / 2;
  for (let y = HORIZON + 1; y < LOW_H; y++) for (let x = 0; x < LOW_W; x++) {
    const dx = (x - FIRE_AT.x) / rx, dy = (y - FIRE_AT.y) / ry;
    if (dx * dx + dy * dy > 1 && darkAt(x, y, tone)) { const i = (y * LOW_W + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0x11; px[i + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  a.shades.set(key, c);
  return c;
}

const WOOD_SLOTS = [[0, 10], [-18, 10], [18, 10], [-9, 4], [9, 4]] as const;

export function drawScene(ctx: CanvasRenderingContext2D, s: SeasonState, a: SceneAssets, items: readonly SceneItem[], now: number, still: boolean): void {
  ctx.imageSmoothingEnabled = false;
  const tone = toneFor(Math.max(1, s.round)), live = s.phase === 'round';
  const stage = live ? flameStage(s.flame.timer) : 0, frame = still ? 0 : Math.floor(now / 140) % 4;
  ctx.drawImage(backdrop(a, tone), 0, 0);
  const dark = shade(a, tone, stage);
  if (dark) ctx.drawImage(dark, 0, 0);

  // throne and its torches
  blit(ctx, a.art.throne, THRONE_AT.x, THRONE_AT.y);
  for (const [i, t] of TORCH_AT.entries()) plot(ctx, flamePixels(0, still ? 0 : (frame + i * 2) % 4), t.x, t.y - 24, 1);

  // the fire: stone ring, wood pile, flame, smoke and embers
  for (const p of ringStones()) stone(ctx, p.x, p.y);
  const logs = live ? woodStage(s.flame.elapsed) : 1;
  for (const [dx, dy] of WOOD_SLOTS.slice(0, logs)) blit(ctx, a.art.log, FIRE_AT.x + dx, FIRE_AT.y + dy);
  plot(ctx, flamePixels(stage, frame), FIRE_AT.x, FIRE_AT.y);
  if (!still && live) {
    for (const p of smokePuffs(now, stage)) { // dithered puffs read as grey smoke in 1-bit
      ctx.fillStyle = INK30;
      for (let yy = -p.r; yy <= p.r; yy++) for (let xx = -p.r; xx <= p.r; xx++) if ((xx + yy + p.x + p.y) % 2 === 0) ctx.fillRect(p.x + xx, p.y + yy, 1, 1);
    }
    ctx.fillStyle = SIGNAL;
    for (const e of embers(now, stage)) ctx.fillRect(e.x, e.y, 1, 1);
  }

  // the Friends, facing the fire from the front, each on a log stump
  for (const seat of s.seats) {
    const home = SEAT_AT[seat.id], king = s.throne.king === seat.id, at = seatAnchor(s.throne.king, seat.id);
    blit(ctx, a.art.stump, home.x, home.y + 10);
    const idle = still ? 0 : Math.floor(now / 180 + seat.id * 3) % 8;
    const frames = seat.id === 0 ? null : a.bots.get(seat.id)!;
    const img = frames ? frames[idle % frames.length] : a.you.get('down', false, idle);
    blit(ctx, img, at.x, at.y);
    if (king && !items.some(i => i.kind === 'crown')) blit(ctx, a.art.crown, at.x, at.y - img.height * 2 - 1); // one crown, never two
    if (seat.out || seat.left) dither(ctx, Math.round(at.x - img.width), at.y - img.height * 2, img.width * 2, img.height * 2);
  }
  if (!still) { ctx.fillStyle = SIGNAL; for (const f of fireflies(now, tone)) ctx.fillRect(f.x, f.y, 1, 1); }
  for (const it of items) { const img = a.art[it.kind]; blit(ctx, img, it.x, it.y + img.height); }
}
