import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { LegalDocumentType } from '@movie-platform/shared';

export class CreateDocumentDto {
  @ApiProperty({ enum: LegalDocumentType, example: LegalDocumentType.USER_AGREEMENT })
  @IsEnum(LegalDocumentType)
  type!: LegalDocumentType;

  @ApiProperty({ example: 'Пользовательское соглашение' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: '1.0' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  version!: string;

  @ApiProperty({ example: '<h1>Пользовательское соглашение</h1><p>...</p>' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  requiresAcceptance?: boolean;
}
