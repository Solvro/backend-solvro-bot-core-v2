import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as necord from 'necord';
import { MessageFlags, AttachmentBuilder } from 'discord.js';

import { GoogleCalendarService } from '../../google/google-calendar.service';
import { type CalendarEvent } from '../../google/types/google-calendar.types';
import { CalendarNewDTO } from './dto/calendar-new.dto';
import { AvailabilityDTO } from './dto/availability.dto';
import { PrinterReserveDTO } from './dto/printer-reserve.dto';

@Injectable()
export class CalendarCommands {
  private readonly logger = new Logger(CalendarCommands.name);

  constructor(
    private calendarService: GoogleCalendarService,
    private configService: ConfigService,
  ) {}

  /*
   *  General Google Calendar commands
   */

  @necord.SlashCommand({
    name: 'calendar_link',
    description: 'Get the link to KN Solvro Google Calendar',
  })
  public async onCalendarLink(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const calendarId = this.configService.get<string>('GOOGLE_CALENDAR_ID');

    if (!calendarId) {
      await interaction.editReply({
        content: '❌ Calendar ID is not configured.',
      });
      return;
    }

    const calendarUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`;

    await interaction.editReply({
      content: `📅 **KN Solvro Calendar**\n\n🔗 [Open Calendar](${calendarUrl})`,
    });
  }

  @necord.SlashCommand({
    name: 'calendar_new',
    description: 'Create a new calendar event',
  })
  public async onCalendarNew(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: CalendarNewDTO,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const INDEX_LENGTH = 6;

    try {
      const title = options.title;
      const date = options.date;
      const startTime = options.startTime;
      const endTime = options.endTime;
      const description = options.description ?? '';
      const location = options.location;
      const attendeesInput = options.attendees ?? '';

      const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
      if (!dateRegex.test(date)) {
        await interaction.editReply({
          content:
            '❌ Invalid date format. Please use `DD.MM.YYYY` (e.g., `15.01.2025`)',
        });
        return;
      }

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        await interaction.editReply({
          content:
            '❌ Invalid time format. Please use `HH:MM` in 24-hour format (e.g., `14:30`)',
        });
        return;
      }

      const attendees: Array<{ email: string }> = attendeesInput
        ? attendeesInput
            .split(',')
            .map((attendee) => attendee.trim())
            .filter(
              (attendee) =>
                attendee.length === INDEX_LENGTH || attendee.includes('@'),
            )
            .map((attendee) => ({
              email: attendee.includes('@')
                ? attendee
                : `${attendee}@student.pwr.edu.pl`,
            }))
        : [];

      let locationText: string;
      switch (location) {
        case 'discord':
          locationText = 'Discord';
          break;
        case 'office':
          locationText = 'Biuro';
          break;
        case 'other':
          locationText = '';
          break;
        default:
          locationText = '';
      }

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      let endDate = date;
      if (endMinutes < startMinutes) {
        const [day, month, year] = date.split('.').map(Number);
        const dateObj = new Date(year, month - 1, day);
        dateObj.setDate(dateObj.getDate() + 1);

        const nextDay = dateObj.getDate().toString().padStart(2, '0');
        const nextMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const nextYear = dateObj.getFullYear();

        endDate = `${nextDay}.${nextMonth}.${nextYear}`;
      }

      if (location === 'office') {
        const eventStartDateTime =
          this.calendarService.formatToRFC3339WithWarsawTime(date, startTime);
        const eventEndDateTime =
          this.calendarService.formatToRFC3339WithWarsawTime(endDate, endTime);

        const eventStartDate = new Date(eventStartDateTime);
        const eventEndDate = new Date(eventEndDateTime);

        const rangeStart = new Date(eventStartDate);
        rangeStart.setDate(rangeStart.getDate() - 1);
        rangeStart.setHours(0, 0, 0, 0);

        const rangeEnd = new Date(eventEndDate);
        rangeEnd.setDate(rangeEnd.getDate() + 1);
        rangeEnd.setHours(23, 59, 59, 999);

        const existingEvents = await this.calendarService.getEventsInRange(
          this.configService.get<string>('GOOGLE_CALENDAR_ID'),
          rangeStart,
          rangeEnd,
        );

        const sameLocationEvents = existingEvents.filter((event) =>
          event.location?.toLowerCase().includes('biuro'),
        );

        const hasConflict = sameLocationEvents.some((event) => {
          const existingStart = new Date(
            event.start?.dateTime || event.start?.date,
          );
          const existingEnd = new Date(event.end?.dateTime || event.end?.date);

          return eventStartDate < existingEnd && eventEndDate > existingStart;
        });

        if (hasConflict) {
          await interaction.editReply({
            content:
              '❌ **Office is already booked during this time!**\n\n' +
              'Please choose a different time slot or check availability with `/office_availability`.',
          });
          return;
        }
      }

      const event: CalendarEvent = {
        summary: title,
        description,
        location: locationText,
        start: {
          dateTime: this.calendarService.formatToRFC3339WithWarsawTime(
            date,
            startTime,
          ),
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: this.calendarService.formatToRFC3339WithWarsawTime(
            endDate,
            endTime,
          ),
          timeZone: 'Europe/Warsaw',
        },
        attendees,
      };

      const createdEvent = await this.calendarService.createEvent(
        event,
        this.configService.get<string>('GOOGLE_CALENDAR_ID'),
      );

      const attendeesText =
        attendees.length > 0
          ? `\n👥 ${attendees.map((a) => a.email).join(', ')}`
          : '';

      const endDateDisplay = endDate !== date ? ` (next day)` : '';

      await interaction.editReply({
        content:
          `✅ **Event created successfully!**\n\n📅 **${title}**\n` +
          `🕒 ${date} ${startTime} - ${endTime}${endDateDisplay}\n` +
          `📝 ${description}\n📍 ${locationText}${attendeesText}\n\n` +
          `🔗 [View in Calendar](${createdEvent.htmlLink})`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error creating calendar event:', error);

      await interaction.editReply({
        content: `❌ Failed to create calendar event: ${errorMessage}`,
      });
    }
  }

  @necord.SlashCommand({
    name: 'office_availability',
    description: 'Check office availability calendar for a selected week',
  })
  public async onOfficeAvailability(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: AvailabilityDTO,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const weekOffset = options.week ?? 0;
      const startHour = options.startHour ?? 0;
      const endHour = options.endHour ?? 24;
      const interval = options.interval ?? 15;

      if (startHour >= endHour) {
        await interaction.editReply({
          content: '❌ Start hour must be before end hour.',
        });
        return;
      }

      const today = new Date();
      const currentDay = today.getDay();
      const daysUntilMonday = currentDay === 0 ? -6 : 1 - currentDay;

      const startDate = new Date(today);
      startDate.setDate(today.getDate() + daysUntilMonday + weekOffset * 7);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const events = await this.calendarService.getEventsInRange(
        this.configService.get<string>('GOOGLE_CALENDAR_ID'),
        startDate,
        endDate,
      );

      const officeEvents = events.filter(
        (event) =>
          event.location?.toLowerCase().includes('biuro') ||
          event.location?.toLowerCase().includes('office'),
      );

      const imageBuffer = this.calendarService.generateCalendarImage(
        startDate,
        officeEvents,
        {
          workStartHour: startHour,
          workEndHour: endHour,
          intervalMinutes: interval,
        },
      );

      const weekLabel =
        weekOffset === 0
          ? 'This Week'
          : weekOffset === 1
            ? 'Next Week'
            : `Week +${weekOffset}`;

      const attachment = new AttachmentBuilder(imageBuffer, {
        name: 'office-availability.png',
      });

      await interaction.editReply({
        content: `📅 **Office Availability - ${weekLabel}**\n⏰ Time fraction: \`${startHour}:00 - ${endHour}:00\` (${interval}min intervals)`,
        files: [attachment],
      });
    } catch (error: any) {
      console.error('Error checking office availability:', error);

      if (
        error.message?.includes('invalid_grant') ||
        error.message?.includes('unauthorized')
      ) {
        await interaction.editReply({
          content:
            '❌ Google Calendar authentication failed. Please contact an administrator to re-authorize the bot.',
        });
      } else {
        await interaction.editReply({
          content: `❌ Failed to check office availability: ${error.message}`,
        });
      }
    }
  }

  /*
   *  Printer commands
   */

  @necord.SlashCommand({
    name: 'printer_reserve',
    description:
      'Reserves printer in the office for a specified time slot and creates a calendar event',
  })
  public async onPrinterReserve(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: PrinterReserveDTO,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const INDEX_LENGTH = 6;

    try {
      const whoInput = options.who;
      const object = options.object ?? 'Unknown object';
      const startDateInput = options.startDate;
      const endDateInput = options.endDate;

      const index = whoInput.includes('@') ? whoInput.split('@')[0] : whoInput;
      if (index.length !== INDEX_LENGTH || Number.isNaN(Number(index))) {
        await interaction.editReply({
          content:
            '❌ Invalid input for `who`. Please provide a valid index number or email.',
        });
        return;
      }

      // TODO: check if date and time is valid
      const dateTimeRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
      if (
        !dateTimeRegex.test(startDateInput) ||
        !dateTimeRegex.test(endDateInput)
      ) {
        await interaction.editReply({
          content:
            '❌ Invalid date format. Please use `DD.MM.YYYY HH:MM` in 24-hour format (e.g., `25.12.2024 14:30`)',
        });
        return;
      }

      const eventStartDateTime =
        this.calendarService.formatToRFC3339WithWarsawTime(
          startDateInput.split(' ')[0],
          startDateInput.split(' ')[1],
        );

      const eventEndDateTime =
        this.calendarService.formatToRFC3339WithWarsawTime(
          endDateInput.split(' ')[0],
          endDateInput.split(' ')[1],
        );

      const eventStartDate = new Date(eventStartDateTime);
      const eventEndDate = new Date(eventEndDateTime);

      const rangeStart = new Date(eventStartDate);
      rangeStart.setDate(rangeStart.getDate() - 1);
      rangeStart.setHours(0, 0, 0, 0);

      const rangeEnd = new Date(eventEndDate);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setHours(23, 59, 59, 999);

      const existingEvents = await this.calendarService.getEventsInRange(
        this.configService.get<string>('GOOGLE_CALENDAR_ID'),
        rangeStart,
        rangeEnd,
      );

      const locationKeyword = 'drukarka';
      const sameLocationEvents = existingEvents.filter((event) =>
        event.location?.toLowerCase().includes(locationKeyword),
      );

      const hasConflict = sameLocationEvents.some((event) => {
        const existingStart = new Date(
          event.start?.dateTime || event.start?.date,
        );
        const existingEnd = new Date(event.end?.dateTime || event.end?.date);

        return eventStartDate < existingEnd && eventEndDate > existingStart;
      });

      if (hasConflict) {
        await interaction.editReply({
          content: `❌ **Priner is being used during this time!**\n\nPlease choose a different time slot or check availability with \`/printer_availability\`.`,
        });
        return;
      }

      const summary = `Rezerwacja drukarki - ${object}`;
      const description = `Zajęta przez ${whoInput}`;
      const location = 'Drukarka';

      const event: CalendarEvent = {
        summary,
        description,
        location,
        start: {
          dateTime: eventStartDateTime,
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: eventEndDateTime,
          timeZone: 'Europe/Warsaw',
        },
        attendees: [{ email: `${index}@student.pwr.edu.pl` }],
      };

      const createdEvent = await this.calendarService.createEvent(
        event,
        this.configService.get<string>('GOOGLE_CALENDAR_ID'),
      );

      await interaction.editReply({
        content: `✅ **Event created successfully!**\n\n📅 **${summary}**\n🕒 ${startDateInput} - ${endDateInput}\n📝 ${description}\n\n🔗 [View in Calendar](${createdEvent.htmlLink})`,
      });
    } catch (error: any) {
      this.logger.error('Error creating calendar event:', error);

      if (
        error.message?.includes('invalid_grant') ||
        error.message?.includes('unauthorized')
      ) {
        await interaction.editReply({
          content:
            '❌ Google Calendar authentication failed. Please re-authorize the bot.',
        });
      } else {
        await interaction.editReply({
          content: `❌ Failed to create calendar event: ${error.message}`,
        });
      }
    }
  }

  @necord.SlashCommand({
    name: 'printer_availability',
    description: 'Check printer availability calendar for a selected week',
  })
  public async onPrinterAvailability(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options() options: AvailabilityDTO,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const weekOffset = options.week ?? 0;
      const startHour = options.startHour ?? 0;
      const endHour = options.endHour ?? 24;
      const interval = options.interval ?? 15;

      if (startHour >= endHour) {
        await interaction.editReply({
          content: '❌ Start hour must be less than end hour.',
        });
        return;
      }

      const today = new Date();
      const currentDay = today.getDay();
      const daysUntilMonday = currentDay === 0 ? -6 : 1 - currentDay;

      const startDate = new Date(today);
      startDate.setDate(today.getDate() + daysUntilMonday + weekOffset * 7);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const events = await this.calendarService.getEventsInRange(
        this.configService.get<string>('GOOGLE_CALENDAR_ID'),
        startDate,
        endDate,
      );

      const printerEvents = events.filter((event) =>
        event.location?.toLowerCase().includes('drukarka'),
      );

      const imageBuffer = this.calendarService.generateCalendarImage(
        startDate,
        printerEvents,
        {
          workStartHour: startHour,
          workEndHour: endHour,
          intervalMinutes: interval,
        },
      );

      const weekLabel =
        weekOffset === 0
          ? 'This Week'
          : weekOffset === 1
            ? 'Next Week'
            : `Week +${weekOffset}`;

      const attachment = new AttachmentBuilder(imageBuffer, {
        name: 'printer-availability.png',
      });

      await interaction.editReply({
        content: `📅 **Printer Availability - ${weekLabel}**\n⏰ Time fraction: \`${startHour}:00 - ${endHour}:00\` (\`${interval}min\` intervals)`,
        files: [attachment],
      });
    } catch (error: any) {
      console.error('Error checking printer availability:', error);

      if (
        error.message?.includes('invalid_grant') ||
        error.message?.includes('unauthorized')
      ) {
        await interaction.editReply({
          content:
            '❌ Google Calendar authentication failed. Please contact an administrator to re-authorize the bot.',
        });
      } else {
        await interaction.editReply({
          content: `❌ Failed to check printer availability: ${error.message}`,
        });
      }
    }
  }
}
