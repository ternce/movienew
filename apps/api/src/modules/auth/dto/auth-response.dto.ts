import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgeCategory, UserRole, VerificationStatus } from '@movie-platform/shared';

export class UserResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Ivan' })
  firstName!: string;

  @ApiProperty({ example: 'Ivanov' })
  lastName!: string;

  @ApiProperty({ example: '1990-05-15' })
  dateOfBirth!: Date;

  @ApiProperty({ enum: AgeCategory, example: AgeCategory.EIGHTEEN_PLUS })
  ageCategory!: AgeCategory;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatarUrl?: string;

  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.UNVERIFIED })
  verificationStatus!: VerificationStatus;

  @ApiProperty({ enum: UserRole, example: UserRole.BUYER })
  role!: UserRole;

  @ApiProperty({ example: 'ABC12345' })
  referralCode!: string;

  @ApiProperty({ example: 0 })
  bonusBalance!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'User profile information',
    type: UserResponseDto,
  })
  user!: UserResponseDto;

  @ApiProperty({
    description: 'ISO timestamp when the access token expires',
    example: '2025-01-13T12:15:00.000Z',
  })
  expiresAt!: string;

  @ApiPropertyOptional({
    description: 'Current session ID for device identification',
  })
  sessionId?: string;
}

export class RefreshResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'New JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'ISO timestamp when the new access token expires',
    example: '2025-01-13T12:15:00.000Z',
  })
  expiresAt!: string;

  @ApiPropertyOptional({
    description: 'Current session ID for device identification',
  })
  sessionId?: string;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message!: string;
}