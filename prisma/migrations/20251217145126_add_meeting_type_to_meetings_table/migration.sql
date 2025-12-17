-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('Weekly', 'Other');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "meetingType" "MeetingType" NOT NULL DEFAULT 'Other';
