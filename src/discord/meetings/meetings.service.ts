import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceBasedChannel } from 'discord.js';
import { AttendanceState, RecordingState, MeetingType } from 'generated/prisma/enums';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class MeetingsService {
    constructor(private database: DatabaseService, private configService: ConfigService) { }

    private async startTranscriber(channelId: string, meetingId: number, meetingName: string) {
        try {
            // send request to transcriber service to start recording
            const transcriberUrl = this.configService.get<string>('TRANSCRIBER_URL');
            const response = await fetch(`${transcriberUrl}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId,
                    meetingId,
                    meetingName,
                }),
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    private async stopTranscriber() {
        try {
            // send request to transcriber service to stop recording
            const transcriberUrl = this.configService.get<string>('TRANSCRIBER_URL');
            const response = await fetch(`${transcriberUrl}/stop`, {
                method: 'POST',
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    private async startAttendanceMonitoring(meetingId: number, channel: VoiceBasedChannel) {
        await this.database.meeting.update({
            where: { id: meetingId },
            data: {
                attendanceStatus: AttendanceState.Monitoring,
                attendees: {
                    connectOrCreate: channel.members.map(member => ({
                        where: { discordId: member.id },
                        create: { discordId: member.id },
                    })),
                }
            }
        });
    }

    private async stopAttendanceMonitoring(meetingId: number) {
        await this.database.meeting.update({
            where: { id: meetingId },
            data: {
                attendanceStatus: AttendanceState.Completed,
            }
        });
    }

    public async createMeeting(params: {
        name: string;
        channel: VoiceBasedChannel;
        meetingType?: MeetingType;
        enableAttendance?: boolean;
        enableTranscription?: boolean;
    }) {
        const {
            name,
            channel,
            meetingType = MeetingType.Other,
            enableAttendance = false,
            enableTranscription = false,
        } = params;

        const meeting = await this.database.meeting.create({
            data: {
                name,
                discordChannelId: channel.id,
                attendanceStatus: enableAttendance ? AttendanceState.Monitoring : AttendanceState.Idle,
                meetingType,
                recordingStatus: enableTranscription ? RecordingState.InProgress : RecordingState.NotRecorded,
            },
        });

        if (enableTranscription) {
            // best-effort start transcriber; ignore result for now
            // TODO: handle transcriber start failure
            await this.startTranscriber(channel.id, meeting.id, name);
        }

        if (enableAttendance) {
            await this.startAttendanceMonitoring(meeting.id, channel);
        }

        return meeting;
    }

    public async stopCurrentMeeting() {
        const meeting = await this.database.meeting.findFirst({
            where: {
                OR: [
                    { attendanceStatus: AttendanceState.Monitoring },
                    { recordingStatus: RecordingState.InProgress },
                ],
            },
        });

        if (!meeting) {
            return;
        }

        if (meeting.recordingStatus === RecordingState.InProgress) {
            await this.stopTranscriber();
            await this.database.meeting.update({
                where: { id: meeting.id },
                data: { recordingStatus: RecordingState.AwaitingProcessing },
            });
        }

        if (meeting.attendanceStatus === AttendanceState.Monitoring) {
            await this.stopAttendanceMonitoring(meeting.id);
        }
    }
}
