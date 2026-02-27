import { Injectable, Logger } from '@nestjs/common';

import { google } from 'googleapis';
import { GoogleAuthService } from './google-auth.service';

import { createCanvas } from 'canvas';
import { type CalendarEvent } from './types/google-calendar.types';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly googleAuthService: GoogleAuthService) {}

  private get calendar() {
    return google.calendar({
      version: 'v3',
      auth: this.googleAuthService.getClient(),
    });
  }

  async createEvent(
    event: CalendarEvent,
    calendarId: string = 'primary',
  ): Promise<any> {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error creating calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error}`);
    }
  }

  async getEventsInRange(
    calendarId: string = 'primary',
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items ?? [];
    } catch (error) {
      this.logger.error('Error getting events in range:', error);
      throw new Error(`Failed to get events: ${error}`);
    }
  }

  generateCalendarImage(
    startDate: Date,
    events: any[],
    options: {
      workStartHour?: number;
      workEndHour?: number;
      intervalMinutes?: number;
    } = {},
  ): Buffer {
    const workStartHour = options.workStartHour ?? 0;
    const workEndHour = options.workEndHour ?? 24;
    const intervalMinutes = options.intervalMinutes ?? 15;
    const slotsPerHour = 60 / intervalMinutes;
    const totalSlots = (workEndHour - workStartHour) * slotsPerHour;

    const cellWidth = 60;
    const cellHeight = 100;
    const headerHeight = 180;
    const dayColumnWidth = 400;
    const dayLabelGap = 25;
    const padding = 60;

    const canvasWidth =
      dayColumnWidth + dayLabelGap + totalSlots * cellWidth + padding * 2;
    const canvasHeight = headerHeight + 7 * cellHeight + padding * 2;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const grid: boolean[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: totalSlots }, () => false),
    );

    events.forEach((event) => {
      const eventStart = new Date(
        (event.start?.dateTime || event.start?.date) as string,
      );
      const eventEnd = new Date(
        (event.end?.dateTime || event.end?.date) as string,
      );

      const startDaysDiff = Math.floor(
        (eventStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const endDaysDiff = Math.floor(
        (eventEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const startTime = this.parseRFC3339Time(
        (event.start?.dateTime || event.start?.date) as string,
      );
      const endTime = this.parseRFC3339Time(
        (event.end?.dateTime || event.end?.date) as string,
      );

      if (!startTime || !endTime) return;

      const workStartMinutes = workStartHour * 60;
      const workEndMinutes = workEndHour * 60;

      if (startDaysDiff === endDaysDiff) {
        if (startDaysDiff < 0 || startDaysDiff > 6) return;

        const startMinutes = startTime.hours * 60 + startTime.minutes;
        const endMinutes = endTime.hours * 60 + endTime.minutes;

        for (
          let minutes = startMinutes;
          minutes < endMinutes;
          minutes += intervalMinutes
        ) {
          if (minutes >= workStartMinutes && minutes < workEndMinutes) {
            const slotIndex = Math.floor(
              (minutes - workStartMinutes) / intervalMinutes,
            );
            if (slotIndex >= 0 && slotIndex < totalSlots) {
              grid[startDaysDiff][slotIndex] = true;
            }
          }
        }
      } else {
        if (startDaysDiff >= 0 && startDaysDiff <= 6) {
          const startMinutes = startTime.hours * 60 + startTime.minutes;
          for (
            let minutes = startMinutes;
            minutes < workEndMinutes;
            minutes += intervalMinutes
          ) {
            if (minutes >= workStartMinutes && minutes < workEndMinutes) {
              const slotIndex = Math.floor(
                (minutes - workStartMinutes) / intervalMinutes,
              );
              if (slotIndex >= 0 && slotIndex < totalSlots) {
                grid[startDaysDiff][slotIndex] = true;
              }
            }
          }
        }

        if (endDaysDiff >= 0 && endDaysDiff <= 6) {
          const endMinutes = endTime.hours * 60 + endTime.minutes;
          for (
            let minutes = workStartMinutes;
            minutes < endMinutes;
            minutes += intervalMinutes
          ) {
            if (minutes >= workStartMinutes && minutes < workEndMinutes) {
              const slotIndex = Math.floor(
                (minutes - workStartMinutes) / intervalMinutes,
              );
              if (slotIndex >= 0 && slotIndex < totalSlots) {
                grid[endDaysDiff][slotIndex] = true;
              }
            }
          }
        }

        for (let day = startDaysDiff + 1; day < endDaysDiff; day++) {
          if (day >= 0 && day <= 6) {
            for (let slot = 0; slot < totalSlots; slot++) {
              grid[day][slot] = true;
            }
          }
        }
      }
    });

    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const dates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      dates.push(`${day}.${month}`);
    }

    ctx.font = '48px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let slot = 0; slot < totalSlots; slot++) {
      const totalMinutes = workStartHour * 60 + slot * intervalMinutes;
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;

      const x =
        padding +
        dayColumnWidth +
        dayLabelGap +
        slot * cellWidth +
        cellWidth / 2;

      if (minute === 0) {
        ctx.fillText(hour.toString(), x, padding + 40);
      }
    }

    for (let day = 0; day < 7; day++) {
      const y = padding + headerHeight + day * cellHeight;

      ctx.font = '40px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        dates[day] + ' ' + days[day],
        padding + 20,
        y + cellHeight / 2,
      );

      for (let slot = 0; slot < totalSlots; slot++) {
        const x = padding + dayColumnWidth + dayLabelGap + slot * cellWidth;
        const isBusy = grid[day][slot];

        ctx.fillStyle = isBusy ? '#ed4245' : '#3ba55d';
        ctx.fillRect(x, y, cellWidth - 2, cellHeight - 3);

        ctx.strokeStyle = '#40444b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth - 2, cellHeight - 3);
      }
    }

    ctx.strokeStyle = '#1e1f22';
    ctx.lineWidth = 4;
    for (let hour = workStartHour; hour <= workEndHour; hour++) {
      const slotIndex = (hour - workStartHour) * slotsPerHour;
      const x = padding + dayColumnWidth + dayLabelGap + slotIndex * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding + headerHeight);
      ctx.lineTo(x, padding + headerHeight + 7 * cellHeight);
      ctx.stroke();
    }

    ctx.strokeStyle = '#1e1f22';
    ctx.lineWidth = 3;
    for (let day = 0; day <= 7; day++) {
      const y = padding + headerHeight + day * cellHeight;
      ctx.beginPath();
      ctx.moveTo(padding + dayColumnWidth + dayLabelGap, y);
      ctx.lineTo(
        padding + dayColumnWidth + dayLabelGap + totalSlots * cellWidth,
        y,
      );
      ctx.stroke();
    }

    return canvas.toBuffer('image/png');
  }

  /*
   *  Utilities / Helpers
   */

  // Helper function to parse time from RFC3339 format
  parseRFC3339Time(
    dateTimeStr: string,
  ): { hours: number; minutes: number } | null {
    const match = dateTimeStr.match(/T(\d{2}):(\d{2})/);
    if (!match) return null;

    return {
      hours: Number.parseInt(match[1]),
      minutes: Number.parseInt(match[2]),
    };
  }

  // Helper function to convert date and time to RFC3339 format with Warsaw timezone
  formatToRFC3339WithWarsawTime(date: string, time: string): string {
    const [day, month, year] = date.split('.');
    const isWinterTime = this.isWinterTime(new Date(`${year}-${month}-${day}`));
    const offset = isWinterTime ? '+01:00' : '+02:00';

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00${offset}`;
  }

  // Helper function to determine if a date is in winter time (CET) or summer time (CEST) for Warsaw
  private isWinterTime(date: Date): boolean {
    const month = date.getMonth() + 1;
    return month < 3 || month > 10;
  }
}
