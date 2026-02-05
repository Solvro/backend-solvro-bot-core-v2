import { Injectable } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GuildConfigService } from 'src/config/guild-config/guild-config.service';
import { AutoRoleDto } from './dto/auto-role.dto';
import { Context, SlashCommand, type SlashCommandContext, Options, StringOption } from 'necord';
import { MessageFlags } from 'discord.js';

@Injectable()
export class AdminCommands {
  constructor(
    private readonly adminService: AdminService,
    private readonly guildConfig: GuildConfigService
  ) { }

  @SlashCommand({
    name: 'set-autorole',
    description: 'Set the automatic role assigned to new members',
  })
  public async setAutoRole(@Context() [interaction]: SlashCommandContext, @Options() { role }: AutoRoleDto) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await this.guildConfig.update(interaction.guild!.id, {
      autoRoleId: role.id,
    });

    await interaction.editReply({
      content: `✅ Auto role has been set to ${role.toString()}`,
    });
  }
}
