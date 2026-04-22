import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class CommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: CommentAuthorDto })
  author!: CommentAuthorDto;
}

export class CommentListResponseDto {
  @ApiProperty({ type: [CommentResponseDto] })
  items!: CommentResponseDto[];

  @ApiPropertyOptional({ description: 'Cursor for the next page (comment ID)' })
  nextCursor!: string | null;

  @ApiProperty({ description: 'Whether there are more items after this page' })
  hasMore!: boolean;
}
