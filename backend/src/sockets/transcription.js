import { createLiveTranscriptionConnection } from "../services/deepgramService.js";
import TranscriptChunk from "../models/TranscriptChunk.js";
import { updateDraftNote } from "../agents/documentationAgent.js";

const roomStartTimes = new Map();
const roomAgentTimers = new Map(); // roomId -> { interval, count }

function startAgentLoopForRoom(io, roomId, consultationId) {
  const existing = roomAgentTimers.get(roomId);
  if (existing) {
    existing.count += 1;
    return;
  }

  const interval = setInterval(async () => {
    try {
      const note = await updateDraftNote(consultationId);
      if (note) {
        io.to(roomId).emit("note-updated", {
          draftSOAP: note.draftSOAP,
          actionItems: note.actionItems,
          agentFlags: note.agentFlags,
          revisionCount: note.revisionCount,
        });
        console.log(`Agent updated note for room ${roomId} (revision ${note.revisionCount})`);
      }
    } catch (err) {
      console.error(`Agent update failed for room ${roomId}:`, err);
    }
  }, 30000);

  roomAgentTimers.set(roomId, { interval, count: 1 });
}

function stopAgentLoopForRoom(roomId) {
  const existing = roomAgentTimers.get(roomId);
  if (!existing) return;

  existing.count -= 1;
  if (existing.count <= 0) {
    clearInterval(existing.interval);
    roomAgentTimers.delete(roomId);
  }
}

export function registerTranscriptionHandlers(io) {
  io.on("connection", (socket) => {
    let deepgramConnection = null;
    let currentConsultationId = null;
    let currentSpeaker = null;
    let currentRoomId = null;

    socket.on("start-transcription", ({ consultationId, roomId, speaker }) => {
      currentConsultationId = consultationId;
      currentSpeaker = speaker;
      currentRoomId = roomId;

      if (!roomStartTimes.has(roomId)) {
        roomStartTimes.set(roomId, Date.now());
      }

      startAgentLoopForRoom(io, roomId, consultationId);

      deepgramConnection = createLiveTranscriptionConnection({
        onTranscript: async ({ text, isFinal }) => {
          socket.emit("transcript-interim", { text, speaker: currentSpeaker });
          if (!isFinal) return;

          const offsetSeconds = Math.round(
            (Date.now() - roomStartTimes.get(currentRoomId)) / 1000
          );

          try {
            const chunk = await TranscriptChunk.create({
              consultation: currentConsultationId,
              speaker: currentSpeaker,
              text,
              offsetSeconds,
            });

            console.log(`Saved transcript chunk: "${text}" (${offsetSeconds}s)`);

            io.to(currentRoomId).emit("transcript-final", {
              speaker: currentSpeaker,
              text,
              offsetSeconds,
              chunkId: chunk._id,
            });
          } catch (err) {
            console.error("Failed to save transcript chunk:", err);
          }
        },
        onError: (err) => {
          socket.emit("transcription-error", { message: err.message });
        },
      });
    });

    socket.on("audio-chunk", (chunk) => {
      if (deepgramConnection) {
        deepgramConnection.send(chunk);
      }
    });

    socket.on("stop-transcription", () => {
      deepgramConnection?.finish();
      deepgramConnection = null;
      if (currentRoomId) stopAgentLoopForRoom(currentRoomId);
    });

    socket.on("disconnect", () => {
      deepgramConnection?.finish();
      if (currentRoomId) stopAgentLoopForRoom(currentRoomId);
    });
  });
}