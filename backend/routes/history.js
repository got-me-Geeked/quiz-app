const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const prisma = require("../prisma");
// GET /api/history
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const organized = await prisma.quiz.findMany({
      where: { organizerId: userId, status: { in: ["finished", "cancelled"] } },
      include: { _count: { select: { questions: true } } },
    });
    const participations = await prisma.quizParticipant.findMany({
      where: { userId },
      include: {
        quiz: { include: { _count: { select: { questions: true } } } },
      },
    });

    const cards = [];

    for (const q of organized) {
      cards.push({
        quizId: q.id,
        title: q.title,
        questionCount: q._count.questions,
        secondsPerQuestion: q.secondsPerQuestion,
        status: q.status, // finished | cancelled
        role: "organizer",
        startedAt: q.startedAt,
        finishedAt: q.finishedAt,
        createdAt: q.createdAt,
        sortTime: q.finishedAt || q.startedAt || q.createdAt,
      });
    }

    for (const p of participations) {
      const q = p.quiz;
      if (q.organizerId === userId) continue;
      if (!["finished", "cancelled"].includes(q.status)) continue;
      cards.push({
        quizId: q.id,
        title: q.title,
        questionCount: q._count.questions,
        secondsPerQuestion: q.secondsPerQuestion,
        status: q.status,
        role: "participant",
        startedAt: q.startedAt,
        finishedAt: q.finishedAt,
        createdAt: q.createdAt,
        sortTime: q.finishedAt || q.startedAt || q.createdAt,
      });
    }

    cards.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime));
    res.json({ quizzes: cards });
  } catch (err) {
    console.error("history error:", err);
    res.status(500).json({ error: "Не удалось загрузить историю" });
  }
});

// GET /api/history/:quizId/leaderboard
router.get("/:quizId/leaderboard", requireAuth, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.quizId },
    });
    if (!quiz) return res.status(404).json({ error: "Квиз не найден" });

    const isOrganizer = quiz.organizerId === req.userId;
    const myPart = await prisma.quizParticipant.findFirst({
      where: { quizId: quiz.id, userId: req.userId },
    });
    if (!isOrganizer && !myPart) {
      return res.status(403).json({ error: "Нет доступа к результатам" });
    }
    const parts = await prisma.quizParticipant.findMany({
      where: { quizId: quiz.id },
      include: { user: { select: { username: true } } },
    });
    const leaderboard = parts
      .map((p) => ({
        userId: p.userId,
        username: p.user.username,
        isOrganizer: p.userId === quiz.organizerId,
        score: p.score,
      }))
      .sort(
        (a, b) => b.score - a.score || a.username.localeCompare(b.username),
      );

    res.json({
      quiz: { id: quiz.id, title: quiz.title },
      leaderboard,
    });
  } catch (err) {
    console.error("history leaderboard error:", err);
    res.status(500).json({ error: "Не удалось загрузить результаты" });
  }
});

module.exports = router;
