//игровой движок квиза

const { getRoom, participantList } = require("./roomState");

const prisma = require("../prisma");

const games = new Map();

//распределение 100 очков поровну + остаток на последний вопрос
function computePoints(questionCount) {
  const base = Math.floor(100 / questionCount);
  const arr = new Array(questionCount).fill(base);
  arr[questionCount - 1] += 100 - base * questionCount;
  return arr;
}

function publicQuestion(q, index, total) {
  return {
    index,
    total,
    format: q.format,
    answerType: q.answerType,
    content: q.content,
    imageUrl: q.imageUrl,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

function totalScore(game, userId) {
  const ua = game.answers.get(userId);
  if (!ua) return 0;
  let sum = 0;
  for (const a of ua.values()) sum += a.points;
  return sum;
}

//суммарное время ответов игрока
function totalAnswerTime(game, userId) {
  const ua = game.answers.get(userId);
  if (!ua) return Number.MAX_SAFE_INTEGER;
  let t = 0;
  for (const a of ua.values()) t += a.answerMs || 0;
  return t;
}

//лидерборд сортировка
function leaderboard(roomCode) {
  const game = games.get(roomCode);
  const room = getRoom(roomCode);
  if (!game || !room) return [];
  return [...room.participants.values()]
    .map((p) => ({
      userId: p.userId,
      username: p.username,
      isOrganizer: p.isOrganizer,
      score: totalScore(game, p.userId),
      _time: totalAnswerTime(game, p.userId),
    }))
    .sort((a, b) => b.score - a.score || a._time - b._time)
    .map(({ _time, ...rest }) => rest);
}

async function startGame(io, roomCode) {
  const room = getRoom(roomCode);
  if (!room) return;

  const quiz = await prisma.quiz.findUnique({
    where: { id: room.quizId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!quiz || quiz.questions.length === 0) return;

  const game = {
    quizId: quiz.id,
    questions: quiz.questions,
    secondsPerQuestion: quiz.secondsPerQuestion,
    pointsPerQuestion: computePoints(quiz.questions.length),
    currentIndex: -1,
    deadline: 0,
    timer: null,
    answers: new Map(),
  };
  games.set(roomCode, game);

  nextQuestion(io, roomCode);
}

function nextQuestion(io, roomCode) {
  const game = games.get(roomCode);
  if (!game) return;

  game.currentIndex += 1;

  if (game.currentIndex >= game.questions.length) {
    return finishGame(io, roomCode);
  }

  const q = game.questions[game.currentIndex];
  const ms = game.secondsPerQuestion * 1000;
  game.deadline = Date.now() + ms;
  game.questionStart = Date.now();

  //рассылка вопроса
  io.to(roomCode).emit("game:question", {
    question: publicQuestion(q, game.currentIndex, game.questions.length),
    secondsPerQuestion: game.secondsPerQuestion,
    deadline: game.deadline,
  });

  game.timer = setTimeout(() => {
    endQuestion(io, roomCode);
  }, ms);
}

function endQuestion(io, roomCode) {
  const game = games.get(roomCode);
  if (!game) return;
  const q = game.questions[game.currentIndex];

  io.to(roomCode).emit("game:questionEnd", {
    index: game.currentIndex,
    correctAnswer: q.correctAnswer, // id правильных
  });

  io.to(roomCode).emit("game:leaderboard", leaderboard(roomCode));

  //небольшая пауза перед следующим вопросом
  setTimeout(() => nextQuestion(io, roomCode), 2500);
}

//проверка ответа игрока (приходит по сокету во время вопроса)
function submitAnswer(io, roomCode, userId, selected) {
  const game = games.get(roomCode);
  if (!game) return { error: "Игра не найдена" };
  const idx = game.currentIndex;
  const q = game.questions[idx];
  if (!q) return { error: "Нет активного вопроса" };

  let ua = game.answers.get(userId);
  if (!ua) {
    ua = new Map();
    game.answers.set(userId, ua);
  }
  if (ua.has(idx)) return { error: "Вы уже ответили" };

  if (Date.now() > game.deadline) return { error: "Время вышло" };

  const sel = Array.isArray(selected) ? selected : [];
  const correct = q.correctAnswer;

  const selSet = new Set(sel);
  const corrSet = new Set(correct);
  const isCorrect =
    selSet.size === corrSet.size && [...selSet].every((id) => corrSet.has(id));

  const answerMs = Date.now() - game.questionStart;
  const points = isCorrect ? game.pointsPerQuestion[idx] : 0;

  ua.set(idx, {
    correct: isCorrect,
    points,
    answerMs,
    answeredAt: new Date(),
    selected: sel,
  });

  //шлем ответ
  return {
    ok: true,
    isCorrect,
    correctAnswer: correct,
    yourSelected: sel,
    points,
  };
}

async function finishGame(io, roomCode) {
  const game = games.get(roomCode);
  const room = getRoom(roomCode);
  if (!game) return;

  const final = leaderboard(roomCode);

  try {
    await prisma.quiz.update({
      where: { id: game.quizId },
      data: { status: "finished", finishedAt: new Date() },
    });
  } catch (err) {
    console.error("finish: status update failed:", err);
  }

  try {
    for (const p of room?.participants.values() || []) {
      const score = totalScore(game, p.userId);
      const participant = await prisma.quizParticipant.upsert({
        where: { quizId_userId: { quizId: game.quizId, userId: p.userId } },
        create: {
          quizId: game.quizId,
          userId: p.userId,
          score,
          finishedAt: new Date(),
        },
        update: { score, finishedAt: new Date() },
      });

      const ua = game.answers.get(p.userId);
      if (ua) {
        for (const [qIdx, a] of ua.entries()) {
          const question = game.questions[qIdx];
          await prisma.answer
            .create({
              data: {
                questionId: question.id,
                quizParticipantId: participant.id,
                answerValue: a.selected || [],
                isCorrect: a.correct,
                pointsAwarded: a.points,
                answeredAt: a.answeredAt,
              },
            })
            .catch((e) => console.error("answer create:", e)); // на случай отсутствия модели Answer — не роняем игру
        }
      }
    }
  } catch (err) {
    console.error("finishGame persist error:", err);
  }

  io.to(roomCode).emit("game:finished", { leaderboard: final });
  clearGame(roomCode);
}

function clearGame(roomCode) {
  const game = games.get(roomCode);
  if (game?.timer) clearTimeout(game.timer);
  games.delete(roomCode);
}

function getGame(roomCode) {
  return games.get(roomCode) || null;
}

function getStateForRejoin(roomCode, userId) {
  const game = games.get(roomCode);
  if (!game) return null;

  const idx = game.currentIndex;
  const q = game.questions[idx];
  if (!q) return null;

  const ua = game.answers.get(userId);
  const myAnswer = ua?.get(idx) || null;

  return {
    inProgress: true,
    question: publicQuestion(q, idx, game.questions.length),
    secondsPerQuestion: game.secondsPerQuestion,
    deadline: game.deadline,
    leaderboard: leaderboard(roomCode),
    alreadyAnswered: myAnswer
      ? {
          correctAnswer: q.correctAnswer,
          yourSelected: myAnswer.selected || [],
        }
      : null,
  };
}

module.exports = {
  games,
  startGame,
  submitAnswer,
  finishGame,
  clearGame,
  getGame,
  leaderboard,
  getStateForRejoin,
};
