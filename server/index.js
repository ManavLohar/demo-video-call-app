const { Server } = require("socket.io");

const io = new Server(8000, {
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
    io.to(to).emit("call-accepted", { to: socket.id, ans });
  });

  socket.on("peer-nego-needed", (data) => {
    const { offer, to } = data;
    io.to(to).emit("peer-nego-needed", { offer, to: socket.id });
  });
});
