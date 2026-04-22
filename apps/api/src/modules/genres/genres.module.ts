import { Module } from '@nestjs/common';

import { GenresController, UserGenrePreferencesController } from './genres.controller';
import { GenresService } from './genres.service';

@Module({
  controllers: [GenresController, UserGenrePreferencesController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
