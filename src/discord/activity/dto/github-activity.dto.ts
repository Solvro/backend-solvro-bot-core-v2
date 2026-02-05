import { StringOption, UserOption } from 'necord';
import { User } from 'discord.js';

export class GithubActivityDto {
  @UserOption({
    name: 'user',
    description: 'User to check activity for',
    required: true,
  })
  user: User;

  @StringOption({
    name: 'start_date',
    description: 'Start date (YYYY-MM-DD)',
    required: false,
  })
  startDate?: string;

  @StringOption({
    name: 'end_date',
    description: 'End date (YYYY-MM-DD)',
    required: false,
  })
  endDate?: string;
}
