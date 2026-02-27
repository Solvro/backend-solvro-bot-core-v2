import { StringOption } from 'necord';

export class PrinterReserveDTO {
  @StringOption({
    name: 'who',
    description: 'Who will use the printer? (email or index number)',
    required: true,
  })
  who: string;

  @StringOption({
    name: 'start-date',
    description: 'Start date (DD.MM.YYYY HH:MM, 24-hour format)',
    required: true,
  })
  startDate: string;

  @StringOption({
    name: 'end-date',
    description: 'End date (DD.MM.YYYY HH:MM, 24-hour format)',
    required: true,
  })
  endDate: string;

  @StringOption({
    name: 'object',
    description: 'Object to print',
    required: false,
  })
  object?: string;
}
