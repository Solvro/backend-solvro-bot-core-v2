import { Module } from '@nestjs/common';
import { OfficeCameraService } from './office-camera.service';
import { OfficeCameraController } from './office-camera.controller';
import { OfficeCameraCommands } from './office-camera.commands';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [OfficeCameraController],
  providers: [OfficeCameraService, OfficeCameraCommands],
})
export class OfficeCameraModule {}
