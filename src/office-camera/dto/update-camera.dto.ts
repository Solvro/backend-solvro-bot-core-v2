import { IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCameraDto {
    @IsNumber()
    @Type(() => Number)
    count: number;

    @IsDateString()
    timestamp: string;
}
