import { Injectable } from '@nestjs/common';
import * as necord from 'necord';
import { OfficeCameraService } from './office-camera.service';

@Injectable()
export class OfficeCameraCommands {
  constructor(private readonly officeCameraService: OfficeCameraService) {}

  @necord.SlashCommand({
    name: 'office_widget',
    description: 'Send office camera updates to this channel',
  })
  public async onOfficeWidget(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await this.officeCameraService.addChannelToUpdateList(
        interaction.channelId,
      );
      await interaction.editReply({
        content: '✅ Channel successfully added as widget',
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  @necord.SlashCommand({
    name: 'office_widget_remove',
    description: 'Stop receiving updates from office camera on this channel',
  })
  public async onOfficeWidgetRemove(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await this.officeCameraService.removeChannelFromUpdateList(
        interaction.channelId,
      );
      await interaction.editReply({
        content: '✅ Widget successfully removed',
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  @necord.SlashCommand({
    name: 'office_down_alert',
    description:
      'Subscribe or unsubscribe from office camera downtime alerts (sent to dm)',
  })
  public async onOfficeDownAlert(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const isSubscribed = await this.officeCameraService.toggleDowntimeAlert(
        interaction.user.id,
      );
      if (isSubscribed) {
        await interaction.editReply({
          content:
            '✅ You have been subscribed to office camera downtime alerts.',
        });
      } else {
        await interaction.editReply({
          content:
            '✅ You have been unsubscribed from office camera downtime alerts.',
        });
      }
    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}
