import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { UpdateMeetingDTO } from './dto/update-meeting.dto';
import { MeetingSummaryDTO } from './dto/meeting-summary.dto';
import { FindOneParams } from 'src/common/validators/find-one-param';

@Controller('recordings')
export class RecordingsController {
    constructor(private readonly recordingsService: RecordingsService) { }

    @Patch(':id')
    updateMeeting(@Param() params: FindOneParams, @Body() updateMeetingDTO: UpdateMeetingDTO) {
        return this.recordingsService.updateMeeting(+params.id, updateMeetingDTO);
    }

    @Post(':id/summary')
    saveSummary(@Param() params: FindOneParams, @Body() meetingSummaryDTO: MeetingSummaryDTO) {
        return this.recordingsService.saveSummary(+params.id, meetingSummaryDTO);
    }
}
