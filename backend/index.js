require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const path = require("path");

const authRoutes = require("./routes/auth");
const quizRoutes = require("./routes/quiz");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/upload", require("./routes/upload"));
app.use("/api/history", require("./routes/history"));
app.use("/api/profile", require("./routes/profile"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/api/health", (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});
const { registerRoomSocket } = require("./socket/roomHandlers");
registerRoomSocket(io);

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
});

server.listen(PORT, () => console.log(`Backend on :${PORT}`));
