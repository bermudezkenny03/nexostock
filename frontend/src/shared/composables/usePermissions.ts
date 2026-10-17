import { inject, type InjectionKey } from 'vue';

export interface PermissionChecker {
  /** True when the user holds at least one of the codes (empty list = allowed). */
  can(codes: readonly string[] | string): boolean;
  /** True when the user holds every code. */
  canAll(codes: readonly string[]): boolean;
}

export const PERMISSION_CHECKER: InjectionKey<PermissionChecker> = Symbol('PermissionChecker');

export function createPermissionChecker(source: () => ReadonlySet<string>): PermissionChecker {
  return {
    can(codes) {
      const list = typeof codes === 'string' ? [codes] : codes;
      if (list.length === 0) {
        return true;
      }
      const granted = source();
      return list.some((code) => granted.has(code));
    },
    canAll(codes) {
      const granted = source();
      return codes.every((code) => granted.has(code));
    },
  };
}

/** UI hint only; the backend remains the authority for every request. */
export function usePermissions(): PermissionChecker {
  const checker = inject(PERMISSION_CHECKER, null);
  if (!checker) {
    throw new Error('PermissionChecker no fue provisto. Registra el provider de sesión en la app.');
  }
  return checker;
}
