import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CursorPaginationDto } from '../../common/dto/cursor-pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateCommentDto, CommentListResponseDto, CommentResponseDto } from './dto';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@Controller('content')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get(':contentId/comments')
  @Public()
  @ApiOperation({ summary: 'List comments for a content item' })
  @ApiResponse({ status: 200, type: CommentListResponseDto })
  async list(
    @Param('contentId') contentId: string,
    @Query() pagination: CursorPaginationDto,
  ) {
    return this.commentsService.listComments(contentId, pagination);
  }

  @Post(':contentId/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment for a content item' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  async create(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(contentId, userId, dto);
  }

  @Delete(':contentId/comments/:commentId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author or admin/moderator)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async remove(
    @Param('contentId') contentId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    await this.commentsService.deleteComment(contentId, commentId, userId, role);
  }
}
