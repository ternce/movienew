import { Module } from '@nestjs/common';

import { WatchPartyController } from './watch-party.controller';
import { WatchPartyGateway } from './watch-party.gateway';
import { WatchPartyService } from './watch-party.service';

@Module({
  controllers: [WatchPartyController],
  providers: [WatchPartyService, WatchPartyGateway],
  exports: [WatchPartyService, WatchPartyGateway],
})
export class WatchPartyModule {}
