import { Injectable, Logger } from '@nestjs/common';
import * as necord from 'necord';
import { DatabaseService } from './database/database.service';
import { AttendanceState } from 'generated/prisma/enums';

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(private database: DatabaseService) { }

    getHello(): string {
        return 'Hello World!';
    }

    @necord.SlashCommand({
        name: 'ping',
        description: 'Replies with Pong!',
    })
    public async onPing(@necord.Context() [interaction]: necord.SlashCommandContext) {
        return interaction.reply({ content: 'Pong!' });
    }

    @necord.Once('clientReady')
    public onClientReady() {
        this.logger.log('Discord client is ready!');
    }

    @necord.Once('voiceChannelJoin')
    public async onVoiceChannelJoin(@necord.Context() [member, channel]: necord.ContextOf<'voiceChannelJoin'>) {
        if (member.user.bot) return;

        const meeting = await this.database.meeting.findFirst({
            where: {
                attendanceStatus: AttendanceState.Monitoring,
                discordChannelId: channel.id,
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });

        if (!meeting) return;

        await this.database.meeting.update({
            where: { id: meeting.id },
            data: {
                attendees: {
                    connectOrCreate: {
                        where: { discordId: member.id },
                        create: { discordId: member.id },
                    }
                }
            }
        });
    }
}
