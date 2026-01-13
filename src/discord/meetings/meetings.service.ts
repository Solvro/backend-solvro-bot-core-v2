import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceBasedChannel } from 'discord.js';
import { Meeting } from 'generated/prisma/client';
import { AttendanceState, RecordingState, MeetingType } from 'generated/prisma/enums';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class MeetingsService {
    private readonly logger = new Logger(MeetingsService.name);

    constructor(private database: DatabaseService, private configService: ConfigService) { }

    private async startTranscriber(channelId: string, meetingId: number, meetingName: string): Promise<boolean> {
        try {
            // send request to transcriber service to start recording
            const transcriberUrl = this.configService.get<string>('TRANSCRIBER_URL');
            const response = await fetch(`${transcriberUrl}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId,
                    meetingId: meetingId.toString(),
                    meetingName,
                }),
            });
            return response.ok;
        } catch (error) {
            this.logger.error('Failed to start transcriber', error);
            return false;
        }
    }

    private async stopTranscriber(): Promise<boolean> {
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

    private async startAttendanceMonitoring(meetingId: number, channel: VoiceBasedChannel): Promise<void> {
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

    private async stopAttendanceMonitoring(meetingId: number): Promise<void> {
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
    }): Promise<Meeting>{
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

    public async getActiveMeeting(): Promise<Meeting | null> {
        return this.database.meeting.findFirst({
            where: {
                OR: [
                    { attendanceStatus: AttendanceState.Monitoring },
                    { recordingStatus: RecordingState.InProgress },
                ],
            },
        });
    }

    public async stopCurrentMeeting(): Promise<void> {
        const meeting = await this.getActiveMeeting();

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

    public async getMeetingsWithCompletedAttendance(): Promise<Meeting[]> {
        const meetings = await this.database.meeting.findMany({
            where: {
                attendanceStatus: AttendanceState.Completed,
            },
            orderBy: { createdAt: 'desc' },
        });

        return meetings;
    }
}
