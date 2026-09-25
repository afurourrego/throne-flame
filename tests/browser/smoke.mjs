import { testGame } from '@rarefriends/friendsdk/testing';
import { assertOneLogPerPress, assertReachable, collectConsoleErrors, focusScene, leaveSeason, startSeason, takeThroneAndRaise } from './flow.mjs';

for (const width of [960, 360]) {
  const result = await testGame('./games/throne-flame', {
    width, height: width < 500 ? 740 : 800, timeout: 60_000, screenshot: `./artifacts/throne-flame-${width}.png`,
    check: async ({ page, game }) => {
      const noConsoleErrors = collectConsoleErrors(page);
      await game.getByRole('heading', { name: 'How a season works' }).waitFor();
      await game.getByText(/Simulated RF/).first().waitFor();
      await assertReachable(page, game.getByRole('button', { name: 'Start season · 10 RF' }), 'Start button');
      await startSeason(page, game);
      await assertReachable(page, game.getByRole('button', { name: 'Add log · 0.1 RF' }), 'Add log');
      await game.getByText(/^BURNED /).waitFor();
      await focusScene(game);
      await assertOneLogPerPress(page, game);
      await takeThroneAndRaise(page, game, `./artifacts/throne-flame-${width}-throne.png`);
      await leaveSeason(page, game);
      await page.locator('.rf-game-frame').screenshot({ path: `./artifacts/throne-flame-${width}-results.png` });
      noConsoleErrors();
    },
  });
  console.log(`PASS ${result.width}px`);
}
