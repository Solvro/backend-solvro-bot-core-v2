import { Injectable, OnModuleInit } from '@nestjs/common';
import { GuildConfig } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GuildConfigService implements OnModuleInit {
  private configCache = new Map<string, GuildConfig>();

  constructor(private readonly database: DatabaseService) { }

  async onModuleInit() {
    await this.loadGuildConfigs();
  }

  async loadGuildConfigs() {
    const configs = await this.database.guildConfig.findMany();
    configs.forEach(c => this.configCache.set(c.guildId, c));
  }

  async get(guildId: string): Promise<GuildConfig | null | undefined> {
    if (this.configCache.has(guildId)) {
      return this.configCache.get(guildId);
    }
    return this.database.guildConfig.findUnique({ where: { guildId } });
  }

  async update(guildId: string, data: Partial<GuildConfig>) {
    const updated = await this.database.guildConfig.upsert({
      where: { guildId },
      update: data,
      create: { guildId, ...data },
    });
    this.configCache.set(guildId, updated);
    return updated;
  }
}
