import { IsString } from 'class-validator';

export class MeetingSummaryDTO {
  @IsString()
  summary: string;
}
