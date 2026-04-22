import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsUrl,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Ivan',
    description: 'User first name',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Имя не может превышать 50 символов' })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Ivanov',
    description: 'User last name',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Фамилия должна содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Фамилия не может превышать 50 символов' })
  lastName?: string;

  @ApiPropertyOptional({
    example: '+79001234567',
    description: 'Phone number in international format',
  })
  @IsOptional()
  @IsPhoneNumber('RU', { message: 'Укажите корректный российский номер телефона' })
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar image URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Укажите корректный URL аватара' })
  avatarUrl?: string;
}
