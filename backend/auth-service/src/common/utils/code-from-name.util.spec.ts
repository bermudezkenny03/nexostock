import { normalizeRoleCode, roleCodeFromName } from './code-from-name.util';

describe('role codes', () => {
  it('builds an uppercase code without accents from a name', () => {
    expect(roleCodeFromName('  Jefe de Almacén  ')).toBe('JEFE_DE_ALMACEN');
  });

  it('normalizes a provided code and rejects empty ones', () => {
    expect(normalizeRoleCode('cajero-turno noche')).toBe('CAJERO_TURNO_NOCHE');
    expect(normalizeRoleCode('***')).toBeNull();
  });
});
