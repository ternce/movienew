import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';
import { NotificationType } from '@movie-platform/shared';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Welcome Email' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.EMAIL })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiPropertyOptional({ example: 'Добро пожаловать на MoviePlatform!' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ example: 'Привет, {{userName}}! Добро пожаловать на платформу.' })
  @IsString()
  @MinLength(1)
  bodyTemplate!: string;

  @ApiPropertyOptional({ example: ['userName', 'contentTitle'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Welcome Email Updated' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Обновлённое приветствие' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ example: 'Привет, {{userName}}! Рады видеть вас снова.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyTemplate?: string;

  @ApiPropertyOptional({ example: ['userName'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
