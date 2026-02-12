import { Injectable, Logger } from '@nestjs/common';
import * as necord from 'necord';
import { DatabaseService } from './database/database.service';
import { AttendanceState } from 'generated/prisma/enums';
import { GuildConfigService } from './config/guild-config/guild-config.service';
import { EmbedBuilder, MessageFlags } from 'discord.js';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private database: DatabaseService,
    private guildConfig: GuildConfigService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  @necord.SlashCommand({
    name: 'ping',
    description: 'Replies with Pong!',
  })
  public async onPing(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    return interaction.reply({
      content: 'Pong!',
      flags: MessageFlags.Ephemeral,
    });
  }

  @necord.SlashCommand({
    name: 'help',
    description: 'Displays a list of available commands and their descriptions',
  })
  public async onHelp(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Solvro Bot Help')
      .setDescription(
        'Here is the list of available commands to help you manage meetings, track activity, and more.',
      )
      .setColor('#0099ff')
      .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
      .addFields(
        {
          name: '📊 Activity',
          value: [
            '`/discord_activity` - User stats',
            '`/github_activity` - GitHub activity',
            '`/channel_activity` - Top channels',
          ].join('\n'),
          inline: true,
        },
        {
          name: '🎙️ Meetings',
          value: [
            '`/weekly_control_panel` - Dashboard',
            '`/weekly_start` - Start meeting',
            '`/weekly_stop` - Stop meeting',
          ].join('\n'),
          inline: true,
        },
        {
          name: '📷 Office',
          value: [
            '`/office_widget` - Add widget',
            '`/office_widget_remove` - Remove',
            '`/office_down_alert` - Toggle alerts',
          ].join('\n'),
          inline: true,
        },
        {
          name: '🛠️ Utility',
          value: [
            '`/ping` - Bot status',
            '`/help` - Show help',
          ].join('\n'),
          inline: true,
        },
        {
          name: '🛡️ Admin',
          value: ['`/set-autorole` - Set auto-role'].join('\n'),
          inline: true,
        },
      )
      .setFooter({
        text: 'Solvro Bot • version 2.0',
        iconURL: interaction.client.user?.displayAvatarURL() || undefined,
      })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  @necord.Once('clientReady')
  public onClientReady() {
    this.logger.log('Discord client is ready!');
  }

  @necord.On('voiceChannelJoin')
  public async onVoiceChannelJoin(
    @necord.Context() [member, channel]: necord.ContextOf<'voiceChannelJoin'>,
  ) {
    if (member.user.bot) return;

    const meeting = await this.database.meeting.findFirst({
      where: {
        attendanceStatus: AttendanceState.Monitoring,
        discordChannelId: channel.id,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!meeting) return;

    await this.database.meeting.update({
      where: { id: meeting.id },
      data: {
        attendees: {
          connectOrCreate: {
            where: { discordId: member.id },
            create: { discordId: member.id },
          },
        },
      },
    });
  }

  @necord.On('messageCreate')
  public async onMessageCreate(
    @necord.Context() [message]: necord.ContextOf<'messageCreate'>,
  ) {
    if (message.author.bot) return;

    const channelId = message.channel.id;
    const discordId = message.author.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.database.$transaction(async (tx) => {
      const member = await tx.member.upsert({
        where: { discordId },
        create: { discordId },
        update: {},
      });

      const discordActivity = await tx.discordActivity.findFirst({
        where: {
          memberId: member.id,
          date: today,
        },
      });

      if (discordActivity) {
        await tx.discordActivity.update({
          where: { id: discordActivity.id },
          data: { messageCount: { increment: 1 } },
        });
      } else {
        await tx.discordActivity.create({
          data: {
            memberId: member.id,
            date: today,
            messageCount: 1,
          },
        });
      }

      const channelActivity = await tx.channelActivity.findFirst({
        where: {
          channelId,
          date: today,
        },
      });

      if (channelActivity) {
        await tx.channelActivity.update({
          where: { id: channelActivity.id },
          data: { messageCount: { increment: 1 } },
        });
      } else {
        await tx.channelActivity.create({
          data: {
            channelId,
            date: today,
            messageCount: 1,
          },
        });
      }
    });
  }

  @necord.On('guildMemberAdd')
  public async onGuildMemberAdd(
    @necord.Context() [member]: necord.ContextOf<'guildMemberAdd'>,
  ) {
    const config = await this.guildConfig.get(member.guild.id);

    if (config?.autoRoleId) {
      await member.roles.add(config.autoRoleId).catch((err: Error) => {
        this.logger.error(
          `Failed to assign auto role to member ${member.id} in guild ${member.guild.id}: ${err.message}`,
        );
      });
    }
  }
}
