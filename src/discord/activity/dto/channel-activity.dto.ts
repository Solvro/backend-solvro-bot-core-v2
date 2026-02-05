import { StringOption } from 'necord';

export class ChannelActivityDto {
  @StringOption({
    name: 'interval',
    description: 'Time interval: week / month / 6months',
    required: false,
    choices: [
      { name: 'Week', value: 'week' },
      { name: 'Month', value: 'month' },
      { name: '6 Months', value: '6months' },
    ],
  })
  interval?: 'week' | 'month' | '6months';
}
