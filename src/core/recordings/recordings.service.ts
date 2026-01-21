import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { RecordingState } from 'generated/prisma/enums';
import { DatabaseService } from 'src/database/database.service';
import { MeetingSummaryDTO } from './dto/meeting-summary.dto';
import { UpdateMeetingDTO } from './dto/update-meeting.dto';

@Injectable()
export class RecordingsService {
  constructor(private database: DatabaseService) { }

  async updateMeeting(id: number, updateMeetingDTO: UpdateMeetingDTO) {
    const existingMeeting = await this.database.meeting.findUnique({ where: { id: +id } });

    if (!existingMeeting) throw new NotFoundException('Meeting not found');

    return this.database.meeting.update({
      where: { id: id },
      data: {
        fullTranscription: updateMeetingDTO.text,
        recordingStatus: RecordingState.Processed,
        finishedAt: new Date(),
        transcriptionChunks: {
          create: [
            ...updateMeetingDTO.segments.map(chunk => ({
              speakerDiscordId: chunk.userId,
              startTime: chunk.start,
              duration: chunk.end - chunk.start,
              text: chunk.text
            }))
          ]
        }
      }
    });
  }

  async saveSummary(meetingId: number, meetingSummaryDTO: MeetingSummaryDTO) {
    const existingMeeting = await this.database.meeting.findUnique({ where: { id: +meetingId } });

    if (!existingMeeting) throw new NotFoundException('Meeting not found');

    // TODO: implement GoogleDriveService to save the summary there

    return this.database.meeting.update({
      where: { id: meetingId },
      data: {
        summary: meetingSummaryDTO.summary,
      }
    });
  }
}
