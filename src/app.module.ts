import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi, { allow } from 'joi';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { RecordingsModule } from './core/recordings/recordings.module';
import { DatabaseModule } from './database/database.module';
import { MeetingsModule } from './discord/meetings/meetings.module';
import { GoogleModule } from './google/google.module';
import { FilesModule } from './files/files.module';
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            validationSchema: Joi.object({
                NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
                DATABASE_URL: Joi.string().uri().required(),
                PORT: Joi.number().default(3000),
                DISCORD_TOKEN: Joi.string().required(),
                DISCORD_GUILD_ID: Joi.string().required(),
                GOOGLE_CLIENT_ID: Joi.string().required(),
                GOOGLE_CLIENT_SECRET: Joi.string().required(),
                GOOGLE_REDIRECT_URI: Joi.string().required(),
                GOOGLE_REFRESH_TOKEN: Joi.string().allow('', null),
                GOOGLE_DRIVE_FOLDER_ID: Joi.string().required(),
                TRANSCRIBER_URL: Joi.string().uri().required(),
            }),
        }),
        NecordModule.forRootAsync({
            useFactory: (configService) => ({
                token: configService.get('DISCORD_TOKEN'),
                intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildVoiceStates],
                development: [configService.get('DISCORD_GUILD_ID')]
            }),
            inject: [ConfigService],
        }),
        DatabaseModule,
        RecordingsModule,
        MeetingsModule,
        GoogleModule,
        FilesModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
