import { Module } from '@nestjs/common';
import { GuildConfigService } from './guild-config.service';

@Module({
  providers: [GuildConfigService],
  exports: [GuildConfigService],
})
export class GuildConfigModule {}
