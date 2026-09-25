export type Rng = { s: number };
export type Personality = 'player' | 'miser' | 'whale' | 'sniper' | 'steady' | 'flipper';
export type BurnSource = 'log' | 'tax' | 'throne' | 'unclaimed';

export type Seat = {
  id: number; name: string; personality: Personality;
  balance: bigint; cooldown: number;
  burned: bigint; tribute: bigint; reignTicks: number; potsWon: number; potWinnings: bigint;
  out: boolean; left: boolean;
};
/** `price` is the king's declared price; `pendingPrice` takes effect at the start of the next tick. */
export type Throne = { king: number | null; price: bigint; pendingPrice: bigint | null };
/** Ticks. `woodOut` is the hidden moment the wood runs out; `lastLog` ignores opening (ante) logs. */
export type Flame = { timer: number; elapsed: number; woodOut: number; lastLog: number | null };

export type Action =
  | { type: 'addLog' }
  | { type: 'takeThrone'; expectedPrice: bigint }
  | { type: 'setPrice'; price: bigint };
export type RejectReason = 'cooldown' | 'funds' | 'king' | 'notKing' | 'invalid';

export type SimEvent =
  | { type: 'log'; seat: number; ante: boolean }
  | { type: 'potWon'; seat: number; amount: bigint }
  | { type: 'potCarried'; amount: bigint }
  | { type: 'potBurned'; amount: bigint }
  | { type: 'throneTaken'; seat: number; from: number | null; paid: bigint }
  | { type: 'throneLost'; seat: number; reason: 'tax' | 'left' }
  | { type: 'priceSet'; seat: number; price: bigint }
  | { type: 'priceChanged'; seat: number }
  | { type: 'rejected'; seat: number; reason: RejectReason }
  | { type: 'roundStart'; round: number }
  | { type: 'roundEnd'; round: number; burned: bigint }
  | { type: 'seasonEnd' }
  | { type: 'broke'; seat: number };

export type Pending = { seat: number; at: number; action: Action };
export type BotMemory = { nextThink: number; lastLogTick: number; paid: bigint };
export type RoundResult = { round: number; winner: number | null; amount: bigint; burned: bigint };

export type SeasonState = {
  tick: number; round: number; phase: 'round' | 'break' | 'over'; breakTicks: number;
  seats: Seat[]; throne: Throne; flame: Flame; pot: bigint;
  burned: Record<BurnSource, bigint>; roundBurnStart: bigint; lastRound: RoundResult | null;
  rng: Rng; pending: Pending[]; bots: BotMemory[];
  /** Events of the last step only (cleared at the start of every step). */
  events: SimEvent[];
};
