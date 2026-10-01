export function codeFromName(name: string, fallbackPrefix: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || `${fallbackPrefix}_${Date.now()}`;
}

export function roleCodeFromName(name: string): string {
  return codeFromName(name, 'ROLE');
}
