import { Module } from '@nestjs/common';

import { BonusesController } from './bonuses.controller';
import { BonusesService } from './bonuses.service';
import { BonusSchedulerService } from './bonus-scheduler.service';

@Module({
  controllers: [BonusesController],
  providers: [BonusesService, BonusSchedulerService],
  exports: [BonusesService, BonusSchedulerService],
})
export class BonusesModule {}
