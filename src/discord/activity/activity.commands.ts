import { Injectable } from '@nestjs/common';
import { ActivityService } from './activity.service';

import * as necord from 'necord';
import { DiscordActivityDto } from './dto/discord-activity.dto';
import { GithubActivityDto } from './dto/github-activity.dto';
import { ChannelActivityDto } from './dto/channel-activity.dto';
import { Client } from 'discord.js';

@Injectable()
export class ActivityCommands {
  constructor(
    private readonly activityService: ActivityService,
    private readonly client: Client,
  ) {}

  @necord.SlashCommand({
    name: 'discord_activity',
    description:
      'Show discord activity for a specific user in a given date range',
  })
  public async onDiscordActivity(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: DiscordActivityDto,
  ) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const stats = await this.activityService.getUserActivityStats(
        options.user.id,
        options.startDate,
        options.endDate,
      );

      let extraStats = '';
      if (stats.daysDiff && stats.daysDiff > 1) {
        extraStats = `\n🗓️ Avg per day: **${stats.avg.toFixed(1)}**, Max in a single day: **${stats.max}**`;
      }

      // Try to get nickname if available, otherwise username
      const member = interaction.guild?.members.cache.get(options.user.id);
      const displayName =
        member?.nickname || options.user.displayName || options.user.username;

      await interaction.editReply({
        content: `📊 **${displayName}** sent **${stats.sum} messages** during \`${stats.periodDescription}\`.${extraStats}`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error instanceof Error ? error.message : 'An error occurred'}`,
      });
    }
  }

  @necord.SlashCommand({
    name: 'github_activity',
    description:
      'Show github activity for a specific user in a given date range',
  })
  public async onGithubActivity(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: GithubActivityDto,
  ) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await this.activityService.getGithubActivityStats(
        options.user.id,
        options.startDate,
        options.endDate,
      );

      let summary = `📊 **${result.memberName}** GitHub activity during \`${result.periodDescription}\`:\n`;

      if (result.stats.length === 0) {
        summary += 'No GitHub activity found.';
      } else {
        for (const stat of result.stats) {
          summary += `• **${stat.type}**: ${stat.count}\n`;
        }
      }

      await interaction.editReply({ content: summary });
    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error instanceof Error ? error.message : 'An error occurred'}`,
      });
    }
  }

  @necord.SlashCommand({
    name: 'channel_activity',
    description: 'Displays the 10 most active channels on the server',
  })
  public async onChannelActivity(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: ChannelActivityDto,
  ) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const stats = await this.activityService.getChannelActivityStats(
        options.interval,
      );

      if (stats.channels.length === 0) {
        await interaction.editReply({
          content: 'No channel activity found for the selected interval.',
        });
        return;
      }

      const lines = stats.channels.map((c, idx) => {
        const channel = interaction.guild?.channels.cache.get(c.channelId);
        return `${idx + 1}. ${channel ? `<#${c.channelId}>` : `ID: ${c.channelId}`} — ${c.messageCount} messages`;
      });

      await interaction.editReply({
        content: `**Most active channels (${stats.periodDescription}):**\n${lines.join('\n')}`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error instanceof Error ? error.message : 'An error occurred'}`,
      });
    }
  }
}
