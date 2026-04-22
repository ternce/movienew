import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { StreamingService } from './streaming.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StreamUrlResponseDto } from './dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('content')
@Controller('content')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  /**
   * Get streaming URL for content.
   * Returns HLS URL for video playback.
   * Free content is accessible to everyone, premium content requires authentication.
   */
  @Get(':id/stream')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get streaming URL for content',
    description:
      'Returns an HLS streaming URL for video playback. Free content is accessible to anyone. Premium content requires authentication and either a valid subscription or individual purchase.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Stream URL generated successfully',
    type: StreamUrlResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied - subscription or purchase required' })
  @ApiResponse({ status: 404, description: 'Content not found or video not ready' })
  async getStreamUrl(
    @Param('id') contentId: string,
    @CurrentUser() user?: JwtUser,
  ): Promise<StreamUrlResponseDto> {
    return this.streamingService.getStreamUrl(contentId, {
      userId: user?.id,
      userRole: user?.role,
    });
  }
}
