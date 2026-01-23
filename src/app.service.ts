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

    @necord.On('voiceChannelJoin')
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

    @necord.On('messageCreate')
    public async onMessageCreate(@necord.Context() [message]: necord.ContextOf<'messageCreate'>) {
        if (message.author.bot) return;

        const channelId = message.channel.id;
        const discordId = message.author.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await this.database.$transaction(async (tx) => {
            const member = await tx.member.upsert({
                where: { discordId },
                create: { discordId },
                update: {},
            });

            const discordActivity = await tx.discordActivity.findFirst({
                where: {
                    memberId: member.id,
                    date: today,
                },
            });

            if (discordActivity) {
                await tx.discordActivity.update({
                    where: { id: discordActivity.id },
                    data: { messageCount: { increment: 1 } },
                });
            } else {
                await tx.discordActivity.create({
                    data: {
                        memberId: member.id,
                        date: today,
                        messageCount: 1,
                    },
                });
            }

            const channelActivity = await tx.channelActivity.findFirst({
                where: { channelId },
            });

            if (channelActivity) {
                await tx.channelActivity.update({
                    where: { id: channelActivity.id },
                    data: { messageCount: { increment: 1 } },
                });
            } else {
                await tx.channelActivity.create({
                    data: {
                        channelId,
                        messageCount: 1,
                    },
                });
            }
        });
    }
}
