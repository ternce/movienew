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
import { CreateWatchPartyRoomDto, JoinWatchPartyRoomDto } from './dto';
import { WatchPartyService } from './watch-party.service';

@ApiTags('watch-parties')
@ApiBearerAuth()
@Controller('watch-parties')
export class WatchPartyController {
  constructor(private readonly watchPartyService: WatchPartyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a watch party room' })
  @ApiResponse({ status: 201, description: 'Watch party room created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWatchPartyRoomDto,
  ) {
    return this.watchPartyService.createRoom(userId, dto);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get an authorized watch party room' })
  @ApiResponse({ status: 200, description: 'Watch party room details' })
  async getRoom(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.watchPartyService.getRoom(roomId, userId);
  }

  @Get(':roomId/messages')
  @ApiOperation({ summary: 'Get watch party room chat messages' })
  @ApiResponse({ status: 200, description: 'Watch party room messages' })
  async getMessages(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('beforeMessageId') beforeMessageId?: string,
  ) {
    return this.watchPartyService.listMessages(roomId, userId, {
      limit: limit ? Number(limit) : undefined,
      beforeMessageId,
    });
  }

  @Get(':roomId/poll')
  @ApiOperation({ summary: 'Get the latest watch party poll' })
  @ApiResponse({ status: 200, description: 'Latest watch party poll or null' })
  async getCurrentPoll(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.watchPartyService.getCurrentPoll(roomId, userId);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a watch party by invitation token' })
  @ApiResponse({ status: 200, description: 'Joined watch party room' })
  async join(
    @CurrentUser('id') userId: string,
    @Body() dto: JoinWatchPartyRoomDto,
  ) {
    return this.watchPartyService.joinRoom(userId, dto);
  }

  @Post(':roomId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a watch party room' })
  @ApiResponse({ status: 200, description: 'Left watch party room' })
  async leave(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.watchPartyService.leaveRoom(roomId, userId);
  }

  @Post(':roomId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a watch party room as host' })
  @ApiResponse({ status: 200, description: 'Watch party room ended' })
  async end(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.watchPartyService.endRoom(roomId, userId);
  }
}
