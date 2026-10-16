export function bcryptRounds(): number {
  const parsed = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  return Number.isFinite(parsed) && parsed >= 4 ? parsed : 10;
}
