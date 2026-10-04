import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const NAME_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export const IsOptionalNonNull = () =>
  ValidateIf((_object: object, value: unknown) => value !== undefined);

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

export const IsName = () =>
  applyDecorators(
    Trim(),
    IsString(),
    MinLength(1, { message: '$property must not be empty' }),
    MaxLength(NAME_MAX_LENGTH),
  );

export const IsStrongPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `password must be at most ${PASSWORD_MAX_LENGTH} characters`,
    }),
    Matches(/(?=.*\p{L})(?=.*\d)/u, {
      message: 'password must contain at least one letter and one number',
    }),
  );
