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
    const { name, roomId } = data;
    emailToSocketIdMap.set(name, socket.id);
    socketIdToEmailMap.set(socket.id, name);
    io.to(roomId).emit("user-joined", { name, id: socket.id });
    socket.join(roomId);
    io.to(socket.id).emit("join-room", data);
  });

  socket.on("user-call", (data) => {
    const { to, name, offer } = data;
    io.to(to).emit("incoming-call", { from: socket.id, name, offer });
  });

  socket.on("call-accepted", (data) => {
    const { to, ans } = data;
    io.to(to).emit("call-accepted", { from: socket.id, ans });
  });

  socket.on("peer-nego-needed", (data) => {
    const { offer, to, shareStream } = data;
    io.to(to).emit("peer-nego-needed", {
      offer,
      from: socket.id,
      shareStream,
    });
  });

  socket.on("peer-nego-done", (data) => {
    const { to, ans, shareStream } = data;
    io.to(to).emit("peer-nego-final", { ans, from: socket.id, shareStream });
  });

  socket.on("user-hangup", (data) => {
    const { to } = data;
    io.to(to).emit("user-hangup", { from: socket.id });
  });

  socket.on("send-message", (data) => {
    const { to, text, from } = data;
    io.to(to).emit("receive-message", {
      from,
      text,
    });
  });
});
