/*
  Warnings:

  - You are about to drop the column `type` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `QuizParticipant` table. All the data in the column will be lost.
  - Added the required column `answerType` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `format` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Made the column `options` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Question" DROP COLUMN "type",
ADD COLUMN     "answerType" TEXT NOT NULL,
ADD COLUMN     "format" TEXT NOT NULL,
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "options" SET NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "QuizParticipant" DROP COLUMN "joinedAt";
