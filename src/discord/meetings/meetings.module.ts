import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsCommands } from './meetings.commands';

@Module({
  providers: [MeetingsService, MeetingsCommands]
})
export class MeetingsModule {}
