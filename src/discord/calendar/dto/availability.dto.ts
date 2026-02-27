import { IntegerOption } from 'necord';

export class AvailabilityDTO {
  @IntegerOption({
    name: 'week',
    description: 'Which week to display (0 = this week, 1 = next week, etc.)',
    required: false,
    min_value: 0,
    max_value: 52,
  })
  week?: number;

  @IntegerOption({
    name: 'start-hour',
    description: 'Start hour (0-23, default: 0)',
    required: false,
    min_value: 0,
    max_value: 23,
  })
  startHour?: number;

  @IntegerOption({
    name: 'end-hour',
    description: 'End hour (1-24, default: 24)',
    required: false,
    min_value: 1,
    max_value: 24,
  })
  endHour?: number;

  @IntegerOption({
    name: 'interval',
    description: 'Time slot interval in minutes (default: 15)',
    required: false,
    choices: [
      { name: '15 minutes', value: 15 },
      { name: '30 minutes', value: 30 },
      { name: '60 minutes', value: 60 },
    ],
  })
  interval?: number;
}
