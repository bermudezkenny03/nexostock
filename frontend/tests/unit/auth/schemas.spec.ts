import { describe, expect, it } from 'vitest';
import { safeRedirect } from '@/modules/auth';

describe('safeRedirect', () => {
  it('accepts internal absolute paths', () => {
    expect(safeRedirect('/app/products?page=2')).toBe('/app/products?page=2');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'app', undefined, ['/app']])(
    'rejects %s',
    (value) => {
      expect(safeRedirect(value)).toBeNull();
    },
  );
});
