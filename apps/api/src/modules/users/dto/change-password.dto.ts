import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
  })
  @IsString()
  @MinLength(1, { message: 'Введите текущий пароль' })
  currentPassword!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    description: 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @MaxLength(72, { message: 'Пароль не может превышать 72 символа' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать минимум одну заглавную букву, одну строчную и одну цифру',
  })
  newPassword!: string;
}
