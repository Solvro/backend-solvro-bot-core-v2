import { Controller, Get, Query, Res } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import express from 'express';

@Controller('google')
export class GoogleController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get('login')
  login(@Res() res: express.Response) {
    const url = this.googleAuthService.generateAuthUrl();
    res.redirect(url);
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    const tokens = await this.googleAuthService.authenticate(code);
    
    return {
      message: 'Authentication successful! Please save the refresh token in your .env file.',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    };
  }
}
