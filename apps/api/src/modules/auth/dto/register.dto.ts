import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Укажите корректный email' })
  email!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    description: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @MaxLength(72, { message: 'Пароль не может превышать 72 символа' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать минимум одну заглавную букву, одну строчную и одну цифру',
  })
  password!: string;

  @ApiProperty({
    example: 'Ivan',
    description: 'User first name',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Имя не может превышать 50 символов' })
  firstName!: string;

  @ApiProperty({
    example: 'Ivanov',
    description: 'User last name',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Фамилия должна содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Фамилия не может превышать 50 символов' })
  lastName!: string;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Date of birth in ISO format (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'Укажите корректную дату в формате ГГГГ-ММ-ДД' })
  dateOfBirth!: string;

  @ApiPropertyOptional({
    description: 'Referral code from another user (optional)',
    example: 'ABC12345',
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Реферальный код должен содержать минимум 6 символов' })
  @MaxLength(12, { message: 'Реферальный код не может превышать 12 символов' })
  @Matches(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6,12}$/, {
    message: 'Реферальный код содержит недопустимые символы',
  })
  referralCode?: string;

  @ApiPropertyOptional({
    description: 'Cloudflare Turnstile verification token',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;

  @ApiProperty({
    description: 'User must accept terms and conditions',
    example: true,
  })
  @IsBoolean({ message: 'Необходимо принять условия использования' })
  acceptTerms!: boolean;
}