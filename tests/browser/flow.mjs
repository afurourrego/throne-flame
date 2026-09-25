export async function confirmPreview(page) { await page.getByRole('button', { name: /Confirm preview/i }).click(); }

export async function startSeason(page, game) {
  await game.getByRole('button', { name: 'Start season · 10 RF' }).click();
  await confirmPreview(page); await confirmPreview(page);
  await game.getByRole('img', { name: 'Throne & Flame season' }).waitFor();
}

/** Nothing interactive in the frame's bottom 60 px (runtime toolbar) or outside the frame. */
export async function assertReachable(page, locator, label) {
  const frame = await page.locator('iframe').boundingBox(), box = await locator.boundingBox();
  if (!box || box.y < frame.y || box.y + box.height > frame.y + frame.height - 60 || box.x < frame.x || box.x + box.width > frame.x + frame.width) {
    throw new Error(`${label} is outside the playable area: ${JSON.stringify(box)} in frame ${JSON.stringify(frame)}`);
  }
}

export async function yourBalance(game) {
  const text = await game.locator('.tf-seat.tf-you').innerText();
  return Number(/([\d,.]+) RF/.exec(text)[1].replace(/,/g, ''));
}

/** Keys only reach the game once the iframe has focus (the confirmations live in the host page): click the scene. */
export async function focusScene(game) {
  await game.getByRole('img', { name: 'Throne & Flame season' }).click({ position: { x: 120, y: 100 } }); // inside the 358 px crop too
}

/**
 * Space on the focused "Add log" button queues exactly one log, never two. Counted where the game queues it
 * (`data-logs` on the stage): a double fire would be hidden in the balance by the sim's 1 s cooldown.
 */
export async function assertOneLogPerPress(page, game) {
  const stage = game.locator('.tf-stage'), count = async () => Number(await stage.getAttribute('data-logs') ?? 0);
  await game.getByRole('button', { name: 'Add log · 0.1 RF' }).focus();
  const before = await count();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const queued = await count() - before;
  if (queued !== 1) throw new Error(`Space queued ${queued} logs, expected 1`);
}

/** Take the throne and raise the price while still king (bots may buy it back within a second or two). */
export async function takeThroneAndRaise(page, game, path) {
  for (let i = 0; i < 6; i++) {
    const take = game.getByRole('button', { name: /^Take throne · / });
    if (await take.isVisible() && await take.isEnabled()) await take.click();
    const raise = game.getByRole('button', { name: 'Raise price' });
    try {
      await raise.waitFor({ timeout: 1500 });
      await raise.click({ timeout: 800 });
      await page.locator('.rf-game-frame').screenshot({ path });
      return;
    } catch { /* a bot was faster; try again */ }
  }
  throw new Error('Could not take the throne and raise the price');
}

/** testGame records page errors only; the spec also forbids console errors. */
export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return () => { if (errors.length) throw new Error(`console errors: ${errors.join(' | ')}`); };
}

export async function leaveSeason(page, game) {
  await game.getByRole('button', { name: 'Menu' }).click();
  await assertReachable(page, game.getByRole('button', { name: 'Resume' }), 'Resume');
  await assertReachable(page, game.getByRole('button', { name: 'Leave season' }), 'Leave season');
  await game.getByRole('button', { name: 'Leave season' }).click();
  await assertReachable(page, game.getByRole('button', { name: 'Yes, leave season' }), 'Yes, leave season');
  await game.getByRole('button', { name: 'Yes, leave season' }).click();
  await game.getByRole('heading', { name: 'You left the season' }).waitFor();
  await game.getByText(/^Settled\./).waitFor();
}
