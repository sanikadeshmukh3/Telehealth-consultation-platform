import { useWebRTCCall } from "../hooks/useWebRTCCall";

const STATE_LABELS = {
  idle: "Getting ready…",
  connecting: "Waiting for the other side…",
  connected: "Connected",
  disconnected: "Call ended",
  error: "Something went wrong",
};

export default function VideoCall({ roomId, consultationId, userId, speaker,onHangUp }) {
  const { localVideoRef, remoteVideoRef, connectionState, error, hangUp } =
    useWebRTCCall({ roomId, consultationId, userId, speaker });

  function handleHangUp() {
    hangUp();
    onHangUp?.();
  }

  return (
    <div className="video-card">
      <div>
        <span className="status-pill" data-state={connectionState}>
          {STATE_LABELS[connectionState] ?? connectionState}
        </span>
        <code className="room-code">{roomId}</code>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="video-grid">
        <div className="video-tile">
          <p>You</p>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
        <div className="video-tile">
          <p>Remote peer</p>
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
      </div>

      <div className="mt-1 actions">
        <button className="btn btn-primary" onClick={handleHangUp}>
          Hang up
        </button>
      </div>
    </div>
  );
}