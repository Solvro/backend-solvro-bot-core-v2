import { IsNumber, IsString } from 'class-validator';

export class UpdateMeetingDTO {
    @IsString()
    text: string;

    @IsString()
    task: string;

    @IsString()
    language: string;

    @IsNumber()
    duration: number;

    segments: SegmentDTO[];
}

export class SegmentDTO {
    @IsNumber()
    id: number;

    @IsNumber()
    seek: number;

    @IsNumber()
    start: number;

    @IsNumber()
    end: number;

    @IsString()
    text: string;

    @IsNumber({}, { each: true })
    tokens: number[];

    @IsNumber()
    temperature: number

    @IsNumber()
    avg_logprob: number

    @IsNumber()
    compression_ratio: number

    @IsNumber()
    no_speech_prob: number

    @IsString()
    userId: string
}