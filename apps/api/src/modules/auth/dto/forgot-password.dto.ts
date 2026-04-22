import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address associated with the account',
  })
  @IsEmail({}, { message: 'Укажите корректный email' })
  email!: string;
}
