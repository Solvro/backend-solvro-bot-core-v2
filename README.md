<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Solvro Bot Core V2

Backend service for the Solvro Bot, built with [NestJS](https://github.com/nestjs/nest).

## Prerequisites

Before you begin, ensure you have met the following requirements:
*   **Node.js**: v18 or higher recommended.
*   **npm**: usually comes with Node.js.
*   **PostgreSQL**: You can run this locally or via Docker.
*   **Active Discord Bot Application**: You need a token from the [Discord Developer Portal](https://discord.com/developers/applications).
*   **Google Cloud Console Project**: For Google Drive integration (OAuth2 credentials).

## Project Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd backend-solvro-bot-core-v2
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

1.  Copy the example environment file to a new file named `.env`:

    ```bash
    cp .env.example .env
    ```

2.  Open `.env` and fill in the required values:

    *   **Server Configuration**:
        *   `NODE_ENV`: `development`
        *   `PORT`: Port to run the server on (default: `3000`).

    *   **Database**:
        *   `DATABASE_URL`: Your PostgreSQL connection string.  
            Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

    *   **Discord Integration**:
        *   `DISCORD_TOKEN`: Your Discord Bot Token.
        *   `DISCORD_DEVELOPMENT_GUILD_ID`: (Optional) ID of a specific guild for development/testing commands.

    *   **External Services**:
        *   `TRANSCRIBER_URL`: URL to the transcription service (e.g., `http://localhost:3001`).

    *   **Google Integration** (Drive & Auth):
        *   `GOOGLE_CLIENT_ID`: From Google Cloud Console.
        *   `GOOGLE_CLIENT_SECRET`: From Google Cloud Console.
        *   `GOOGLE_REDIRECT_URI`: Your callback URL (e.g., `http://localhost:3000/google/callback`).
        *   `GOOGLE_REFRESH_TOKEN`: Access token for offline access (can be obtained via OAuth flow).
        *   `GOOGLE_DRIVE_FOLDER_ID`: ID of the folder where files should be stored.

    *   **GitHub Integration**:
        *   `GITHUB_WEBHOOK_SECRET`: Secret used to verify GitHub webhooks.

### 4. Database Setup (Prisma)

Ensure your PostgreSQL database is running, then generate the Prisma client and run migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to set up the database schema
npx prisma migrate dev
```

## Running the application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
