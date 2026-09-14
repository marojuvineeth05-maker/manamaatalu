const express=require("express");
const http=require("http");
const path=require("path");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);
const waiting=new Set(),partners=new Map();
app.use(express.static(__dirname));
function pair(){const u=[...waiting];while(u.length>=2){const a=u.shift(),b=u.shift();if(!io.sockets.sockets.has(a)||!io.sockets.sockets.has(b))continue;waiting.delete(a);waiting.delete(b);partners.set(a,b);partners.set(b,a);io.to(a).emit("matched",{partner:b});io.to(b).emit("matched",{partner:a});}}
io.on("connection",s=>{
s.on("joinQueue",()=>{if(partners.has(s.id))return;waiting.add(s.id);s.emit("searching");pair()});
s.on("signal",({to,data})=>{if(to&&io.sockets.sockets.has(to))io.to(to).emit("signal",{from:s.id,data})});
s.on("chat",m=>{const p=partners.get(s.id);if(p)io.to(p).emit("chat",String(m).slice(0,1000))});
s.on("next",()=>{const p=partners.get(s.id);partners.delete(s.id);if(p){partners.delete(p);io.to(p).emit("partnerLeft");waiting.add(p)}waiting.add(s.id);s.emit("searching");pair()});
s.on("disconnect",()=>{waiting.delete(s.id);const p=partners.get(s.id);partners.delete(s.id);if(p){partners.delete(p);io.to(p).emit("partnerLeft")}})});
server.listen(process.env.PORT||3000,()=>console.log("ManaMaatalu running"));