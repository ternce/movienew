import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestEmailChangeDto {
  @ApiProperty({
    description: 'New email address',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: 'Укажите корректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  newEmail!: string;
}
