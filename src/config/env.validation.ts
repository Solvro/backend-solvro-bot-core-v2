import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().uri().required(),
  PORT: Joi.number().default(3000),
  DISCORD_TOKEN: Joi.string().required(),
  DISCORD_DEVELOPMENT_GUILD_ID: Joi.string().allow('', null),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_REDIRECT_URI: Joi.string().required(),
  GOOGLE_REFRESH_TOKEN: Joi.string().allow('', null),
  GOOGLE_DRIVE_FOLDER_ID: Joi.string().required(),
  TRANSCRIBER_URL: Joi.string().uri().required(),
  GITHUB_WEBHOOK_SECRET: Joi.string().required(),
});
