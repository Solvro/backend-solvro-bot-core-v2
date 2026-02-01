import { IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInPast } from '../../common/validators/is-in-past';

export class UpdateCameraDto {
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    count: number;

    @IsDateString()
    @IsInPast()
    timestamp: string;
}
