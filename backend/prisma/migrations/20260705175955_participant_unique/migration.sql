/*
  Warnings:

  - A unique constraint covering the columns `[quizId,userId]` on the table `QuizParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "QuizParticipant_quizId_userId_key" ON "QuizParticipant"("quizId", "userId");
