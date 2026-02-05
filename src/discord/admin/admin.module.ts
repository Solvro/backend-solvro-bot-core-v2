import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminCommands } from './admin.commands';
import { GuildConfigModule } from 'src/config/guild-config/guild-config.module';

@Module({
  providers: [AdminService, AdminCommands],
  imports: [GuildConfigModule],
})
export class AdminModule {}
