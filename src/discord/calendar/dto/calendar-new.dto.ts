import { StringOption } from 'necord';

export class CalendarNewDTO {
  @StringOption({
    name: 'title',
    description: 'Event title',
    required: true,
  })
  title: string;

  @StringOption({
    name: 'date',
    description: 'Event date (DD.MM.YYYY)',
    required: true,
  })
  date: string;

  @StringOption({
    name: 'start-time',
    description: 'Event start time (HH:MM, 24h format)',
    required: true,
  })
  startTime: string;

  @StringOption({
    name: 'end-time',
    description: 'Event end time (HH:MM, 24h format)',
    required: true,
  })
  endTime: string;

  @StringOption({
    name: 'location',
    description: 'Event location',
    required: true,
    choices: [
      { name: 'Discord', value: 'discord' },
      { name: 'Office', value: 'office' },
      { name: 'Other', value: 'other' },
    ],
  })
  location: string;

  @StringOption({
    name: 'description',
    description: 'Event description',
    required: false,
  })
  description?: string;

  @StringOption({
    name: 'attendees',
    description: 'Attendees (comma-separated index numbers or emails)',
    required: false,
  })
  attendees?: string;
}
