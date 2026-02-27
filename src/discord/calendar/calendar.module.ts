import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleModule } from '../../google/google.module';
import { CalendarCommands } from './calendar.commands';

@Module({
  providers: [CalendarCommands],
  imports: [ConfigModule, GoogleModule],
})
export class CalendarModule {}
