/*
  Warnings:

  - A unique constraint covering the columns `[externalId,type]` on the table `GithubActivity` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GithubActivity_externalId_type_key" ON "GithubActivity"("externalId", "type");
