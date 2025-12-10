import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { UpdateMeetingDTO } from './dto/update-meeting.dto';
import { MeetingSummaryDTO } from './dto/meeting-summary.dto';

@Controller('recordings')
export class RecordingsController {
    constructor(private readonly recordingsService: RecordingsService) { }

    @Patch(':id')
    updateMeeting(@Param('id') id: number, @Body() updateMeetingDTO: UpdateMeetingDTO) {
        return this.recordingsService.updateMeeting(id, updateMeetingDTO);
    }

    @Post(':id/summary')
    saveSummary(@Param('id') id: number, @Body() meetingSummaryDTO: MeetingSummaryDTO) {
        return this.recordingsService.saveSummary(id, meetingSummaryDTO);
    }
}
