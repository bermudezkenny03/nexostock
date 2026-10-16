export class InvalidDateRange extends Error {
  constructor() {
    super('El rango de fechas no es válido');
  }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function resolveRange(from?: string, to?: string): { from: Date; to: Date } {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - THIRTY_DAYS_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new InvalidDateRange();
  }
  return { from: start, to: end };
}
