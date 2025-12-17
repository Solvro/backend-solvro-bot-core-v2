import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleAuthService } from './google-auth.service';
import { GoogleDriveService } from './google-drive.service';
import { GoogleController } from './google.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GoogleController],
  providers: [
    GoogleAuthService,
    GoogleDriveService
  ],
  exports: [
    GoogleAuthService,
    GoogleDriveService,
  ],
})
export class GoogleModule {}
