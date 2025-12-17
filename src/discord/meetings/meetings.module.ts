import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsCommands } from './meetings.commands';
import { DatabaseService } from 'src/database/database.service';

@Module({
  providers: [MeetingsService, MeetingsCommands, DatabaseService]
})
export class MeetingsModule {}
