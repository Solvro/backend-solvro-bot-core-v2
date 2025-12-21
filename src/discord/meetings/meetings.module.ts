import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsCommands } from './meetings.commands';
import { MeetingsComponents } from './meetings.components';
import { DatabaseService } from 'src/database/database.service';

@Module({
  providers: [MeetingsService, MeetingsCommands, MeetingsComponents]
})
export class MeetingsModule {}
