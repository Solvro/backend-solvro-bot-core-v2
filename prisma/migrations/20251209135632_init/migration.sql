-- CreateEnum
CREATE TYPE "RecordingState" AS ENUM ('NotRecorded', 'InProgress', 'AwaitingProcessing', 'Processed', 'Failed');

-- CreateEnum
CREATE TYPE "AttendanceState" AS ENUM ('Idle', 'Monitoring', 'Completed');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('New', 'Active', 'Inactive');

-- CreateEnum
CREATE TYPE "GithubActivityType" AS ENUM ('Commit', 'PullRequest', 'Issue', 'Review', 'Other');

-- CreateTable
CREATE TABLE "Member" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "studentIndex" TEXT,
    "faculty" TEXT,
    "fieldOfStudy" TEXT,
    "studyYear" TEXT,
    "currentSection" TEXT,
    "currentRole" TEXT,
    "currentProjects" TEXT,
    "otherProjects" TEXT,
    "otherExperiences" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'New',
    "discordId" TEXT NOT NULL,
    "messengerUrl" TEXT,
    "githubUsername" TEXT,
    "githubUrl" TEXT,
    "githubId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "discordChannelId" TEXT,
    "attendanceStatus" "AttendanceState" NOT NULL DEFAULT 'Idle',
    "recordingStatus" "RecordingState",
    "fullTranscription" TEXT,
    "driveFolderId" TEXT,
    "isUploadedToDrive" BOOLEAN NOT NULL DEFAULT false,
    "uploadCompletedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptionChunk" (
    "id" SERIAL NOT NULL,
    "speakerDiscordId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meetingId" INTEGER NOT NULL,

    CONSTRAINT "TranscriptionChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordActivity" (
    "id" SERIAL NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "memberId" INTEGER NOT NULL,

    CONSTRAINT "DiscordActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubActivity" (
    "id" SERIAL NOT NULL,
    "githubId" TEXT,
    "type" "GithubActivityType" NOT NULL,
    "repo" TEXT NOT NULL,
    "message" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelActivity" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeStatusSnapshot" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "currentPersonCount" INTEGER,
    "lastPresenceDetectedAt" TIMESTAMP(3),
    "lastMessageUpdatedAt" TIMESTAMP(3),
    "imagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeStatusSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraDowntimeAlert" (
    "id" SERIAL NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "lastMessageSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraDowntimeAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MeetingToMember" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MeetingToMember_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_discordId_key" ON "Member"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_githubId_key" ON "Member"("githubId");

-- CreateIndex
CREATE INDEX "Member_discordId_idx" ON "Member"("discordId");

-- CreateIndex
CREATE INDEX "Member_githubId_idx" ON "Member"("githubId");

-- CreateIndex
CREATE INDEX "TranscriptionChunk_meetingId_idx" ON "TranscriptionChunk"("meetingId");

-- CreateIndex
CREATE INDEX "DiscordActivity_memberId_idx" ON "DiscordActivity"("memberId");

-- CreateIndex
CREATE INDEX "DiscordActivity_date_idx" ON "DiscordActivity"("date");

-- CreateIndex
CREATE INDEX "GithubActivity_date_idx" ON "GithubActivity"("date");

-- CreateIndex
CREATE INDEX "ChannelActivity_channelId_idx" ON "ChannelActivity"("channelId");

-- CreateIndex
CREATE INDEX "_MeetingToMember_B_index" ON "_MeetingToMember"("B");

-- AddForeignKey
ALTER TABLE "TranscriptionChunk" ADD CONSTRAINT "TranscriptionChunk_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordActivity" ADD CONSTRAINT "DiscordActivity_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubActivity" ADD CONSTRAINT "GithubActivity_githubId_fkey" FOREIGN KEY ("githubId") REFERENCES "Member"("githubId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingToMember" ADD CONSTRAINT "_MeetingToMember_A_fkey" FOREIGN KEY ("A") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingToMember" ADD CONSTRAINT "_MeetingToMember_B_fkey" FOREIGN KEY ("B") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
