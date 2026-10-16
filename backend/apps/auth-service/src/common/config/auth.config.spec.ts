import { parseDurationMs } from './auth.config';

describe('parseDurationMs', () => {
  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['2h', 7_200_000],
    ['7d', 604_800_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it.each(['', '7', 'd7', '1w', '-1d'])('rejects %p', (input) => {
    expect(() => parseDurationMs(input)).toThrow('Invalid duration');
  });
});
