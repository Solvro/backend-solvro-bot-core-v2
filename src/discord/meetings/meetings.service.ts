import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class MeetingsService {
    constructor(private database: DatabaseService, private configService: ConfigService) { }

    private async startTranscriber(channelId: string, meetingId: string, meetingName: string) {
        // send request to transcriber service to start recording
        const transcriberUrl = this.configService.get<string>('TRANSCRIBER_URL');
        const response = await fetch(`${transcriberUrl}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channelId,
                meetingId,
                meetingName,
            }),
        });

        return response.ok;
    }

    private async stopTranscriber() {
        // send request to transcriber service to stop recording
        const transcriberUrl = this.configService.get<string>('TRANSCRIBER_URL');
        const response = await fetch(`${transcriberUrl}/stop`, {
            method: 'POST',
        });
        return response.ok;
    }

    async createMeeting(name: string, channelId: string) {

    }
}
