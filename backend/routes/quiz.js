const express = require("express");
const { requireAuth } = require("../middleware/auth");
const crypto = require("crypto");
const {
  createRoom,
  getRoom,
  participantCountByQuiz,
} = require("../socket/roomState");
const prisma = require("../prisma");

const router = express.Router();

const LIMITS = {
  minPlayersFloor: 1,
  maxPlayersCeil: 50,
  secondsMin: 10,
  secondsMax: 180,
  answersMin: 2,
  answersMax: 8,
  questionsMin: 1,
  questionsMax: 20,
};

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[crypto.randomInt(alphabet.length)];
  }
  return code;
}

function validateQuestion(q, index) {
  const where = `Вопрос ${index + 1}: `;
  if (!q || typeof q !== "object") return where + "некорректные данные";

  if (!["text", "image"].includes(q.format))
    return where + "неверный тип вопроса";
  if (!["single", "multiple"].includes(q.answerType))
    return where + "неверный тип ответа";

  if (q.format === "text" && (!q.content || !q.content.trim())) {
    return where + "введите текст вопроса";
  }

  if (!Array.isArray(q.options)) return where + "нет вариантов ответа";
  const filled = q.options.filter(
    (o) => o && typeof o.text === "string" && o.text.trim(),
  );
  if (filled.length < LIMITS.answersMin) {
    return where + `нужно минимум ${LIMITS.answersMin} заполненных варианта`;
  }
  if (q.options.length > LIMITS.answersMax) {
    return where + `максимум ${LIMITS.answersMax} вариантов`;
  }
  const ids = q.options.map((o) => o && o.id).filter(Boolean);
  if (ids.length !== q.options.length || new Set(ids).size !== ids.length) {
    return where + "некорректные идентификаторы вариантов";
  }

  if (!Array.isArray(q.correctAnswer))
    return where + "не отмечен правильный ответ";
  const filledIds = new Set(filled.map((o) => o.id));
  const correctValid = q.correctAnswer.filter((id) => filledIds.has(id));
  if (correctValid.length !== q.correctAnswer.length) {
    return where + "правильный ответ ссылается на пустой вариант";
  }
  if (q.answerType === "single" && q.correctAnswer.length !== 1) {
    return (
      where + "при одиночном ответе отметьте ровно один правильный вариант"
    );
  }
  if (q.answerType === "multiple" && q.correctAnswer.length < 2) {
    return (
      where +
      "при множественном ответе отметьте минимум два правильных варианта"
    );
  }
  return null;
}

function validateSettings(body) {
  const { title, minPlayers, maxPlayers, secondsPerQuestion } = body;
  if (!title || !title.trim()) return "Введите название квиза";

  const minP = Number(minPlayers);
  const maxP = Number(maxPlayers);
  const spq = Number(secondsPerQuestion);

  if (!Number.isInteger(minP) || minP < LIMITS.minPlayersFloor) {
    return "Мин. участников — целое число больше 0";
  }
  if (!Number.isInteger(maxP) || maxP > LIMITS.maxPlayersCeil) {
    return "Макс. участников — целое число не больше 50";
  }
  if (minP > maxP) return "Мин. участников не может быть больше макс.";
  if (
    !Number.isInteger(spq) ||
    spq < LIMITS.secondsMin ||
    spq > LIMITS.secondsMax
  ) {
    return `Время на вопрос — от ${LIMITS.secondsMin} до ${LIMITS.secondsMax} секунд`;
  }
  return null;
}

function normalizeQuestion(q, index) {
  return {
    format: q.format,
    answerType: q.answerType,
    content: q.content?.trim() || null,
    imageUrl: q.imageUrl || null, // заглушка: имя файла или null
    options: q.options.map((o) => ({ id: o.id, text: (o.text || "").trim() })),
    correctAnswer: q.correctAnswer,
    orderIndex: index,
  };
}

