const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const {
  getRoom,
  addParticipant,
  removeParticipant,
  participantList,
  findRoomBySocket,
  removeRoom,
  markDisconnected,
} = require("./roomState");
const {
  startGame,
  submitAnswer,
  getGame,
  leaderboard,
  clearGame,
  getStateForRejoin,
} = require("./gameEngine");

//логика комнаты на переданном io-сервере
function registerRoomSocket(io) {
  //сокет без валидного токена в комнату не попадёт
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomCode }, ack) => {
      const { rooms } = require("./roomState");
      console.log(
        "[join] ищу комнату",
        roomCode,
        "| всего комнат:",
        rooms.size,
      );
      try {
        if (!roomCode) return ack?.({ error: "Нет кода комнаты" });

        const room = getRoom(roomCode);
        if (!room)
          return ack?.({ error: "Комната не найдена или квиз не активен" });
        if (room.status === "finished")
          return ack?.({ error: "Квиз уже завершён" });

        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
        });
        if (!user) return ack?.({ error: "Пользователь не найден" });

        const isOrganizer = room.organizerId === socket.userId;

        addParticipant(roomCode, {
          userId: socket.userId,
          username: user.username,
          isOrganizer,
          socketId: socket.id,
        });

        socket.join(roomCode);
        socket.data.roomCode = roomCode;

        const quiz = await prisma.quiz.findUnique({
          where: { id: room.quizId },
          include: { _count: { select: { questions: true } } },
        });

        ack?.({
          ok: true,
          you: { userId: socket.userId, isOrganizer },
          quiz: quiz && {
            id: quiz.id,
            title: quiz.title,
            questionCount: quiz._count.questions,
            secondsPerQuestion: quiz.secondsPerQuestion,
            roomCode,
            status: room.status,
          },
          participants: participantList(roomCode),
        });

        io.to(roomCode).emit("room:participants", participantList(roomCode));
      } catch (err) {
        console.error("room:join error:", err);
        ack?.({ error: "Ошибка входа в комнату" });
      }
    });

    //запуск квиза
    socket.on("room:start", async ({ roomCode }, ack) => {
      try {
        const room = getRoom(roomCode);
        if (!room) return ack?.({ error: "Комната не найдена" });
        if (room.organizerId !== socket.userId) {
          return ack?.({ error: "Только организатор может запустить квиз" });
        }
        room.status = "running";
        await prisma.quiz.update({
          where: { id: room.quizId },
          data: { status: "active", startedAt: new Date() },
        });

        //сообщение, что игра началась
        io.to(roomCode).emit("room:started", { quizId: room.quizId });

        //запускаем игровой движок (рассылка первого вопроса)
        await startGame(io, roomCode);

        ack?.({ ok: true });
      } catch (err) {
        console.error("room:start error:", err);
        ack?.({ error: "Не удалось запустить квиз" });
      }
    });

    socket.on("game:answer", ({ roomCode, selected }, ack) => {
      try {
        const result = submitAnswer(io, roomCode, socket.userId, selected);
        //результат уходит только ответившему
        ack?.(result);
      } catch (err) {
        console.error("game:answer error:", err);
        ack?.({ error: "Ошибка при отправке ответа" });
      }
    });
    socket.on("game:rejoin", ({ roomCode }, ack) => {
      try {
        const state = getStateForRejoin(roomCode, socket.userId);
        if (!state) return ack?.({ inProgress: false }); //игра не идёт (лобби или уже финиш)
        ack?.(state);
      } catch (err) {
        console.error("game:rejoin error:", err);
        ack?.({ error: "Ошибка переподключения" });
      }
    });

    //отмена квиза
    socket.on("room:cancel", async ({ roomCode }, ack) => {
      try {
        const room = getRoom(roomCode);
        if (!room) return ack?.({ error: "Комната не найдена" });
        if (room.organizerId !== socket.userId) {
          return ack?.({ error: "Только организатор может отменить квиз" });
        }
        await prisma.quiz.update({
          where: { id: room.quizId },
          data: { status: "cancelled", finishedAt: new Date() },
        });
        io.to(roomCode).emit("room:cancelled");
        clearGame(roomCode);
        removeRoom(roomCode);
        ack?.({ ok: true });
      } catch (err) {
        console.error("room:cancel error:", err);
        ack?.({ error: "Не удалось отменить квиз" });
      }
    });

    //выход игрока
    socket.on("room:leave", ({ roomCode }) => {
      handleLeave(socket, roomCode);
    });

    //обрыв соединения
    socket.on("disconnect", () => {
      const found = findRoomBySocket(socket.id);
      if (found) handleLeave(socket, found.roomCode);
    });
  });

  // общий обработчик выхода/обрыва
  function handleLeave(socket, roomCode) {
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room) return;
    //removeParticipant(roomCode, socket.userId);
    markDisconnected(roomCode, socket.userId);
    socket.leave(roomCode);
    socket.to(roomCode).emit("room:participants", participantList(roomCode));
  }
}

module.exports = { registerRoomSocket };
