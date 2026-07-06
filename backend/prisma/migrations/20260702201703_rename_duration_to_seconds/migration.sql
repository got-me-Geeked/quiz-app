/*
  Warnings:

  - You are about to drop the column `durationSeconds` on the `Quiz` table. All the data in the column will be lost.
  - Added the required column `secondsPerQuestion` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_quizId_fkey";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "durationSeconds",
ADD COLUMN     "secondsPerQuestion" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
