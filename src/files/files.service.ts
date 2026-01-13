import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class FilesService {
    constructor(private database: DatabaseService) { }

    public async generateAttendenceFile(meetingId: number): Promise<Buffer> {
    }
}
