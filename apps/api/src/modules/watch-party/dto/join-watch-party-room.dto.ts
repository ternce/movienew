import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class JoinWatchPartyRoomDto {
  @ApiProperty({
    example: 'u5bWcuX2z5FZ5FBv3L1dn4lKufwzTjTbk39FsqbD9wY',
    description: 'Secure invitation token from the watch party invitation URL.',
  })
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  inviteToken!: string;
}
