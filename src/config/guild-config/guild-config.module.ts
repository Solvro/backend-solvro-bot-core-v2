import { Module } from '@nestjs/common';
import { GuildConfigService } from './guild-config.service';

@Module({
  providers: [GuildConfigService],
})
export class GuildConfigModule {}
