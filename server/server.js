const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Update static file serving
app.use(express.static(path.join(__dirname, '../public')));

// Update CORS for production
const io = new Server(server, {
  cors: {
    origin: process.env.VERCEL_URL || "*",
    methods: ["GET", "POST"]
  },
  path: "/socket.io/"
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  let currentRoom = null;

  socket.on("join-room", (roomId, username) => {
    console.log(`User ${socket.id} attempting to join room ${roomId}`);

    currentRoom = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    socket.join(roomId);
    rooms[roomId].push({
      id: socket.id,
      username: username || "Guest",
    });

    socket.to(roomId).emit("user-connected", socket.id, username);

    socket.emit(
      "room-users",
      rooms[roomId].filter((user) => user.id !== socket.id)
    );

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("send-message", (message) => {
    if (!currentRoom) return;
    
    const user = rooms[currentRoom]?.find(u => u.id === socket.id);
    const username = user ? user.username : "Guest";
    
    const isHost = rooms[currentRoom] && rooms[currentRoom][0]?.id === socket.id;
    const displayName = username + (isHost ? "(Host)" : "");
    
    socket.to(currentRoom).emit("receive-message", {
      user: displayName,
      text: message,
      senderId: socket.id,
    });
  });

  socket.on("offer", (offer, targetId) => {
    console.log(`Forwarding offer from ${socket.id} to ${targetId}`);
    socket.to(targetId).emit("offer", offer, socket.id);
  });

  socket.on("answer", (answer, targetId) => {
    console.log(`Forwarding answer from ${socket.id} to ${targetId}`);
    socket.to(targetId).emit("answer", answer, socket.id);
  });

  socket.on("ice-candidate", (candidate, targetId) => {
    console.log(`Forwarding ICE candidate from ${socket.id} to ${targetId}`);
    socket.to(targetId).emit("ice-candidate", candidate, socket.id);
  });

  socket.on("leave-room", () => {
    handleDisconnect();
  });

  const handleDisconnect = () => {
    if (currentRoom && rooms[currentRoom]) {
      console.log(`User ${socket.id} left room ${currentRoom}`);

      const user = rooms[currentRoom].find((u) => u.id === socket.id);
      const username = user ? user.username : "Guest";

      rooms[currentRoom] = rooms[currentRoom].filter((user) => user.id !== socket.id);

      if (rooms[currentRoom].length === 0) {
        delete rooms[currentRoom];
      } else {
        socket.to(currentRoom).emit("user-disconnected", socket.id, username);
      }

      socket.leave(currentRoom);
      currentRoom = null;
    }
  };

  socket.on("disconnect", handleDisconnect);
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

// Start the server
const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});