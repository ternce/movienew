import {
  Body,
  Controller,
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

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDirectConversationDto, DirectChatReadDto } from './dto';
import { MiniChatService } from './mini-chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class MiniChatController {
  constructor(private readonly miniChatService: MiniChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List one-to-one Mini Chat conversations' })
  @ApiResponse({ status: 200, description: 'Conversation list' })
  async listConversations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('beforeConversationId') beforeConversationId?: string,
  ) {
    return this.miniChatService.listConversations(userId, {
      limit: limit ? Number(limit) : undefined,
      beforeConversationId,
    });
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or return an existing one-to-one conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created or found' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.miniChatService.createOrGetConversation(userId, dto.targetUserId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Load Mini Chat message history' })
  @ApiResponse({ status: 200, description: 'Paginated messages' })
  async listMessages(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('beforeMessageId') beforeMessageId?: string,
  ) {
    return this.miniChatService.listMessages(conversationId, userId, {
      limit: limit ? Number(limit) : undefined,
      beforeMessageId,
    });
  }

  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark Mini Chat messages as read for current user' })
  @ApiResponse({ status: 200, description: 'Read marker updated' })
  async markRead(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: DirectChatReadDto,
  ) {
    return this.miniChatService.markAsRead(
      conversationId,
      userId,
      dto.messageId,
    );
  }

  @Get('users/search')
  @ApiOperation({ summary: 'Search users eligible for starting Mini Chat' })
  @ApiResponse({ status: 200, description: 'User search results' })
  async searchUsers(
    @CurrentUser('id') userId: string,
    @Query('q') query = '',
  ) {
    return this.miniChatService.searchUsers(userId, query);
  }
}
