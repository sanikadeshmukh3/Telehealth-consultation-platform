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

        mediaRecorder.ondataavailable = (event) => {
          console.log("Audio chunk captured:", event.data.size, "bytes");
          if (event.data.size > 0) {
            socket.emit("audio-chunk", event.data);
          }
        };

        // Fires every 250ms — small enough for near-real-time transcription
        // without flooding the socket connection.
        mediaRecorder.start(250);

        socket.emit("start-transcription", {
          consultationId: roomId, // using roomId as a stand-in until real consultation booking is wired up
          roomId,
          speaker: "patient", // hardcoded for now — will come from logged-in user's role later
        });

        setConnectionState("connecting");

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;
        localStream
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStream));

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
          remoteSocketIdRef.current = socketId;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { targetSocketId: socketId, sdp: offer });
        });

        socket.on("offer", async ({ sdp, fromSocketId }) => {
          remoteSocketIdRef.current = fromSocketId;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { targetSocketId: fromSocketId, sdp: answer });
        });

        socket.on("answer", async ({ sdp }) => {
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
      } catch (err) {
        console.error("WebRTC setup failed:", err);
        setError(err.message);
        setConnectionState("error");
      }
    }

    setup();

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      mediaRecorder?.stop();
      peerConnectionRef.current?.close();
      socketRef.current?.emit("hang-up", { roomId });
      socketRef.current?.disconnect();
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
