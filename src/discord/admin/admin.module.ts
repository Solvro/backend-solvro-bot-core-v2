import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminCommands } from './admin.commands';
import { GuildConfigService } from 'src/config/guild-config/guild-config.service';

@Module({
  providers: [AdminService, AdminCommands, GuildConfigService],
})
export class AdminModule {}
