const { Server } = require("socket.io");
const express = require("express");
const path = require("path");
const { log } = require("console");

const app = express();
const port = 8000;

// app.use(express.static(path.join(__dirname, "public", "dist")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
// });

// const server = app.listen(port, () => {
//   log(`Server is running on port ${port}`);
// });

const io = new Server(port, {
  cors: true,
});

const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log("Socket Connected", socket.id);
  socket.on("join-room", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);
    io.to(room).emit("user-joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("join-room", data);
  });

  socket.on("user-call", (data) => {
    const { to, offer } = data;
    io.to(to).emit("incoming-call", { from: socket.id, offer });
  });

  socket.on("call-accepted", (data) => {
    const { to, ans } = data;
    io.to(to).emit("call-accepted", { from: socket.id, ans });
  });

  socket.on("peer-nego-needed", (data) => {
    const { offer, to } = data;
    io.to(to).emit("peer-nego-needed", { offer, from: socket.id });
  });

  socket.on("peer-nego-done", (data) => {
    const { to, ans } = data;
    io.to(to).emit("peer-nego-final", { ans, from: socket.id });
  });

  socket.on("user-hangup", (data) => {
    const { to } = data;
    io.to(to).emit("user-hangup", { from: socket.id });
  });
});
