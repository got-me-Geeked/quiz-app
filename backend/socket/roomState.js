//состояние комнат в памяти сервера
const rooms = new Map();

function createRoom(roomCode, quizId, organizerId) {
  if (rooms.has(roomCode)) return rooms.get(roomCode);
  const state = {
    quizId,
    organizerId,
    status: "lobby",
    participants: new Map(),
  };
  rooms.set(roomCode, state);
  return state;
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function removeRoom(roomCode) {
  rooms.delete(roomCode);
}

function addParticipant(roomCode, { userId, username, isOrganizer, socketId }) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const existing = room.participants.get(userId);
  if (existing) {
    existing.socketId = socketId;
    existing.connected = true;
    return room;
  }
  room.participants.set(userId, {
    userId,
    username,
    isOrganizer: !!isOrganizer,
    score: 0,
    socketId,
    joinedAt: Date.now(),
    connected: true,
  });
  return room;
}

function removeParticipant(roomCode, userId) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.participants.delete(userId);
  return room;
}

function participantList(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];
  return [...room.participants.values()]
    .map((p) => ({
      userId: p.userId,
      username: p.username,
      isOrganizer: p.isOrganizer,
      score: p.score,
      joinedAt: p.joinedAt,
      connected: p.connected !== false,
    }))
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
}

function participantCountByQuiz(quizId) {
  for (const room of rooms.values()) {
    if (room.quizId === quizId) return room.participants.size;
  }
  return 0;
}

function findRoomBySocket(socketId) {
  for (const [roomCode, room] of rooms.entries()) {
    for (const p of room.participants.values()) {
      if (p.socketId === socketId) return { roomCode, userId: p.userId };
    }
  }
  return null;
}

function markDisconnected(roomCode, userId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const p = room.participants.get(userId);
  if (p) p.connected = false;
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  removeRoom,
  addParticipant,
  removeParticipant,
  participantList,
  findRoomBySocket,
  participantCountByQuiz,
  markDisconnected,
};
