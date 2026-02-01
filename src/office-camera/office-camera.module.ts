import { Module } from '@nestjs/common';
import { OfficeCameraService } from './office-camera.service';
import { OfficeCameraController } from './office-camera.controller';
import { OfficeCameraCommands } from './office-camera.commands';

@Module({
  controllers: [OfficeCameraController],
  providers: [OfficeCameraService, OfficeCameraCommands],
})
export class OfficeCameraModule {}
