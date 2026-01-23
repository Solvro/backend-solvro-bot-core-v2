import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { GithubActivityType } from 'generated/prisma/enums';

@Injectable()
export class GithubService {
    private readonly logger = new Logger(GithubService.name);

    constructor(
        private readonly database: DatabaseService,
        private readonly configService: ConfigService
    ) { }

    isValidSignature(signature: string, rawBody: Buffer): boolean {
        const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');
        
        if (!secret) {
            this.logger.error('GitHub webhook secret is not configured.');
            return false;
        }

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(rawBody);
        const expectedSignature = `sha256=${hmac.digest('hex')}`;
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }

    async handleWebhook(event: string, payload: any) {
        const fullRepoName = payload.repository?.full_name;

        if (!fullRepoName) {
            this.logger.debug('Github webhook: Missing repository data.');
            throw new Error('Missing repository data.');
        }

        switch (event) {
            case 'push': {
                const commits = payload.commits || [];
                const authorId = payload.sender?.id?.toString() || 'unknown';

                this.logger.debug(`Github webhook event: ${event}, user ${authorId} pushed ${commits.length} commits`);

                for (const commit of commits) {
                    const commitId = commit.id;
                    const message = commit.message;
                    const date = new Date(commit.timestamp);

                    const exists = await this.database.githubActivity.findFirst({
                        where: {
                            externalId: commitId,
                            type: GithubActivityType.Commit,
                        },
                    });

                    if (!exists) {
                        await this.database.githubActivity.create({
                            data: {
                                externalId: commitId,
                                type: GithubActivityType.Commit,
                                message,
                                githubId: authorId,
                                repo: fullRepoName,
                                date: date,
                            },
                        });
                    }
                }
                break;
            }

            case 'issues': {
                const issue = payload.issue;
                const action = payload.action;

                if (issue && ['opened', 'edited'].includes(action)) {
                    const issueNodeId = issue.node_id;
                    const authorId = issue.user?.id?.toString() || 'unknown';
                    const message = issue.title;
                    const date = new Date(issue.created_at);

                    this.logger.debug(`Github webhook event: ${event}, user ${authorId} created/edited ${issue.title} issue`);

                    const exists = await this.database.githubActivity.findFirst({
                        where: {
                            externalId: issueNodeId,
                            type: GithubActivityType.Issue,
                        },
                    });

                    if (!exists) {
                        await this.database.githubActivity.create({
                            data: {
                                externalId: issueNodeId,
                                type: GithubActivityType.Issue,
                                message,
                                githubId: authorId,
                                repo: fullRepoName,
                                date: date,
                            },
                        });
                    }
                }
                break;
            }

            case 'pull_request': {
                const pr = payload.pull_request;
                const action = payload.action;

                if (pr && ['opened', 'reopened', 'edited'].includes(action)) {
                    const prNodeId = pr.node_id;
                    const authorId = pr.user?.id?.toString() || 'unknown';
                    const message = pr.title;
                    const date = new Date(pr.created_at);

                    this.logger.debug(`Github webhook event: ${event}, user ${authorId} created/reopened/edited ${pr.title} pull request`);

                    const exists = await this.database.githubActivity.findFirst({
                        where: {
                            externalId: prNodeId,
                            type: GithubActivityType.PullRequest,
                        },
                    });

                    if (!exists) {
                        await this.database.githubActivity.create({
                            data: {
                                externalId: prNodeId,
                                type: GithubActivityType.PullRequest,
                                message,
                                githubId: authorId,
                                repo: fullRepoName,
                                date: date,
                            },
                        });
                    }
                }
                break;
            }

            case 'pull_request_review': {
                const review = payload.review;
                if (!review) break;

                const reviewNodeId = review.node_id;
                const authorId = review.user?.id?.toString() || 'unknown';
                const message = `Review state: ${review.state}`;
                const date = new Date(review.submitted_at);

                this.logger.debug(`Github webhook event: ${event}, user ${authorId} reviewed a pull request`);

                const exists = await this.database.githubActivity.findFirst({
                    where: {
                        externalId: reviewNodeId,
                        type: GithubActivityType.Review,
                    },
                });

                if (!exists) {
                    await this.database.githubActivity.create({
                        data: {
                            externalId: reviewNodeId,
                            type: GithubActivityType.Review,
                            message,
                            githubId: authorId,
                            repo: fullRepoName,
                            date: date,
                        },
                    });
                }
                break;
            }

            default:
                this.logger.debug(`Unsupported github webhook event received: ${event}`);
                break;
        }
    }
}

