require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(require("cors")());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get("/api/health", (req, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
});

server.listen(process.env.PORT, () =>
  console.log(`Backend on :${process.env.PORT}`),
);