// POST /api/quiz
router.post("/", requireAuth, async (req, res) => {
  try {
    const settingsError = validateSettings(req.body);
    if (settingsError) return res.status(400).json({ error: settingsError });

    const questions = Array.isArray(req.body.questions)
      ? req.body.questions
      : [];
    if (questions.length < LIMITS.questionsMin) {
      return res.status(400).json({ error: "Добавьте хотя бы один вопрос" });
    }
    if (questions.length > LIMITS.questionsMax) {
      return res
        .status(400)
        .json({ error: `Максимум ${LIMITS.questionsMax} вопросов` });
    }
    for (let i = 0; i < questions.length; i++) {
      const qErr = validateQuestion(questions[i], i);
      if (qErr) return res.status(400).json({ error: qErr });
    }

    const quiz = await prisma.quiz.create({
      data: {
        organizerId: req.userId,
        title: req.body.title.trim(),
        category: req.body.category?.trim() || null,
        status: "draft",
        minPlayers: Number(req.body.minPlayers),
        maxPlayers: Number(req.body.maxPlayers),
        secondsPerQuestion: Number(req.body.secondsPerQuestion),
        questions: {
          create: questions.map((q, i) => normalizeQuestion(q, i)),
        },
      },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });

    return res.status(201).json({ quiz });
  } catch (err) {
    console.error("create quiz error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.get("/active-session", requireAuth, async (req, res) => {
  try {
    const ownQuiz = await prisma.quiz.findFirst({
      where: { organizerId: req.userId, status: { in: ["waiting", "active"] } },
    });
    if (ownQuiz && ownQuiz.roomCode) {
      return res.json({
        activeSession: {
          quizId: ownQuiz.id,
          title: ownQuiz.title,
          roomCode: ownQuiz.roomCode,
          asOrganizer: true,
        },
      });
    }

    const activeQuizzes = await prisma.quiz.findMany({
      where: { status: "active" },
      select: { id: true, title: true, roomCode: true },
    });
    for (const q of activeQuizzes) {
      const room = q.roomCode ? getRoom(q.roomCode) : null;
      if (room && room.participants.has(req.userId)) {
        return res.json({
          activeSession: {
            quizId: q.id,
            title: q.title,
            roomCode: q.roomCode,
            asOrganizer: false,
          },
        });
      }
    }

    return res.json({ activeSession: null });
  } catch (err) {
    console.error("active-session error:", err);
    return res.status(500).json({ error: "Ошибка" });
  }
});

// GET /api/quiz/mine
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        organizerId: req.userId,
        status: { in: ["draft", "waiting", "active"] },
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true, participants: true } } },
    });

    const shaped = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      category: q.category,
      status: q.status,
      roomCode: q.roomCode,
      questionCount: q._count.questions,
      secondsPerQuestion: q.secondsPerQuestion,
      playerCount: q._count.participants || participantCountByQuiz(q.id),
    }));

    return res.json({ quizzes: shaped });
  } catch (err) {
    console.error("list quizzes error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/quiz/join
router.post("/join", requireAuth, async (req, res) => {
  try {
    const { roomCode } = req.body || {};
    if (!roomCode || !roomCode.trim()) {
      return res.status(400).json({ error: "Введите код комнаты" });
    }
    const code = roomCode.trim().toUpperCase();

    const quiz = await prisma.quiz.findUnique({ where: { roomCode: code } });
    if (!quiz || !["waiting", "active"].includes(quiz.status)) {
      return res
        .status(404)
        .json({ error: "Комната не найдена или квиз не активен" });
    }
    return res.json({ ok: true, roomCode: code, quizId: quiz.id });
  } catch (err) {
    console.error("join error:", err);
    return res.status(500).json({ error: "Не удалось подключиться" });
  }
});

router.post("/:id/activate", requireAuth, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) return res.status(404).json({ error: "Квиз не найден" });
    if (quiz.organizerId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этому квизу" });
    }
    if (quiz.status !== "draft") {
      return res
        .status(400)
        .json({ error: "Активировать можно только черновик" });
    }

    const busy = await prisma.quiz.findFirst({
      where: { organizerId: req.userId, status: { in: ["waiting", "active"] } },
    });
    if (busy) {
      return res.status(400).json({ error: "У вас уже есть активный квиз" });
    }

    //генерация roomCode
    let roomCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRoomCode();
      const exists = await prisma.quiz.findUnique({
        where: { roomCode: candidate },
      });
      if (!exists) {
        roomCode = candidate;
        break;
      }
    }
    if (!roomCode)
      return res.status(500).json({ error: "Не удалось создать код комнаты" });

    const updated = await prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: "waiting", roomCode },
    });

    //создаём комнату в памяти
    createRoom(roomCode, quiz.id, req.userId);
    const { rooms } = require("../socket/roomState");
    console.log(
      "[activate] создал комнату",
      roomCode,
      "| всего комнат:",
      rooms.size,
    );

    return res.json({ ok: true, roomCode, quizId: quiz.id });
  } catch (err) {
    console.error("activate error:", err);
    return res.status(500).json({ error: "Не удалось активировать квиз" });
  }
});

