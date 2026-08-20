import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTCCall({ roomId, userId }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteSocketIdRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const [connectionState, setConnectionState] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) return;

    let localStream;

    async function setup() {
      try {
        // getUserMedia requires a "secure context" — HTTPS, or localhost.
        // On plain http://<network-ip>, this call will reject.
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access unavailable — this page must be served over HTTPS or localhost.",
          );
        }

        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        const socket = io(SOCKET_URL);
        socketRef.current = socket;
        socket.emit("join-room", { roomId, userId });

        // --- Audio capture for transcription ---
        // Captures ONLY this participant's own mic audio (not the peer's) and
        // streams it to the backend for Deepgram. Runs independently of the
        // WebRTC peer connection itself.
        const audioOnlyStream = new MediaStream(localStream.getAudioTracks());
        const mediaRecorder = new MediaRecorder(audioOnlyStream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          console.log("Audio chunk captured:", event.data.size, "bytes");
          if (event.data.size > 0) {
            socket.emit("audio-chunk", event.data);
          }
        };

        // Defer starting the recorder until the server confirms Deepgram is
        // ready to receive audio. This avoids sending chunks before the
        // live connection is established and prevents early-close behavior.
        let recorderStarted = false;
        function startRecorder() {
          if (!recorderStarted) {
            try {
              mediaRecorder.start(250);
              recorderStarted = true;
            } catch (err) {
              console.warn("Failed to start media recorder:", err);
            }
          }
        }

        // Listen for the server ack that Deepgram is ready.
        socket.on("transcription-ready", () => startRecorder());

        // Fallback: if we don't get an ack within 2s, start anyway.
        const startFallback = setTimeout(() => startRecorder(), 2000);

        socket.emit("start-transcription", {
          consultationId: roomId, // using roomId as a stand-in until real consultation booking is wired up
          roomId,
          speaker: "patient", // hardcoded for now — will come from logged-in user's role later
        });

        // Clear fallback when leaving.
        const clearStartFallback = () => clearTimeout(startFallback);

        setConnectionState("connecting");

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;
        localStream
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStream));

        console.log("Created RTCPeerConnection and added local tracks");

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setConnectionState("connected");
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && remoteSocketIdRef.current) {
            socket.emit("ice-candidate", {
              targetSocketId: remoteSocketIdRef.current,
              candidate: event.candidate,
            });
          }
        };

        socket.on("peer-joined", async ({ socketId }) => {
          console.log("peer-joined:", socketId);
          remoteSocketIdRef.current = socketId;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { targetSocketId: socketId, sdp: offer });
          console.log("Sent offer to", socketId);
        });

        socket.on("offer", async ({ sdp, fromSocketId }) => {
          console.log("Received offer from", fromSocketId);
          remoteSocketIdRef.current = fromSocketId;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { targetSocketId: fromSocketId, sdp: answer });
          console.log("Sent answer to", fromSocketId);
        });

        socket.on("answer", async ({ sdp }) => {
          console.log("Received answer");
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on("ice-candidate", async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add ICE candidate:", err);
          }
        });

        socket.on("peer-left", () => {
          setConnectionState("disconnected");
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });
        // ensure fallback cleanup hook is removed when socket disconnects
        socket.on("disconnect", () => {
          try { clearStartFallback(); } catch (e) {}
        });
      } catch (err) {
        console.error("WebRTC setup failed:", err);
        setError(err.message);
        setConnectionState("error");
      }
    }

    setup();

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      peerConnectionRef.current?.close();
      socketRef.current?.emit("hang-up", { roomId });
      socketRef.current?.disconnect();
      try { clearStartFallback(); } catch (e) {}
    };
  }, [roomId, userId]);

  function hangUp() {
    socketRef.current?.emit("hang-up", { roomId });
    socketRef.current?.disconnect();
    peerConnectionRef.current?.close();
    setConnectionState("disconnected");
  }

  return { localVideoRef, remoteVideoRef, connectionState, error, hangUp };
}