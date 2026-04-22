import { Module } from '@nestjs/common';

import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { SeriesService } from './series.service';
import { WatchHistoryService } from './watch-history.service';
import { WatchHistoryController } from './watch-history.controller';

@Module({
  controllers: [ContentController, WatchHistoryController],
  providers: [ContentService, SeriesService, WatchHistoryService],
  exports: [ContentService, SeriesService, WatchHistoryService],
})
export class ContentModule {}
