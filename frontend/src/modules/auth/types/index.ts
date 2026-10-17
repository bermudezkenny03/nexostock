import type { AuthApiSchemas } from '@/shared/api';

type Schemas = AuthApiSchemas['schemas'];

/**
 * `firstName`/`lastName` are declared as `@ApiProperty({ nullable: true })` without
 * `type`, so the generated schema says `Record<string, never>`; the API returns strings.
 */
type NameFields = { firstName: string | null; lastName: string | null };

export type AuthUser = Omit<Schemas['AuthUserEntity'], keyof NameFields> & NameFields;
export type LoginRequest = Schemas['LoginDto'];
export type RegisterRequest = Schemas['RegisterBusinessDto'] & {
  /** Present only after GET /auth/plans succeeds. Older servers reject unknown fields. */
  planCode?: string;
};
export type LoginResponse = Omit<Schemas['LoginResponseEntity'], 'user'> & { user: AuthUser };
export type RefreshResponse = Schemas['RefreshResponseEntity'];
export type ChangePasswordRequest = Schemas['ChangePasswordDto'];

export type SessionStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous';
export type SessionEndReason = 'expired' | 'suspended' | 'password-changed';
