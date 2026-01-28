import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GithubActivityType } from 'generated/prisma/enums';

export interface ActivityStatsResult {
  sum: number;
  avg: number;
  max: number;
  periodDescription: string;
  daysDiff: number | null;
}

export interface GithubActivityStatsResult {
  type: GithubActivityType;
  count: number;
}


export interface ChannelActivityResult {
  channelId: string;
  messageCount: number;
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

  private getValidatedDateRange(startDateStr?: string, endDateStr?: string): { startDate: Date | null, endDate: Date | null, periodDescription: string } {
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
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate && endDate && startDate > endDate) {
      throw new Error(`Start date (${startDateStr}) must be before or equal to end date (${endDateStr || 'today'}).`);
    }

    let periodDescription = 'all time';
    if (startDate && endDateStr) {
      periodDescription = `${startDateStr} to ${endDateStr}`;
    } else if (startDate) {
      periodDescription = `since ${startDateStr}`;
    } else if (endDateStr) {
      periodDescription = `up to ${endDateStr}`;
    }

    return { startDate, endDate, periodDescription };
  }

  async getUserActivityStats(discordUserId: string, startDateStr?: string, endDateStr?: string): Promise<ActivityStatsResult> {
    const { startDate, endDate, periodDescription } = this.getValidatedDateRange(startDateStr, endDateStr);

    const whereClause: any = {
      member: {
        discordId: discordUserId,
      },
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = startDate;
      }
      if (endDate) {
        whereClause.date.lte = endDate;
      }
    }

    const result = await this.database.discordActivity.aggregate({
      where: whereClause,
      _sum: { messageCount: true },
      _avg: { messageCount: true },
      _max: { messageCount: true },
    });

    const daysDiff = startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      sum: result._sum.messageCount || 0,
      avg: result._avg.messageCount || 0,
      max: result._max.messageCount || 0,
      periodDescription,
      daysDiff,
    };
  }

  async getGithubActivityStats(discordUserId: string, startDateStr?: string, endDateStr?: string): Promise<{ stats: GithubActivityStatsResult[], periodDescription: string, memberName: string }> {
    const member = await this.database.member.findUnique({
      where: { discordId: discordUserId },
    });

    if (!member || !member.githubId) {
      throw new Error('User not found in the database or has no GitHub ID linked.');
    }

    const { startDate, endDate, periodDescription } = this.getValidatedDateRange(startDateStr, endDateStr);

    const whereClause: any = {
      githubId: member.githubId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = startDate;
      }
      if (endDate) {
        whereClause.date.lte = endDate;
      }
    }

    const activity = await this.database.githubActivity.groupBy({
      by: ['type'],
      where: whereClause,
      _count: {
        githubId: true,
      },
    });

    const stats = activity.map(a => ({
      type: a.type,
      count: a._count.githubId
    }));

    return {
      stats,
      periodDescription,
      memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.discordId,
    };
  }

  async getChannelActivityStats(interval?: 'week' | 'month' | '6months'): Promise<{ channels: ChannelActivityResult[], periodDescription: string }> {
    let since: Date | undefined;
    const now = new Date();
    let periodDesc = 'all time';

    if (interval) {
      since = new Date(now);
      switch (interval) {
        case 'week':
          since.setDate(now.getDate() - 7);
          periodDesc = 'last week';
          break;
        case 'month':
          since.setMonth(now.getMonth() - 1);
          periodDesc = 'last month';
          break;
        case '6months':
          since.setMonth(now.getMonth() - 6);
          periodDesc = 'last 6 months';
          break;
      }
    }

    const whereClause: any = {};
    if (since) {
      whereClause.date = { gte: since };
    }

    const result = await this.database.channelActivity.groupBy({
      by: ['channelId'],
      where: whereClause,
      _sum: {
        messageCount: true,
      },
      orderBy: {
        _sum: {
          messageCount: 'desc',
        },
      },
      take: 10,
    });

    const channels = result.map(r => ({
      channelId: r.channelId,
      messageCount: r._sum.messageCount || 0,
    }));

    return {
      channels,
      periodDescription: periodDesc,
    };
  }
}


