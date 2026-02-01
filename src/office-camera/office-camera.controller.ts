import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { OfficeCameraService } from './office-camera.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Controller('office-camera')
export class OfficeCameraController {
  constructor(
    private readonly officeCameraService: OfficeCameraService,
    private readonly configService: ConfigService
  ) { }

  @Post('/update')
  @UseInterceptors(FileInterceptor('file'))
  async update(@Body() body: UpdateCameraDto, @UploadedFile() file: Express.Multer.File) {
    const { count, timestamp } = body;
    const date = new Date(timestamp);
    let fullImagePath: string | null = null;

    if (file) {
      const imageDir = this.configService.get<string>('OFFICE_CAMERA_IMAGE_PATH', './uploads/office-camera');
      const imageName = 'latest.jpg';

      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      fullImagePath = path.join(imageDir, imageName);
      fs.writeFileSync(fullImagePath, file.buffer);
    }

    await this.officeCameraService.updateStatusMessages(Number(count), date, fullImagePath);
    return { status: 'ok' };
  }
}
