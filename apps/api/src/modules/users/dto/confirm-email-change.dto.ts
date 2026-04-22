import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @ApiProperty({
    description: '6-digit OTP code sent to new email',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Код должен содержать 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  code!: string;
}
