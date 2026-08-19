import { useWebRTCCall } from "../hooks/useWebRTCCall";

export default function VideoCall({ roomId, userId, onHangUp }) {
  const { localVideoRef, remoteVideoRef, connectionState, error, hangUp } =
    useWebRTCCall({ roomId, userId });

  function handleHangUp() {
    hangUp();
    onHangUp?.();
  }

  return (
    <div className="video-card">
      <p>
        Status: <strong>{connectionState}</strong> — Room: <code>{roomId}</code>
      </p>

      {error && (
        <p className="error">Error: {error}</p>
      )}

      <div className="video-grid">
        <div>
          <p>You</p>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
        <div>
          <p>Remote peer</p>
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
      </div>

      <div className="mt-1">
        <button className="button" onClick={handleHangUp}>
          Hang up
        </button>
      </div>
    </div>
  );
}