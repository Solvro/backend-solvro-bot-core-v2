import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { GuildConfigModule } from './config/guild-config/guild-config.module';
import { GithubModule } from './core/github/github.module';
import { RecordingsModule } from './core/recordings/recordings.module';
import { DatabaseModule } from './database/database.module';
import { ActivityModule } from './discord/activity/activity.module';
import { AdminModule } from './discord/admin/admin.module';
import { CalendarModule } from './discord/calendar/calendar.module';
import { MeetingsModule } from './discord/meetings/meetings.module';
import { GoogleModule } from './google/google.module';
import { OfficeCameraModule } from './office-camera/office-camera.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    NecordModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        token: configService.get('DISCORD_TOKEN') ?? '',
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.GuildMembers,
          IntentsBitField.Flags.GuildVoiceStates,
        ],
        development: [configService.get('DISCORD_GUILD_ID') ?? ''],
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    RecordingsModule,
    MeetingsModule,
    GoogleModule,
    ActivityModule,
    GithubModule,
    OfficeCameraModule,
    GuildConfigModule,
    AdminModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
