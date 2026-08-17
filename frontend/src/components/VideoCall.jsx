import { useWebRTCCall } from "../hooks/useWebRTCCall";

export default function VideoCall({ roomId, userId, onHangUp }) {
  const { localVideoRef, remoteVideoRef, connectionState, error, hangUp } =
    useWebRTCCall({ roomId, userId });

  function handleHangUp() {
    hangUp();
    onHangUp?.();
  }

  return (
    <div style={{ padding: "1rem" }}>
      <p>
        Status: <strong>{connectionState}</strong> — Room: <code>{roomId}</code>
      </p>

      {error && (
        <p style={{ color: "red", maxWidth: "500px" }}>
          Error: {error}
        </p>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <div>
          <p>You</p>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "320px", background: "#000", borderRadius: "8px" }}
          />
        </div>
        <div>
          <p>Remote peer</p>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "320px", background: "#000", borderRadius: "8px" }}
          />
        </div>
      </div>

      <button onClick={handleHangUp} style={{ marginTop: "1rem" }}>
        Hang up
      </button>
    </div>
  );
}