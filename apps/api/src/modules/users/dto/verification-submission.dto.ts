import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUrl } from 'class-validator';
import { VerificationMethod } from '@movie-platform/shared';

export class VerificationSubmissionDto {
  @ApiProperty({
    enum: VerificationMethod,
    description: 'Verification method to use',
    example: VerificationMethod.PAYMENT,
  })
  @IsEnum(VerificationMethod, {
    message: 'Метод должен быть одним из: PAYMENT, DOCUMENT, THIRD_PARTY',
  })
  method!: VerificationMethod;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/documents/passport.jpg',
    description: 'URL of the uploaded verification document (required for DOCUMENT method)',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Укажите корректный URL документа' })
  documentUrl?: string;
}
