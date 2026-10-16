import { createHash } from 'node:crypto';

const MONEY = /^\d+(\.\d{1,2})?$/;

export function parseMoneyToCents(value: string): number {
  if (!MONEY.test(value)) {
    throw new Error(`Invalid money value: ${value}`);
  }
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function multiplyMoney(unitPrice: string, quantity: number): string {
  return formatCents(parseMoneyToCents(unitPrice) * quantity);
}

export function addMoney(values: readonly string[]): string {
  const cents = values.reduce((sum, value) => sum + parseMoneyToCents(value), 0);
  return formatCents(cents);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortValue(record[key]);
        return sorted;
      }, {});
  }
  return value;
}

export function stableHash(value: unknown): string {
  return sha256(JSON.stringify(sortValue(value)));
}
