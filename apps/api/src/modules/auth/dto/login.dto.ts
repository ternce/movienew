import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Укажите корректный email' })
  email!: string;

  @ApiProperty({
    description: 'User password',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Введите пароль' })
  password!: string;

  @ApiPropertyOptional({
    description: 'Remember user for extended session',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
