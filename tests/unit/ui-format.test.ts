import { describe, expect, test } from 'vitest';
import { RF, sec } from '../../games/throne-flame/sim/rules';
import { formatTimer, rf, signedRf } from '../../games/throne-flame/ui/format';

describe('format', () => {
  test('rf: up to 4 decimals, truncated, thousands separators, sign kept', () => {
    expect([rf(RF / 10n), rf(1234n * RF), rf(RF * 12345n / 100000n), rf(-RF / 2n), rf(0n)])
      .toEqual(['0.1 RF', '1,234 RF', '0.1234 RF', '-0.5 RF', '0 RF']);
    expect([signedRf(RF), signedRf(-RF), signedRf(0n)]).toEqual(['+1 RF', '-1 RF', '0 RF']);
  });
  test('formatTimer rounds up to whole seconds', () => {
    expect([formatTimer(0), formatTimer(1), formatTimer(175), formatTimer(sec(125)), formatTimer(-5)])
      .toEqual(['0:00', '0:01', '0:18', '2:05', '0:00']);
  });
});
