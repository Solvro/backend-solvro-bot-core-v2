import { Injectable } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GuildConfigService } from 'src/config/guild-config/guild-config.service';
import { AutoRoleDto } from './dto/auto-role.dto';
import {
  Context,
  SlashCommand,
  type SlashCommandContext,
  Options,
} from 'necord';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { MeetingSetLogChannelDto } from './dto/meeting-set-log-channel.dto';

@Injectable()
export class AdminCommands {
  constructor(
    private readonly adminService: AdminService,
    private readonly guildConfig: GuildConfigService,
  ) { }

  @SlashCommand({
    name: 'set-autorole',
    description: 'Set the automatic role assigned to new members',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
  })
  public async setAutoRole(
    @Context() [interaction]: SlashCommandContext,
    @Options() { role }: AutoRoleDto,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await this.guildConfig.update(interaction.guild!.id, {
      autoRoleId: role.id,
    });

    await interaction.editReply({
      content: `✅ Auto role has been set to ${role.toString()}`,
    });
  }

  @SlashCommand({
    name: 'meeting_set_log_channel',
    description: 'Sets the channel where meeting logs will be sent',
  })
  public async onSetLogChannel(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: MeetingSetLogChannelDto,
  ) {
    if (!interaction.guildId) return;
    await interaction.deferReply({ ephemeral: true });

    const targetChannelId = channel ? channel.id : interaction.channelId;

    await this.guildConfig.update(interaction.guildId, {
      meetingLogChannelId: targetChannelId,
    });

    await interaction.editReply({
      content: `✅ Meeting logs channel has been set to <#${targetChannelId}>`,
    });
  }
}