router.post("/:id/open-room", requireAuth, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) return res.status(404).json({ error: "Квиз не найден" });
    if (quiz.organizerId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (!quiz.roomCode)
      return res.status(400).json({ error: "Комната не создана" });

    if (!getRoom(quiz.roomCode)) {
      createRoom(quiz.roomCode, quiz.id, req.userId);
    }
    return res.json({ ok: true, roomCode: quiz.roomCode, quizId: quiz.id });
  } catch (err) {
    console.error("open-room error:", err);
    return res.status(500).json({ error: "Ошибка" });
  }
});

router.post("/:id/return", requireAuth, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) return res.status(404).json({ error: "Квиз не найден" });
    if (quiz.organizerId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (!quiz.roomCode)
      return res.status(400).json({ error: "Комната не создана" });
    if (!getRoom(quiz.roomCode)) {
      createRoom(quiz.roomCode, quiz.id, req.userId);
    }
    return res.json({ ok: true, roomCode: quiz.roomCode, quizId: quiz.id });
  } catch (err) {
    console.error("return error:", err);
    return res.status(500).json({ error: "Ошибка" });
  }
});

// GET /api/quiz/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!quiz) return res.status(404).json({ error: "Квиз не найден" });
    if (quiz.organizerId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этому квизу" });
    }
    return res.json({ quiz });
  } catch (err) {
    console.error("get quiz error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// PUT /api/quiz/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.quiz.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Квиз не найден" });
    if (existing.organizerId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этому квизу" });
    }
    if (existing.status !== "draft") {
      return res
        .status(400)
        .json({ error: "Редактировать можно только черновик" });
    }

    const settingsError = validateSettings(req.body);
    if (settingsError) return res.status(400).json({ error: settingsError });

    const questions = Array.isArray(req.body.questions)
      ? req.body.questions
      : [];
    if (questions.length < LIMITS.questionsMin) {
      return res.status(400).json({ error: "Добавьте хотя бы один вопрос" });
    }
    if (questions.length > LIMITS.questionsMax) {
      return res
        .status(400)
        .json({ error: `Максимум ${LIMITS.questionsMax} вопросов` });
    }
    for (let i = 0; i < questions.length; i++) {
      const qErr = validateQuestion(questions[i], i);
      if (qErr) return res.status(400).json({ error: qErr });
    }

    const quiz = await prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { quizId: req.params.id } });
      return tx.quiz.update({
        where: { id: req.params.id },
        data: {
          title: req.body.title.trim(),
          category: req.body.category?.trim() || null,
          minPlayers: Number(req.body.minPlayers),
          maxPlayers: Number(req.body.maxPlayers),
          secondsPerQuestion: Number(req.body.secondsPerQuestion),
          questions: {
            create: questions.map((q, i) => normalizeQuestion(q, i)),
          },
        },
        include: { questions: { orderBy: { orderIndex: "asc" } } },
      });
    });

    return res.json({ quiz });
  } catch (err) {
    console.error("update quiz error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// DELETE /api/quiz/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.quiz.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Квиз не найден" });
    if (existing.organizerId !== req.userId) {
      return res.status(403).json({ error: "Нет доступа к этому квизу" });
    }
    await prisma.quiz.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("delete quiz error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;
