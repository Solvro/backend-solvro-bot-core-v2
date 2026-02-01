import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { GithubService, GithubWebhookPayload } from './github.service';
import { Request } from 'express';

interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

@Controller('webhook/github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(private readonly githubService: GithubService) {}

  @Post()
  async webhook(
    @Headers('X-GitHub-Event') event: string,
    @Headers('X-Hub-Signature-256') signature: string,
    @Req() req: RequestWithRawBody,
  ) {
    if (!event) {
      this.logger.debug('Github webhook: Missing event header');
      throw new BadRequestException('Missing event header');
    }

    if (!signature) {
      this.logger.debug('Github webhook: Missing signature');
      throw new UnauthorizedException('Missing signature');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.debug('Github webhook: Missing request body');
      throw new BadRequestException('Missing request body');
    }

    if (!this.githubService.isValidSignature(signature, rawBody)) {
      this.logger.debug('Github webhook: Invalid signature');
      throw new UnauthorizedException('Invalid signature');
    }

    const payload = req.body as GithubWebhookPayload;

    try {
      await this.githubService.handleWebhook(event, payload);
      return { message: 'Webhook processed.' };
    } catch (err) {
      const originalMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        'Error processing GitHub webhook',
        err instanceof Error ? err.stack : originalMessage,
      );
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      throw new BadRequestException(
        `Error processing GitHub webhook: ${originalMessage}`,
      );
    }
  }
}
