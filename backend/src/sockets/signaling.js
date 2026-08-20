/**
 * WebRTC signaling via Socket.io.
 *
 * This module does NOT handle any audio/video itself — it only relays the
 * handshake messages (offer, answer, ICE candidates) between two browsers
 * so they can establish a direct peer-to-peer connection. Once that
 * connection is up, media flows directly between the browsers, not through
 * this server.
 *
 * Flow for a 2-person call:
 *   1. Both peers call socket.emit("join-room", { roomId })
 *   2. When the second peer joins, the server tells them who's already there
 *   3. The existing peer creates an SDP "offer" and sends it via "offer"
 *   4. The new peer responds with an "answer"
 *   5. Both sides exchange "ice-candidate" events as they discover network paths
 */
export function registerSignalingHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, userId }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;

      // Tell everyone else already in the room that a new peer arrived,
      // so the existing peer knows to initiate the offer.
      socket.to(roomId).emit("peer-joined", { socketId: socket.id, userId });

      console.log(`Socket ${socket.id} (user ${userId}) joined room ${roomId}`);
      // Also log current sockets in room for debugging
      const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      console.log(`Room ${roomId} has sockets:`, clients);
    });

    // Relay an SDP offer to a specific peer (not broadcast to the whole
    // room) — targeted by socketId so it goes only to the intended peer.
    socket.on("offer", ({ targetSocketId, sdp }) => {
      io.to(targetSocketId).emit("offer", { sdp, fromSocketId: socket.id });
    });

    socket.on("answer", ({ targetSocketId, sdp }) => {
      io.to(targetSocketId).emit("answer", { sdp, fromSocketId: socket.id });
    });

    socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("ice-candidate", {
        candidate,
        fromSocketId: socket.id,
      });
    });

    // Lets the frontend show "call ended" / clean up media when either
    // side deliberately hangs up, rather than only relying on disconnect.
    socket.on("hang-up", ({ roomId }) => {
      socket.to(roomId).emit("peer-left", { socketId: socket.id });
    });

    socket.on("disconnect", () => {
      const { roomId } = socket.data;
      if (roomId) {
        socket.to(roomId).emit("peer-left", { socketId: socket.id });
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}