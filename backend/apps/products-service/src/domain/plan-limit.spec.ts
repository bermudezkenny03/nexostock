import { PlanLimitReached, assertProductSlot } from './plan-limit';

describe('assertProductSlot', () => {
  it('allows another product under the plan cap', () => {
    expect(() => assertProductSlot(49, 50, 'Gratis')).not.toThrow();
  });

  it('blocks the next product when the cap is reached', () => {
    expect(() => assertProductSlot(50, 50, 'Gratis')).toThrow(PlanLimitReached);
  });

  it('treats a null cap as unlimited', () => {
    expect(() => assertProductSlot(10_000, null, 'Pro')).not.toThrow();
  });
});
