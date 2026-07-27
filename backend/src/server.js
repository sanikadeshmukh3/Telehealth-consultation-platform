import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Simple health check so we can confirm the server is alive before wiring up
// anything more complex (routes, sockets, DB).
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- HTTP + Socket.io share the same server instance ---
// We need this (rather than app.listen) because Socket.io needs direct
// access to the underlying HTTP server to attach WebSocket connections.
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

// Placeholder — this is where WebRTC signaling logic will be registered
// once we build step 3. Kept separate so server.js doesn't get bloated.
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();