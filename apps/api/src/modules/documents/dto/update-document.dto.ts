import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Пользовательское соглашение (обновлено)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: '1.1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional({ example: '<h1>Обновлённое соглашение</h1><p>...</p>' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresAcceptance?: boolean;
}
