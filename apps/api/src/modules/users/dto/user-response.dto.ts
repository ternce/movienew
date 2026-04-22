import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgeCategory, UserRole, VerificationStatus, VerificationMethod } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty({ example: 'clx1234567890' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+79001234567' })
  phone?: string;

  @ApiProperty({ example: 'Ivan' })
  firstName!: string;

  @ApiProperty({ example: 'Ivanov' })
  lastName!: string;

  @ApiProperty({ example: '1990-05-15' })
  dateOfBirth!: Date;

  @ApiProperty({ enum: AgeCategory, example: AgeCategory.EIGHTEEN_PLUS })
  ageCategory!: AgeCategory;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;

  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.UNVERIFIED })
  verificationStatus!: VerificationStatus;

  @ApiPropertyOptional({ enum: VerificationMethod })
  verificationMethod?: VerificationMethod;

  @ApiProperty({ enum: UserRole, example: UserRole.BUYER })
  role!: UserRole;

  @ApiProperty({ example: 'ABC12345' })
  referralCode!: string;

  @ApiProperty({ example: 0, description: 'Bonus balance in platform currency' })
  bonusBalance!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class VerificationStatusDto {
  @ApiProperty({ enum: VerificationStatus })
  status!: VerificationStatus;

  @ApiPropertyOptional({ enum: VerificationMethod })
  method?: VerificationMethod | null;

  @ApiPropertyOptional({ description: 'Reason for rejection if status is REJECTED' })
  rejectionReason?: string | null;

  @ApiPropertyOptional({ description: 'Date when verification was submitted' })
  submittedAt?: Date;

  @ApiPropertyOptional({ description: 'Date when verification was reviewed' })
  reviewedAt?: Date | null;
}

export class UserSessionDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ description: 'Device information (user agent)' })
  deviceInfo?: string | null;

  @ApiProperty({ description: 'IP address of the session' })
  ipAddress!: string;

  @ApiProperty({ description: 'When the session was created' })
  createdAt!: Date;

  @ApiProperty({ description: 'When the session expires' })
  expiresAt!: Date;
}
