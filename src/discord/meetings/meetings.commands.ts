import { Injectable } from "@nestjs/common";
import * as necord from "necord";
import { WeeklyStartDTO } from "./dto/weekly-start.dto";
import { MeetingsService } from "./meetings.service";
import { MeetingType } from "generated/prisma/enums";

@Injectable()
export class MeetingsCommands {
    constructor(private meetingsService: MeetingsService) { }
    @necord.SlashCommand({
        name: "weekly_start",
        description: "Creates a meeting, starts voice recording and attendance monitoring on a given channel",
    })
    public async onWeeklyStart(@necord.Context() [interaction]: necord.SlashCommandContext, @necord.Options() options: WeeklyStartDTO) {
        await this.meetingsService.createMeeting({
            name: options.name,
            channel: options.channelId,
            meetingType: MeetingType.Weekly,
            enableAttendance: true,
            enableTranscription: true,
        });

        await interaction.editReply({
            content: "✅ Weekly session started successfully:\n- 🎤 Transcription is now active\n- 📋 Attendance tracking is in progress"
        });
    }

    @necord.SlashCommand({
        name: "weekly_stop",
        description: "Stops the weekly meeting monitoring, recording and attendance tracking",
    })
    public async onWeeklyStop(@necord.Context() [interaction]: necord.SlashCommandContext) {
        await this.meetingsService.stopCurrentMeeting();

        await interaction.reply({
            content: "✅ Weekly session ended successfully:\n- 🎤 Transcription is being processed and will be available shortly\n- 📋 Attendance tracking is complete\n- 💾 Files will be automatically uploaded to Google Drive when the summary is ready\n\nYou can:\n- 📄 View the transcription with `/transcription`\n- 🧠 See the meeting summary with `/meeting_summary`\n- 👥 View attendance with `/show_attendance`\n- 📊 Check upload status with `/upload_status`"
        });
    }
}