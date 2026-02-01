/*
  Warnings:

  - Added the required column `date` to the `ChannelActivity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChannelActivity" ADD COLUMN     "date" DATE NOT NULL;

-- CreateIndex
CREATE INDEX "ChannelActivity_date_idx" ON "ChannelActivity"("date");
