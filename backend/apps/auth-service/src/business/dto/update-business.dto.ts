import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsName, IsOptionalNonNull, Trim } from '../../common/validation';

const HEX_COLOR = /^#[0-9A-F]{6}$/;
const LOGO_URL_MAX_LENGTH = 2048;
const LEGAL_FIELD_MAX_LENGTH = 200;

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'NexoStock Demo' })
  @IsOptionalNonNull()
  @IsName()
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(LEGAL_FIELD_MAX_LENGTH)
  legalName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(LEGAL_FIELD_MAX_LENGTH)
  taxId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '#0F766E',
    description: 'Hex #RRGGBB. Stored uppercase. Null clears it.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(HEX_COLOR, { message: 'primaryColor must be a hex color #RRGGBB' })
  primaryColor?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://cdn.example.com/logo.png',
    description:
      'http or https URL, max 2048 characters. Null clears it. No file upload.',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(LOGO_URL_MAX_LENGTH)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: true,
    },
    { message: 'logoUrl must be an http or https URL' },
  )
  logoUrl?: string | null;
}
