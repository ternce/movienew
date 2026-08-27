import { Module } from '@nestjs/common';

import { MiniChatController } from './mini-chat.controller';
import { MiniChatGateway } from './mini-chat.gateway';
import { MiniChatService } from './mini-chat.service';

@Module({
  controllers: [MiniChatController],
  providers: [MiniChatService, MiniChatGateway],
  exports: [MiniChatService, MiniChatGateway],
})
export class MiniChatModule {}
