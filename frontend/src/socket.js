import { io } from "socket.io-client";

//подключается лениво, токен берётся из localStorage
let socket = null;

export function getSocket() {
  if (!socket) {
    const base = import.meta.env.VITE_API_URL || "http://localhost:3001";
    socket = io(base, {
      autoConnect: false,
      auth: { token: localStorage.getItem("token") },
    });
  }
  //обновляем токен на случай, если он появился / сменился
  socket.auth = { token: localStorage.getItem("token") };
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) socket.disconnect();
}
