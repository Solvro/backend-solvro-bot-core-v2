import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsCommands } from './meetings.commands';
import { MeetingsComponents } from './meetings.components';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from 'src/files/files.module';

@Module({
  providers: [MeetingsService, MeetingsCommands, MeetingsComponents],
  imports: [ConfigModule, FilesModule],
})
export class MeetingsModule {}
