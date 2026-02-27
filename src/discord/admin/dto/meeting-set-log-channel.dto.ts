import { ChannelOption } from 'necord';
import { TextChannel } from 'discord.js';

export class MeetingSetLogChannelDto {
  @ChannelOption({
    name: 'channel',
    description: 'The channel where meeting logs will be sent',
    required: false,
  })
  channel?: TextChannel;
}
