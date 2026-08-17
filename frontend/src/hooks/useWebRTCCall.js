import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5173";

// Public STUN server from Google — used so browsers behind NAT can discover
// their public-facing address. For a real deployment you'd typically also
// run/pay for a TURN server (relays media when a direct P2P connection isn't
// possible, e.g. restrictive corporate firewalls), but STUN alone is enough
// for local development and most home networks.
const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * Manages a single WebRTC call within a given room.
 *
 * Returns refs for local/remote <video> elements to attach directly in JSX,
 * plus connection state and a hangUp function.
 */
export function useWebRTCCall({ roomId, userId }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteSocketIdRef = useRef(null);

  const [connectionState, setConnectionState] = useState("idle"); // idle | connecting | connected | disconnected

  useEffect(() => {
    if (!roomId) return;

    let localStream;

    async function setup() {
      // 1. Get local camera/mic access.
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // 2. Connect to the signaling server and join the room.
      const socket = io(SOCKET_URL);
      socketRef.current = socket;
      socket.emit("join-room", { roomId, userId });
      setConnectionState("connecting");

      // 3. Create the RTCPeerConnection and attach our local tracks so
      // they get sent to whoever we connect to.
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      // When the remote peer's media arrives, attach it to the remote video element.
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setConnectionState("connected");
      };

      // As ICE discovers candidate network paths, send each one to the peer.
      pc.onicecandidate = (event) => {
        if (event.candidate && remoteSocketIdRef.current) {
          socket.emit("ice-candidate", {
            targetSocketId: remoteSocketIdRef.current,
            candidate: event.candidate,
          });
        }
      };

      // --- Signaling event handlers ---

      // Fired on the peer who was already in the room when a second peer
      // joins. That existing peer is responsible for creating the offer.
      socket.on("peer-joined", async ({ socketId }) => {
        remoteSocketIdRef.current = socketId;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { targetSocketId: socketId, sdp: offer });
      });

      // Fired on the peer who joined second, receiving the first peer's offer.
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
    }

    setup();

    // Cleanup when the component unmounts or roomId changes: stop media
    // tracks, close the peer connection, and disconnect the socket so we
    // don't leak camera/mic access or open connections.
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
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

  return { localVideoRef, remoteVideoRef, connectionState, hangUp };
}