import { Injectable } from '@nestjs/common';
import * as necord from 'necord';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { MeetingsService } from './meetings.service';
import { MeetingType } from 'generated/prisma/enums';
import { GuildMember } from 'discord.js';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class MeetingsComponents {
  constructor(
    private meetingsService: MeetingsService,
    private filesService: FilesService,
  ) {}

  @necord.Button('BUTTON_START_WEEKLY')
  public async onStartWeeklyButton(
    @necord.Context() [interaction]: necord.ButtonContext,
  ) {
    const activeMeeting = await this.meetingsService.getActiveMeeting();
    if (activeMeeting) {
      await interaction.reply({
        content:
          '❌ A meeting is already in progress. Please stop it before starting a new one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const channel = member.voice.channel;

    if (!channel) {
      await interaction.reply({
        content: '❌ You must be in a voice channel to start a meeting.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('MODAL_START_WEEKLY')
      .setTitle(`Start Weekly in ${channel.name}`);

    const nameInput = new TextInputBuilder()
      .setCustomId('meetingName')
      .setLabel('Meeting Name')
      .setStyle(TextInputStyle.Short)
      .setValue(`Weekly ${new Date().toLocaleDateString()}`)
      .setRequired(true);

    const firstActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }

  @necord.Modal('MODAL_START_WEEKLY')
  public async onStartWeeklyModal(
    @necord.Context() [interaction]: necord.ModalContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const name = interaction.fields.getTextInputValue('meetingName');
    const member = interaction.member as GuildMember;
    const channel = member.voice.channel;

    if (!channel) {
      await interaction.editReply({
        content: '❌ You must be in a voice channel to start a meeting.',
      });
      return;
    }

    // Double check race condition
    const activeMeeting = await this.meetingsService.getActiveMeeting();
    if (activeMeeting) {
      await interaction.editReply({
        content: '❌ A meeting is already in progress.',
      });
      return;
    }

    await this.meetingsService.createMeeting({
      name: name,
      channel: channel,
      meetingType: MeetingType.Weekly,
      enableAttendance: true,
      enableTranscription: true,
    });

    await interaction.editReply({
      content: `✅ Weekly session **${name}** started successfully in **${channel.name}**:\n- 🎤 Transcription is now active\n- 📋 Attendance tracking is in progress`,
    });
  }

  @necord.Button('BUTTON_STOP_WEEKLY')
  public async onStopWeeklyButton(
    @necord.Context() [interaction]: necord.ButtonContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
        '✅ Weekly session ended successfully:\n- 🎤 Transcription is being processed and will be available shortly\n- 📋 Attendance tracking is complete\n- 💾 Files will be automatically uploaded to Google Drive when the summary is ready',
    });
  }

  @necord.Button('BUTTON_ATTENDANCE')
  public async onAttendanceButton(
    @necord.Context() [interaction]: necord.ButtonContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const meetings = (
      await this.meetingsService.getMeetingsWithCompletedAttendance()
    ).map((meeting) => {
      return {
        label: meeting.name ?? `Meeting #${meeting.id}`,
        description: meeting.createdAt.toLocaleDateString(),
        value: meeting.id.toString(),
      };
    });

    if (meetings.length === 0) {
      await interaction.editReply({
        content:
          '❌ No past meetings with attendance data found. Mind that after stopping a meeting, it may take a few moments for the attendance data to be available.',
      });
      return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ATTENDANCE_SELECT_MEETING_ID')
        .setPlaceholder('Select a meeting to view attendance')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(...meetings),
    );
    await interaction.editReply({ components: [row] });
  }

  @necord.Button('BUTTON_SUMMARY')
  public async onSummaryButton(
    @necord.Context() [interaction]: necord.ButtonContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const meetings = (
      await this.meetingsService.getMeetingsWithProcessedRecordings()
    ).map((meeting) => {
      return {
        label: meeting.name ?? `Meeting #${meeting.id}`,
        description: meeting.createdAt.toLocaleDateString(),
        value: meeting.id.toString(),
      };
    });

    if (meetings.length === 0) {
      await interaction.editReply({
        content:
          '❌ No past meetings with processed recordings found. Mind that after stopping a meeting, it may take a few moments for the recording to be processed.',
      });
      return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('SUMMARY_SELECT_MEETING_ID')
        .setPlaceholder('Select a meeting to view summary')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(...meetings),
    );

    await interaction.editReply({ components: [row] });
  }

  @necord.Button('BUTTON_TRANSCRIPTION')
  public async onTranscriptionButton(
    @necord.Context() [interaction]: necord.ButtonContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const meetings = (
      await this.meetingsService.getMeetingsWithProcessedRecordings()
    ).map((meeting) => {
      return {
        label: meeting.name ?? `Meeting #${meeting.id}`,
        description: meeting.createdAt.toLocaleDateString(),
        value: meeting.id.toString(),
      };
    });

    if (meetings.length === 0) {
      await interaction.editReply({
        content:
          '❌ No past meetings with processed recordings found. Mind that after stopping a meeting, it may take a few moments for the recording to be processed.',
      });
      return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('TRANSCRIPTION_SELECT_MEETING_ID')
        .setPlaceholder('Select a meeting to view transcription')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(...meetings),
    );

    await interaction.editReply({ components: [row] });
  }

  @necord.StringSelect('ATTENDANCE_SELECT_MEETING_ID')
  public async onAttendanceSelectMeeting(
    @necord.Context() [interaction]: necord.StringSelectContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const meetingId = parseInt(interaction.values[0], 10);
    const csvContent =
      await this.filesService.generateAttendanceFile(meetingId);

    if (!csvContent) {
      await interaction.editReply({
        content: '❌ No attendance data found for the selected meeting.',
      });
      return;
    }

    await interaction.editReply({
      content: '📋 Attendance Data (CSV):',
      files: [
        {
          attachment: Buffer.from(csvContent, 'utf-8'),
          name: `attendance_meeting_${meetingId}.csv`,
        },
      ],
    });
  }

  @necord.StringSelect('SUMMARY_SELECT_MEETING_ID')
  public async onSummarySelectMeeting(
    @necord.Context() [interaction]: necord.StringSelectContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const meetingId = parseInt(interaction.values[0], 10);
    const summary =
      await this.filesService.generateMeetingSummaryFile(meetingId);

    if (!summary) {
      await interaction.editReply({
        content:
          '❌ No summary found for the selected meeting. Mind that it may take a few moments after stopping a meeting for the summary to be generated.',
      });
      return;
    }

    if (summary.length <= 2000) {
      await interaction.editReply({
        content: `**Summary for selected meeting:**\n\n${summary}`,
        components: [],
      });
    } else if (summary.length <= 6000) {
      const chunks =
        this.meetingsService.chunkStringRespectingLinesAndWords(summary);

      await interaction.editReply({
        content: '**Summary for selected meeting (split):**',
        components: [],
      });

      for (const chunk of chunks) {
        await interaction.followUp({
          content: chunk,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else {
      // Too long — send as file
      const file = new AttachmentBuilder(Buffer.from(summary), {
        name: `meeting-summary-${meetingId}.md`,
      });

      await interaction.editReply({
        content:
          '**Summary is too long to display here. Download the full summary below:**',
        files: [file],
        components: [],
      });
    }
  }

  @necord.StringSelect('TRANSCRIPTION_SELECT_MEETING_ID')
  public async onTranscriptionSelectMeeting(
    @necord.Context() [interaction]: necord.StringSelectContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const meetingId = parseInt(interaction.values[0], 10);
    const transcription =
      await this.filesService.generateMeetingTranscriptFile(meetingId);

    if (!transcription) {
      await interaction.editReply({
        content:
          '❌ No transcription found for the selected meeting. Mind that it may take a few moments after stopping a meeting for the transcription to be generated.',
      });
      return;
    }

    const file = new AttachmentBuilder(Buffer.from(transcription), {
      name: `meeting-transcription-${meetingId}.md`,
    });

    await interaction.editReply({
      content: '**Transcription for selected meeting:**',
      files: [file],
      components: [],
    });
  }
}
