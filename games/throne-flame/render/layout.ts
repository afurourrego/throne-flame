/** Positions on the 480×320 low-res canvas. The desktop action bar covers y ≥ BAR_TOP; the HUD strip y < 24. */
export const BAR_TOP = 248;
export const THRONE_AT = { x: 240, y: 104 };  // bottom centre of the throne art (×2)
export const kingSeatAt = { x: 240, y: 86 };  // the king's feet, on the seat
export const FIRE_AT = { x: 240, y: 206 };    // base of the flame
export const POT_AT = { x: 240, y: 136 };     // coins fly here
export const BURN_AT = { x: 450, y: 12 };     // sparks fly to the BURNED counter
/** Feet of each seat, index = seat id: You, Miser, Whale, Sniper, Steady, Flipper. */
export const SEAT_AT: readonly { x: number; y: number }[] = [
  { x: 170, y: 240 }, { x: 84, y: 214 }, { x: 140, y: 146 },
  { x: 340, y: 146 }, { x: 310, y: 240 }, { x: 396, y: 214 },
];
export const seatFacing = (id: number): 'left' | 'right' => SEAT_AT[id].x < FIRE_AT.x ? 'right' : 'left';
export const seatAnchor = (king: number | null, id: number) => king === id ? kingSeatAt : SEAT_AT[id];
