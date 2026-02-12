import { Injectable } from '@nestjs/common';
import * as necord from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { WeeklyStartDTO } from './dto/weekly-start.dto';
import { MeetingsService } from './meetings.service';
import { MeetingType } from 'generated/prisma/enums';

@Injectable()
export class MeetingsCommands {
  constructor(
    private meetingsService: MeetingsService,
    private readonly client: Client,
  ) { }

  @necord.SlashCommand({
    name: 'weekly_start',
    description:
      'Creates a meeting, starts voice recording and attendance monitoring on a given channel',
  })
  public async onWeeklyStart(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: WeeklyStartDTO,
  ) {
    await interaction.deferReply();

    const activeMeeting = await this.meetingsService.getActiveMeeting();
    if (activeMeeting) {
      await interaction.editReply({
        content:
          '❌ A meeting is already in progress. Please stop it before starting a new one.',
      });
      return;
    }

    try {
      await this.meetingsService.createMeeting({
        name: options.name,
        channel: options.channelId,
        meetingType: MeetingType.Weekly,
        enableAttendance: true,
        enableTranscription: true,
      });

      await interaction.editReply({
        content:
          '✅ Weekly session started successfully:\n- 🎤 Transcription is now active\n- 📋 Attendance tracking is in progress',
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to start weekly session: ${error.message}`,
      });
    }
  }

  @necord.SlashCommand({
    name: 'other_start',
    description:
      'Creates a generic meeting, starts voice recording and attendance monitoring',
  })
  public async onOtherStart(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: WeeklyStartDTO,
  ) {
    await interaction.deferReply();

    const activeMeeting = await this.meetingsService.getActiveMeeting();
    if (activeMeeting) {
      await interaction.editReply({
        content:
          '❌ A meeting is already in progress. Please stop it before starting a new one.',
      });
      return;
    }

    try {
      await this.meetingsService.createMeeting({
        name: options.name,
        channel: options.channelId,
        meetingType: MeetingType.Other,
        enableAttendance: true,
        enableTranscription: true,
      });

      await interaction.editReply({
        content:
          '✅ Session started successfully:\n- 🎤 Transcription is now active\n- 📋 Attendance tracking is in progress',
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to start session: ${error.message}`,
      });
    }
  }

  @necord.SlashCommand({
    name: 'meeting_stop',
    description:
      'Stops the current meeting (Weekly or Other) monitoring, recording and attendance tracking',
  })
  public async onMeetingStop(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    await interaction.deferReply();

    const activeMeeting = await this.meetingsService.getActiveMeeting();
    if (!activeMeeting) {
      await interaction.editReply({
        content: '❌ No meeting is currently in progress.',
      });
      return;
    }

    await this.meetingsService.stopCurrentMeeting();

    await interaction.editReply({
      content:
        '✅ Session ended successfully:\n- 🎤 Transcription is being processed and will be available shortly\n- 📋 Attendance tracking is complete\n- 💾 Files will be automatically uploaded to Google Drive when the summary is ready\n\nYou can:\n- 📄 View the transcription with `/transcription`\n- 🧠 See the meeting summary with `/meeting_summary`\n- 👥 View attendance with `/show_attendance`\n- 📊 Check upload status with `/upload_status`',
    });
  }

  @necord.SlashCommand({
    name: 'meeting_control_panel',
    description: 'Displays the control panel for managing meetings',
  })
  public async onControlPanel(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('BUTTON_START_WEEKLY')
        .setLabel('Start Weekly Session')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('BUTTON_START_OTHER')
        .setLabel('Start Other Session')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('BUTTON_STOP_SESSION')
        .setLabel('Stop Session')
        .setStyle(ButtonStyle.Danger),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('BUTTON_TRANSCRIPTION')
        .setLabel('Transcription')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('BUTTON_ATTENDANCE')
        .setLabel('Attendance')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('BUTTON_SUMMARY')
        .setLabel('Summary')
        .setStyle(ButtonStyle.Secondary),
    );

    if (!interaction.channel) {
      await interaction.editReply({
        content: '❌ Unable to send control panel: channel not found.',
      });
      return;
    }

    const channel = await this.client.channels.fetch(interaction.channel.id);

    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({
        content: '❌ Unable to send control panel: channel is not text-based.',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🎙️ Meeting Control Panel')
      .setDescription('Manage your sessions with the controls below.')
      .setColor('#0099ff')
      .addFields(
        {
          name: '🟢 Start Weekly',
          value: 'Starts a standard weekly session.',
          inline: true,
        },
        {
          name: '🔵 Start Other',
          value: 'Starts a generic meeting session.',
          inline: true,
        },
        {
          name: '🔴 Stop Session',
          value: 'Stops the current session and processes data.',
          inline: true,
        },
        { name: '\u200B', value: '\u200B' }, // Spacer
        {
          name: 'Additional Controls',
          value:
            'Use the buttons below to access transcription, attendance, and summary features.',
        },
      )
      .setFooter({ text: 'Solvro Bot • Meetings' })
      .setTimestamp();

    await (channel as TextChannel).send({
      embeds: [embed],
      components: [row1, row2],
    });

    await interaction.editReply({
      content: '✅ Control panel sent to the channel.',
    });
  }
}
