# Throne & Flame

A 3-round season for your Rare Friend and five bot Friends around a bonfire and a Harberger-tax throne.

- **Add log** (Space, 0.1 RF, one per second): 40% burns, 50% goes to the pot, 10% to the king (burned if the throne is
  empty). The last log before the fire dies takes the pot. The fire holds less time as the round goes on, and the wood
  runs out at a hidden moment between 2:00 and 3:00.
- **Take throne** (T): pay the king's declared price (empty throne: 0.5 RF, burned); the old king gets 95%, 5% burns.
  As king you set your own price (← / →) and pay 1% of it every 10 s as tax, all burned, and you collect the tribute of
  every log. The throne is not refunded at the end of the season.
- Every round starts with an opening log from everyone. P / Esc or ≡ opens the menu (pause, sound, reduce motion,
  rules, leave season). M mutes.
- A season costs a 10 RF "Season" ticket (simulated). On settlement 1% of tickets "Rekindle" (the 10 RF comes back),
  regardless of how you played. Everything inside a season is a simulated ledger; the ranking is by net profit.
- Fonts: Silkscreen and Archivo (SIL Open Font License, see `fonts/`). Friend artwork: FriendSDK (see its NOTICE.md);
  bot Friends are canonical sprites of real minted Friends (`render/enemyFriends.ts`).
