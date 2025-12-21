import { Module } from '@nestjs/common';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  controllers: [RecordingsController],
  providers: [RecordingsService]
})
export class RecordingsModule {}
