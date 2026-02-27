import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleAuthService } from './google-auth.service';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleDriveService } from './google-drive.service';
import { GoogleController } from './google.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GoogleController],
  providers: [GoogleAuthService, GoogleDriveService, GoogleCalendarService],
  exports: [GoogleAuthService, GoogleDriveService, GoogleCalendarService],
})
export class GoogleModule {}
