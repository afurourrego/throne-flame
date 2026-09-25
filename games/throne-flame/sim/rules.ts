/** Every number of the game (spec §4). Money in RF base units (18 decimals); time in ticks of 1/10 s. */
export const RF = 10n ** 18n;
export const TICK_HZ = 10;
export const sec = (s: number) => Math.round(s * TICK_HZ);

export const RULES = {
  seats: 6,
  startBalance: 10n * RF,
  rounds: 3,
  breakTicks: sec(3),
  flame: {
    startTicks: sec(30), addTicks: sec(5),
    capStartTicks: sec(45), capStepTicks: sec(5), capEveryTicks: sec(20),
    woodMinTicks: sec(120), woodMaxTicks: sec(180),
  },
  log: { price: RF / 10n, burnBps: 4_000n, tributeBps: 1_000n, cooldownTicks: sec(1) },
  throne: {
    emptyPrice: RF / 2n, minPrice: RF / 2n, maxPrice: 50n * RF, step: RF / 10n,
    sellerBps: 9_500n, taxDivisor: 10_000n, markupBps: 12_000n,
  },
  reaction: { minTicks: sec(0.4), maxTicks: sec(1.5) },
} as const;

export const SEAT_SETUP = [
  { name: 'You', personality: 'player' },
  { name: 'Miser', personality: 'miser' },
  { name: 'Whale', personality: 'whale' },
  { name: 'Sniper', personality: 'sniper' },
  { name: 'Steady', personality: 'steady' },
  { name: 'Flipper', personality: 'flipper' },
] as const;

/** Upper bound for a whole season (3 rounds at the wood limit plus breaks), used as a loop guard. */
export const MAX_SEASON_TICKS = RULES.rounds * (RULES.flame.woodMaxTicks + RULES.breakTicks) + 10;
