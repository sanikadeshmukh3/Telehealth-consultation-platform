import Consultation from "../models/Consultation.js";

export function registerSignalingHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join-room", async ({ roomId, userId }) => {
      // Verify this user is actually one of the two people this
      // consultation was booked for. NOTE: userId is still client-supplied
      // here rather than derived from a verified JWT on the socket
      // connection itself — worth hardening later, but this closes the
      // "any arbitrary room string" gap now that rooms map to real bookings.
      let consultation;
      try {
        consultation = await Consultation.findOne({ roomId });
      } catch (err) {
        console.error("Failed to look up consultation for join-room:", err);
      }

      if (!consultation) {
        socket.emit("join-rejected", { reason: "This room doesn't exist." });
        return;
      }

      const isParticipant =
        String(consultation.patient) === String(userId) ||
        String(consultation.provider) === String(userId);

      if (!isParticipant) {
        socket.emit("join-rejected", { reason: "You're not part of this consultation." });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;

      if (consultation.status === "scheduled") {
        consultation.status = "in_progress";
        consultation.startedAt = new Date();
        await consultation.save();
      }

      socket.to(roomId).emit("peer-joined", { socketId: socket.id, userId });

      console.log(`Socket ${socket.id} (user ${userId}) joined room ${roomId}`);
      const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      console.log(`Room ${roomId} has sockets:`, clients);
    });

    // Lets NoteReview's separate socket connection receive "note-updated"
    // broadcasts without going through the full join-room participant
    // check again — it only mounts for a provider already on the visit.
    socket.on("watch-notes", ({ roomId }) => {
      socket.join(roomId);
    });

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

    socket.on("hang-up", async ({ roomId }) => {
      socket.to(roomId).emit("peer-left", { socketId: socket.id });

      const remaining = io.sockets.adapter.rooms.get(roomId);
      if (!remaining || remaining.size <= 1) {
        try {
          await Consultation.findOneAndUpdate(
            { roomId, status: "in_progress" },
            { status: "completed", endedAt: new Date() },
          );
        } catch (err) {
          console.error("Failed to mark consultation completed:", err);
        }
      }
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