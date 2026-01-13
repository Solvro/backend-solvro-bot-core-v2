import { Injectable } from "@nestjs/common";
import * as necord from "necord";
import { ActionRowBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { MeetingsService } from "./meetings.service";
import { MeetingType } from "generated/prisma/enums";
import { GuildMember } from "discord.js";

@Injectable()
export class MeetingsComponents {
    constructor(private meetingsService: MeetingsService) { }

    @necord.Button('BUTTON_START_WEEKLY')
    public async onStartWeeklyButton(@necord.Context() [interaction]: necord.ButtonContext) {
        const activeMeeting = await this.meetingsService.getActiveMeeting();
        if (activeMeeting) {
            await interaction.reply({
                content: "❌ A meeting is already in progress. Please stop it before starting a new one.",
                ephemeral: true
            });
            return;
        }

        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;

        if (!channel) {
            await interaction.reply({
                content: "❌ You must be in a voice channel to start a meeting.",
                ephemeral: true
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('MODAL_START_WEEKLY')
            .setTitle(`Start Weekly in ${channel.name}`);

        const nameInput = new TextInputBuilder()
            .setCustomId('meetingName')
            .setLabel("Meeting Name")
            .setStyle(TextInputStyle.Short)
            .setValue(`Weekly ${new Date().toLocaleDateString()}`)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    }

    @necord.Modal('MODAL_START_WEEKLY')
    public async onStartWeeklyModal(@necord.Context() [interaction]: necord.ModalContext) {
        await interaction.deferReply({ ephemeral: true });

        const name = interaction.fields.getTextInputValue('meetingName');
        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;

        if (!channel) {
            await interaction.editReply({
                content: "❌ You must be in a voice channel to start a meeting."
            });
            return;
        }

        // Double check race condition
        const activeMeeting = await this.meetingsService.getActiveMeeting();
        if (activeMeeting) {
            await interaction.editReply({
                content: "❌ A meeting is already in progress."
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
            content: `✅ Weekly session **${name}** started successfully in **${channel.name}**:\n- 🎤 Transcription is now active\n- 📋 Attendance tracking is in progress`
        });
    }

    @necord.Button('BUTTON_STOP_WEEKLY')
    public async onStopWeeklyButton(@necord.Context() [interaction]: necord.ButtonContext) {
        await interaction.deferReply({ ephemeral: true });

        const activeMeeting = await this.meetingsService.getActiveMeeting();
        if (!activeMeeting) {
            await interaction.editReply({
                content: "❌ No meeting is currently in progress."
            });
            return;
        }

        await this.meetingsService.stopCurrentMeeting();

        await interaction.editReply({
            content: "✅ Weekly session ended successfully:\n- 🎤 Transcription is being processed and will be available shortly\n- 📋 Attendance tracking is complete\n- 💾 Files will be automatically uploaded to Google Drive when the summary is ready"
        });
    }

    @necord.Button('BUTTON_TRANSCRIPTION')
    public async onTranscriptionButton(@necord.Context() [interaction]: necord.ButtonContext) {
        await interaction.reply({
            content: "ℹ️ Transcription feature coming soon!",
            ephemeral: true
        });
    }

    @necord.Button('BUTTON_ATTENDANCE')
    public async onAttendanceButton(@necord.Context() [interaction]: necord.ButtonContext) {
        await interaction.deferReply({ ephemeral: true });

        const meetings = await this.meetingsService.getPastMeetingsOptions();

        if (meetings.length === 0) {
            await interaction.editReply({
                content: "❌ No past meetings with attendance data found. Mind that after stopping a meeting, it may take a few moments for the attendance data to be available."
            });
            return;
        }

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('SELECT_ATTENDANCE_MEETING_ID')
                    .setPlaceholder('Select a meeting to view attendance')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(
                        ...meetings
                    )
            );
        await interaction.editReply({ components: [row] });
    }

    @necord.Button('BUTTON_SUMMARY')
    public async onSummaryButton(@necord.Context() [interaction]: necord.ButtonContext) {
        await interaction.reply({
            content: "ℹ️ Summary feature coming soon!",
            ephemeral: true
        });
    }
}