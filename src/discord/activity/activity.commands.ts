import { Injectable } from "@nestjs/common";
import { ActivityService } from "./activity.service";

import * as necord from "necord";
import { DiscordActivityDto } from "./dto/discord-activity.dto";

@Injectable()
export class ActivityCommands {
  constructor(private readonly activityService: ActivityService) { }

  @necord.SlashCommand({
    name: "discord_activity",
    description: "Show discord activity for a specific user in a given date range",
  })
  public async onDiscordActivity(@necord.Context() [interaction]: necord.SlashCommandContext, @necord.Options() options: DiscordActivityDto) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const stats = await this.activityService.getUserActivityStats(
        options.user.id,
        options.startDate,
        options.endDate
      );

      let extraStats = '';
      if (stats.daysDiff && stats.daysDiff > 1) {
        extraStats = `\n🗓️ Avg per day: **${stats.avg.toFixed(1)}**, Max in a single day: **${stats.max}**`;
      }

      // Try to get nickname if available, otherwise username
      const member = interaction.guild?.members.cache.get(options.user.id);
      const displayName = member?.nickname || options.user.displayName || options.user.username;

      await interaction.editReply({
        content: `📊 **${displayName}** sent **${stats.sum} messages** during \`${stats.periodDescription}\`.${extraStats}`
      });

    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error instanceof Error ? error.message : 'An error occurred'}`
      });
    }
  }
}