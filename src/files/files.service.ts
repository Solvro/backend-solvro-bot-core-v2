import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GuildManager } from 'discord.js';
import { DatabaseService } from 'src/database/database.service';

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
@Injectable()
export class FilesService {
  constructor(private database: DatabaseService, private readonly client: Client, private readonly guilds: GuildManager, private readonly configService: ConfigService) { }

  public async generateAttendanceFile(meetingId: number): Promise<string | null> {
    const attendees = await this.database.member.findMany({
      where: { meetings: { some: { id: meetingId } } },
    })

    if (attendees.length === 0) {
      return null;
    }

    const guild = await this.guilds.fetch(this.configService.get<string>('DISCORD_GUILD_ID')!);
    await guild.members.fetch();

    const userInfo = attendees.map(attendee => {
      const member = guild.members.cache.get(attendee.discordId);
      const user = member?.user;
      return {
        discordId: attendee.discordId,
        globalName: user ? user.globalName : 'Unknown User',
        serverNickname: member ? (member.displayName || 'No Nickname') : 'Not in Server',
      };
    });

    const header = 'discordId,globalName,serverNickname';
    const rows = userInfo.map(info => `${info.discordId},${info.globalName},${info.serverNickname}`);
    const csvContent = [header, ...rows].join('\n');

    return csvContent;
  }

  public async generateMeetingSummaryFile(meetingId: number) {
    const meeting = await this.database.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting || !meeting.summary) {
      return null;
    }

    return meeting.summary;
  }

  public async generateMeetingTranscriptFile(meetingId: number) {
    const meeting = await this.database.meeting.findUnique({
      where: { id: meetingId },
      include: { transcriptionChunks: true }
    });

    if (!meeting || !meeting.fullTranscription || meeting.transcriptionChunks.length === 0) {
      return null;
    }

    const guild = await this.guilds.fetch(this.configService.get<string>('DISCORD_GUILD_ID')!);
    await guild.members.fetch();

    const userNames: Record<string, string> = {};
    for (const chunk of meeting.transcriptionChunks) {
      if (!userNames[chunk.speakerDiscordId]) {
        const member = guild.members.cache.get(chunk.speakerDiscordId)
        userNames[chunk.speakerDiscordId] = member ? member.displayName : `User#${chunk.speakerDiscordId}`
      }
    }

    const formattedText = meeting.transcriptionChunks
      .map((chunk) => {
        const timestamp = formatTimestamp(chunk.startTime)
        const userName = userNames[chunk.speakerDiscordId]
        return `[${timestamp}] ${userName}: ${chunk.text}`
      })
      .join('\n')

    return formattedText;
  }
}
