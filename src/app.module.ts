import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import Joi, { allow } from 'joi';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
    validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().uri().required(),
        PORT: Joi.number().default(3000),
    }),
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
