import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

export interface ActivityStatsResult {
  sum: number;
  avg: number;
  max: number;
  periodDescription: string;
  daysDiff: number | null;
}

@Injectable()
export class ActivityService {
  constructor(private readonly database: DatabaseService) { }

  private parseDate(dateString: string): Date | null {
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateString.match(dateRegex);

    if (!match) {
      return null;
    }

    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (isNaN(date.getTime())) {
      return null;
    }

    if (
      date.getFullYear() !== parseInt(year) ||
      date.getMonth() !== parseInt(month) - 1 ||
      date.getDate() !== parseInt(day)
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  async getUserActivityStats(discordUserId: string, startDateStr?: string, endDateStr?: string): Promise<ActivityStatsResult> {
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (startDateStr) {
      startDate = this.parseDate(startDateStr);
      if (!startDate) {
        throw new Error(`Invalid start date format: ${startDateStr}. Please use YYYY-MM-DD.`);
      }
    }

    if (endDateStr) {
      endDate = this.parseDate(endDateStr);
      if (!endDate) {
        throw new Error(`Invalid end date format: ${endDateStr}. Please use YYYY-MM-DD.`);
      }
      // Set to end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate && endDate && startDate > endDate) {
      throw new Error(`Start date (${startDateStr}) must be before or equal to end date (${endDateStr || 'today'}).`);
    }

    const whereClause: any = {
      member: {
        discordId: discordUserId,
      },
    };

    if (startDate) {
      whereClause.date = { ...whereClause.date, gte: startDate };
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date, lte: endDate };
    }

    const result = await this.database.discordActivity.aggregate({
      where: whereClause,
      _sum: { messageCount: true },
      _avg: { messageCount: true },
      _max: { messageCount: true },
    });

    let periodDesc = 'all time';
    if (startDate && endDateStr) {
      periodDesc = `${startDateStr} to ${endDateStr}`;
    } else if (startDate) {
      periodDesc = `since ${startDateStr}`;
    } else if (endDateStr) {
      periodDesc = `up to ${endDateStr}`;
    }

    const daysDiff = startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      sum: result._sum.messageCount || 0,
      avg: result._avg.messageCount || 0,
      max: result._max.messageCount || 0,
      periodDescription: periodDesc,
      daysDiff,
    };
  }
}

