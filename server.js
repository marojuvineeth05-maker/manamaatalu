const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const videoWaiting = new Set();
const textWaiting = new Set();
const partners = new Map();
const modes = new Map();

let onlineUsers = 0;

app.use(express.static(__dirname));

function pair(queue) {
  const users = [...queue];

  while (users.length >= 2) {
    const a = users.shift();
    const b = users.shift();

    if (!io.sockets.sockets.has(a) || !io.sockets.sockets.has(b)) {
      continue;
    }

    queue.delete(a);
    queue.delete(b);

    partners.set(a, b);
    partners.set(b, a);

    io.to(a).emit("matched", { partner: b });
    io.to(b).emit("matched", { partner: a });
  }
}

function sendOnlineCount() {
  io.emit("onlineCount", onlineUsers);
}

io.on("connection", (s) => {

  onlineUsers++;
  sendOnlineCount();

  s.on("joinQueue", ({ mode }) => {

    if (partners.has(s.id)) return;

    modes.set(s.id, mode);

    if (mode === "video") {
      videoWaiting.add(s.id);
      s.emit("searching");
      pair(videoWaiting);
    }

    if (mode === "text") {
      textWaiting.add(s.id);
      s.emit("searching");
      pair(textWaiting);
    }
  });


  s.on("signal", ({ to, data }) => {

    if (to && io.sockets.sockets.has(to)) {

      io.to(to).emit("signal", {
        from: s.id,
        data
      });

    }
  });


  s.on("chat", (message) => {

    const partner = partners.get(s.id);

    if (partner) {

      io.to(partner).emit(
        "chat",
        String(message).slice(0, 1000)
      );

    }
  });


  s.on("next", ({ mode }) => {

    const partner = partners.get(s.id);

    partners.delete(s.id);

    if (partner) {

      partners.delete(partner);

      io.to(partner).emit("partnerLeft");

      const partnerMode = modes.get(partner);

      if (partnerMode === "video") {
        videoWaiting.add(partner);
      }

      if (partnerMode === "text") {
        textWaiting.add(partner);
      }
    }

    if (mode === "video") {

      videoWaiting.add(s.id);
      s.emit("searching");
      pair(videoWaiting);

    }

    if (mode === "text") {

      textWaiting.add(s.id);
      s.emit("searching");
      pair(textWaiting);

    }
  });


  s.on("disconnect", () => {

    videoWaiting.delete(s.id);
    textWaiting.delete(s.id);

    const partner = partners.get(s.id);

    partners.delete(s.id);
    modes.delete(s.id);

    if (partner) {

      partners.delete(partner);

      io.to(partner).emit("partnerLeft");

    }

    onlineUsers = Math.max(0, onlineUsers - 1);

    sendOnlineCount();
  });

});

server.listen(process.env.PORT || 3000, () => {
  console.log("ManaMaatalu running");
});
