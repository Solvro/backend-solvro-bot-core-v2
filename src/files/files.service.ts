import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GuildManager } from 'discord.js';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class FilesService {
    constructor(private database: DatabaseService, private readonly client: Client, private readonly guilds: GuildManager, private readonly configService: ConfigService) { }

    public async generateAttendenceFile(meetingId: number): Promise<string | null> {
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
}
