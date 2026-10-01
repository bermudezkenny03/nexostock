const DURATION_PATTERN = /^(\d+)([smhd])$/;
const DURATION_MULTIPLIERS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration "${value}". Use <number><s|m|h|d>.`);
  }
  return Number.parseInt(match[1], 10) * DURATION_MULTIPLIERS[match[2]];
}

export function refreshTokenTtlMs(): number {
  return parseDurationMs(process.env.REFRESH_EXPIRES_IN ?? '7d');
}

export function refreshTokenBytes(): number {
  const parsed = Number.parseInt(process.env.REFRESH_TOKEN_BYTES ?? '32', 10);
  return Number.isFinite(parsed) && parsed >= 32 ? parsed : 32;
}

export function registrationEnabled(): boolean {
  return (process.env.REGISTRATION_ENABLED ?? 'true').trim() !== 'false';
}
