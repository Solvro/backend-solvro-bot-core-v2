import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, EmbedBuilder, TextChannel, Message } from 'discord.js';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class OfficeCameraService {
    private readonly logger = new Logger(OfficeCameraService.name);

    constructor(
        private readonly database: DatabaseService,
        private readonly client: Client,
        private readonly configService: ConfigService,
    ) { }

    private async getOrCreateMessage(channel: TextChannel, messageId: string) {
        try {
            return await channel.messages.fetch(messageId);
        } catch {
            return await channel.send({ content: "This is office camera widget. Awaiting first update..." });
        }
    }

    async sendEmbedWithoutImage(message: Message, peopleCount: number, lastPresence: Date | null, lastUpdate: Date) {
        let presence = lastPresence == null ? "-" : `<t:${Math.floor(lastPresence.getTime() / 1000)}:R>`;

        const embed = new EmbedBuilder()
            .setTitle('📷 Latest Office Presence Update')
            .setDescription(`Updated: <t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`)
            .addFields({ name: 'Current People in Office', value: `**${peopleCount}**`, inline: true })
            .addFields({ name: 'Last Presence Detected', value: presence, inline: true })
            .setColor(0x57f287);

        await message.edit({ content: "", embeds: [embed] });
    }

    async sendEmbedWithImage(message: Message, peopleCount: number, lastPresence: Date, imagePath: string, lastUpdate: Date) {
        const embed = new EmbedBuilder()
            .setTitle('📷 Latest Office Presence Update')
            .setDescription(`Updated: <t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`)
            .addFields({ name: 'Current People in Office', value: `**${peopleCount}**`, inline: true })
            .addFields({ name: 'Last Presence Detected', value: `<t:${Math.floor(lastPresence.getTime() / 1000)}:R>`, inline: true })
            .setImage('attachment://camera.jpg')
            .setColor(0x57f287);

        await message.edit({ content: "", embeds: [embed], files: [{ attachment: imagePath, name: 'camera.jpg' }], });
    }

    async updateStatusMessages(peopleCount: number, lastUpdate: Date, image: string | null = null) {
        const snapshots = await this.database.officeStatusSnapshot.findMany();

        if (snapshots.length === 0) return;

        for (const snapshot of snapshots) {
            try {
                const channel = await this.client.channels.fetch(snapshot.channelId);
                if (!channel || !channel.isTextBased()) continue;

                const message = await this.getOrCreateMessage(channel as TextChannel, snapshot.messageId);

                // Determine last presence
                let lastPresence = snapshot.lastPresenceDetectedAt;
                if (peopleCount > 0) {
                    lastPresence = lastUpdate;
                }

                // Update Database
                await this.database.officeStatusSnapshot.update({
                    where: { id: snapshot.id },
                    data: {
                        messageId: message.id,
                        currentPersonCount: peopleCount,
                        lastMessageUpdatedAt: lastUpdate,
                        lastPresenceDetectedAt: lastPresence,
                        imagePath: image ?? snapshot.imagePath,
                    },
                });

                const finalImagePath = image ?? snapshot.imagePath;

                if (finalImagePath) {
                    await this.sendEmbedWithImage(
                        message,
                        peopleCount,
                        lastPresence ? new Date(lastPresence) : lastUpdate, // Safe fallback
                        finalImagePath,
                        lastUpdate
                    );
                } else {
                    await this.sendEmbedWithoutImage(
                        message,
                        peopleCount,
                        lastPresence ? new Date(lastPresence) : null,
                        lastUpdate
                    );
                }

            } catch (err) {
                this.logger.error(`Failed to update message ${snapshot.messageId}`, err);
            }
        }
    }

    async addChannelToUpdateList(channelId: string) {
        // Check if exists
        const existing = await this.database.officeStatusSnapshot.findFirst({
            where: { channelId },
        });

        if (existing) {
            throw new Error('This channel already has a camera widget');
        }

        const channel = await this.client.channels.fetch(channelId);

        if (!channel || !channel.isTextBased()) throw new Error('Channel does not exist or is not text based');

        const message = await (channel as TextChannel).send({ content: "This is office camera widget. Awaiting first update..." });

        await this.database.officeStatusSnapshot.create({
            data: {
                channelId,
                messageId: message.id,
            },
        });
    }

    async removeChannelFromUpdateList(channelId: string) {
        const snapshot = await this.database.officeStatusSnapshot.findFirst({
            where: { channelId },
        });

        if (!snapshot) throw new Error("This channel doesn't have a camera widget");

        const channel = await this.client.channels.fetch(channelId);

        if (channel && channel.isTextBased()) {
            try {
                const message = await (channel as TextChannel).messages.fetch(snapshot.messageId);
                if (message) await message.delete();
            } catch (e) {
                this.logger.warn(`Could not delete message for removed widget: ${e.message}`);
            }
        }

        await this.database.officeStatusSnapshot.delete({
            where: { id: snapshot.id },
        });
    }

    async toggleDowntimeAlert(userId: string): Promise<boolean> {
        const alert = await this.database.cameraDowntimeAlert.findFirst({
            where: { discordUserId: userId },
        });

        if (alert) {
            await this.database.cameraDowntimeAlert.delete({
                where: { id: alert.id },
            });
            return false; // Unsubscribed
        } else {
            await this.database.cameraDowntimeAlert.create({
                data: { discordUserId: userId },
            });
            return true; // Subscribed
        }
    }
}
