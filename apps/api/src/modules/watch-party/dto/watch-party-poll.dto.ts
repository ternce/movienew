import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WatchPartyPollOptionDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Existing content ID proposed for the next watch item.',
  })
  @IsUUID()
  contentId!: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Optional episode/lesson content ID for the option.',
  })
  @IsOptional()
  @IsUUID()
  episodeId?: string;
}

export class CreateWatchPartyPollDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174010',
    description: 'Watch Party room ID.',
  })
  @IsUUID()
  roomId!: string;

  @ApiProperty({
    type: [WatchPartyPollOptionDto],
    description: 'Two to six existing content options.',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => WatchPartyPollOptionDto)
  options!: WatchPartyPollOptionDto[];
}

export class VoteWatchPartyPollDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174010' })
  @IsUUID()
  roomId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174020' })
  @IsUUID()
  pollId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174030' })
  @IsUUID()
  optionId!: string;
}

export class CloseWatchPartyPollDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174010' })
  @IsUUID()
  roomId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174020' })
  @IsUUID()
  pollId!: string;
}

export class StartWatchPartyPollWinnerDto extends CloseWatchPartyPollDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174030',
    description: 'Required when the closed poll has tied winning options.',
  })
  @IsOptional()
  @IsUUID()
  optionId?: string;
}
