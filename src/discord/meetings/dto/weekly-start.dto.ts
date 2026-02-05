import { ChannelType, VoiceChannel } from 'discord.js';
import { ChannelOption, StringOption } from 'necord';

export class WeeklyStartDTO {
  @StringOption({
    name: 'meeting_name',
    description: 'Name of the meeting',
    required: true,
  })
  name: string;

  @ChannelOption({
    name: 'channel',
    description: 'Voice channel to monitor',
    required: true,
    channel_types: [ChannelType.GuildVoice],
  })
  channelId: VoiceChannel;
}
