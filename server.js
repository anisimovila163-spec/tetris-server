
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.send("Tetris server is online!");
});

const users = new Map();

function sendUsers() {
  io.emit("online-list", [...users.entries()].map(([id, user]) => ({
    id,
    name: user.name,
    sharing: user.sharing
  })));
}

io.on("connection", socket => {
  users.set(socket.id, {
    name: "Игрок-" + socket.id.slice(0, 5),
    sharing: false
  });

  sendUsers();

  socket.on("set-name", name => {
    const user = users.get(socket.id);
    if (!user) return;
    user.name = String(name).slice(0, 30);
    sendUsers();
  });

  socket.on("share-start", () => {
    const user = users.get(socket.id);
    if (!user) return;
    user.sharing = true;
    sendUsers();
  });

  socket.on("share-stop", () => {
    const user = users.get(socket.id);
    if (!user) return;
    user.sharing = false;
    sendUsers();
  });

  socket.on("request-list", sendUsers);

  socket.on("request-view", target => {
    const user = users.get(target);
    if (user && user.sharing) {
      io.to(target).emit("viewer-request", socket.id);
    }
  });

  socket.on("signal", ({ target, data }) => {
    if (users.has(target)) {
      io.to(target).emit("signal", {
        from: socket.id,
        data
      });
    }
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    sendUsers();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Tetris server started on port " + PORT);
});
