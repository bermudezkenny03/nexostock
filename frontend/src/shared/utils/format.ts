const LOCALE = 'es-MX';

const moneyFormatter = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });

/** Backend sends money as decimal strings; the business currency is not part of the contract yet. */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? `$${moneyFormatter.format(amount)}` : String(value);
}

/** Catalog price: 0 is free, null is unpublished, a decimal string is monthly. */
export function formatPlanPrice(value: string | number | null | undefined): string {
  if (value === undefined) {
    return '—';
  }
  if (value === null || value === '') {
    return 'Sin precio';
  }
  return Number(value) === 0 ? 'Gratis' : `${formatMoney(value)} / mes`;
}

export function formatInteger(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : integerFormatter.format(value);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function initials(...parts: (string | null | undefined)[]): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim()[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

export function displayName(first?: string | null, last?: string | null, email?: string | null): string {
  const name = [first, last].filter((part): part is string => Boolean(part?.trim())).join(' ').trim();
  return name || email || '—';
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
