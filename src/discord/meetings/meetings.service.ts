import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, VoiceBasedChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { Meeting } from 'generated/prisma/client';
import {
  AttendanceState,
  RecordingState,
  MeetingType,
} from 'generated/prisma/enums';
import { DatabaseService } from 'src/database/database.service';
import { GuildConfigService } from 'src/config/guild-config/guild-config.service';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private database: DatabaseService,
    private configService: ConfigService,
    private readonly client: Client,
    private readonly guildConfig: GuildConfigService,
  ) { }

  private async startTranscriber(
    channelId: string,
    meetingId: number,
    meetingName: string,
  ): Promise<boolean> {
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
    } catch {
      return false;
    }
  }

  private async startAttendanceMonitoring(
    meetingId: number,
    channel: VoiceBasedChannel,
  ): Promise<void> {
    await this.database.meeting.update({
      where: { id: meetingId },
      data: {
        attendanceStatus: AttendanceState.Monitoring,
        attendees: {
          connectOrCreate: channel.members.map((member) => ({
            where: { discordId: member.id },
            create: { discordId: member.id },
          })),
        },
      },
    });
  }

  private async stopAttendanceMonitoring(meetingId: number): Promise<void> {
    await this.database.meeting.update({
      where: { id: meetingId },
      data: {
        attendanceStatus: AttendanceState.Completed,
      },
    });
  }

  public async createMeeting(params: {
    name: string;
    channel: VoiceBasedChannel;
    meetingType?: MeetingType;
    enableAttendance?: boolean;
    enableTranscription?: boolean;
  }): Promise<Meeting> {
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
        attendanceStatus: enableAttendance
          ? AttendanceState.Monitoring
          : AttendanceState.Idle,
        meetingType,
        recordingStatus: enableTranscription
          ? RecordingState.InProgress
          : RecordingState.NotRecorded,
      },
    });

    try {
      if (enableTranscription) {
        // await transcriber start; if it fails, we must rollback
        const started = await this.startTranscriber(
          channel.id,
          meeting.id,
          name,
        );
        if (!started) {
          throw new Error('Transcriber service failure');
        }
      }

      if (enableAttendance) {
        await this.startAttendanceMonitoring(meeting.id, channel);
      }

      return meeting;
    } catch (error) {
      // Rollback: delete the meeting and re-throw
      this.logger.error(
        `Failed to start meeting ${meeting.id}, rolling back...`,
        error,
      );
      await this.database.meeting.delete({ where: { id: meeting.id } });
      throw new Error(
        'Could not start meeting: Transcriber service is unavailable or failed to start.',
      );
    }
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
      const stopped = await this.stopTranscriber();
      if (!stopped) {
        this.logger.error(
          `Failed to stop transcriber for meeting ${meeting.id}`,
        );
      }
      await this.database.meeting.update({
        where: { id: meeting.id },
        data: { recordingStatus: RecordingState.AwaitingProcessing },
      });
    }

    if (meeting.attendanceStatus === AttendanceState.Monitoring) {
      await this.stopAttendanceMonitoring(meeting.id);
    }

    const finishedAt = new Date();
    await this.database.meeting.update({
      where: { id: meeting.id },
      data: { finishedAt },
    });

    try {
      const discordChannel = await this.client.channels.fetch(meeting.discordChannelId ?? "");
      if (discordChannel && 'guild' in discordChannel) {
        const guildConfig = await this.guildConfig.get(discordChannel.guild.id);
        if (guildConfig && guildConfig.meetingLogChannelId) {
          const logChannel = await this.client.channels.fetch(guildConfig.meetingLogChannelId) as TextChannel;
          if (logChannel && logChannel.isTextBased()) {
            // Calculate details
            const durationMs = finishedAt.getTime() - meeting.createdAt.getTime();
            const durationMinutes = Math.floor(durationMs / 60000);

            // Get attendee count
            const attendeesCount = await this.database.member.count({
              where: {
                meetings: { some: { id: meeting.id } }
              }
            });

            const embed = new EmbedBuilder()
              .setTitle(`📊 Meeting Ended: ${meeting.name}`)
              .setColor('#00FF00')
              .addFields(
                { name: 'Type', value: meeting.meetingType, inline: true },
                { name: 'Duration', value: `${durationMinutes} minutes`, inline: true },
                { name: 'Attendees', value: attendeesCount.toString(), inline: true },
              )
              .setTimestamp(finishedAt);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(`BUTTON_TRANSCRIPTION/${meeting.id}`)
                .setLabel('Transcription')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`BUTTON_ATTENDANCE/${meeting.id}`)
                .setLabel('Attendance')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`BUTTON_SUMMARY/${meeting.id}`)
                .setLabel('Summary')
                .setStyle(ButtonStyle.Secondary),
            );

            await logChannel.send({ embeds: [embed], components: [row] });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send meeting log for meeting ${meeting.id}`, error);
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

  public async getMeetingsWithProcessedRecordings(): Promise<Meeting[]> {
    const meetings = await this.database.meeting.findMany({
      where: {
        recordingStatus: RecordingState.Processed,
      },
      orderBy: { createdAt: 'desc' },
    });

    return meetings;
  }

  public chunkStringRespectingLinesAndWords(
    text: string,
    maxLength = 2000,
  ): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + '\n' + line).length <= maxLength) {
        currentChunk += (currentChunk ? '\n' : '') + line;
      } else {
        if (line.length > maxLength) {
          // The line itself is too long – split by words
          const words = line.split(' ');
          let lineChunk = '';
          for (const word of words) {
            if ((lineChunk + ' ' + word).length <= maxLength) {
              lineChunk += (lineChunk ? ' ' : '') + word;
            } else {
              // Save current and start new
              if (lineChunk)
                chunks.push(
                  currentChunk + (currentChunk ? '\n' : '') + lineChunk,
                );
              else chunks.push(currentChunk);
              currentChunk = '';
              lineChunk = word;
            }
          }
          if (lineChunk) {
            if ((currentChunk + '\n' + lineChunk).length <= maxLength) {
              currentChunk += (currentChunk ? '\n' : '') + lineChunk;
            } else {
              chunks.push(currentChunk);
              currentChunk = lineChunk;
            }
          }
        } else {
          // Normal case: commit current chunk and start new
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = line;
        }
      }
    }

    if (currentChunk) chunks.push(currentChunk);

    return chunks;
  }
}
