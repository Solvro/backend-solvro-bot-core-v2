import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityCommands } from './activity.commands';

@Module({
  providers: [ActivityService, ActivityCommands],
})
export class ActivityModule {}
