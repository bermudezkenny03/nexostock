import { z } from 'zod';

/** Mirrors auth-service validation (common/validation/index.ts). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
const PASSWORD_PATTERN = /(?=.*\p{L})(?=.*\d)/u;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo').max(254).email('Correo no válido'),
  password: z.string().min(1, 'Ingresa tu contraseña').max(PASSWORD_MAX_LENGTH),
});

export type LoginForm = z.infer<typeof loginSchema>;

export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`)
  .regex(PASSWORD_PATTERN, 'Debe incluir al menos una letra y un número');

const personName = (message: string) => z.string().trim().min(1, message).max(120, 'Máximo 120 caracteres');

export const registerSchema = z
  .object({
    businessName: personName('Ingresa el nombre del negocio'),
    firstName: personName('Ingresa tu nombre'),
    lastName: personName('Ingresa tu apellido'),
    email: z.string().trim().min(1, 'Ingresa tu correo').max(254).email('Correo no válido'),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type RegisterForm = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual').max(PASSWORD_MAX_LENGTH),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta a la actual',
  });

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

/** Only same-origin absolute paths are accepted as post-login redirects. */
export function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  return value;
}
