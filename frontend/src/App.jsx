import { useState } from "react";
import VideoCall from "./components/VideoCall";

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [userId] = useState(() => Math.random().toString(36).slice(2, 8));

  if (joined) {
    return (
      <VideoCall
        roomId={roomId}
        userId={userId}
        onHangUp={() => setJoined(false)}
      />
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Telehealth — WebRTC test</h1>
      <p>
        Enter any room ID, then open this same page in a second browser tab
        (or incognito window) and enter the <em>same</em> room ID to test a
        call between two peers.
      </p>
      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="e.g. test-room-1"
      />
      <button onClick={() => roomId && setJoined(true)} style={{ marginLeft: "0.5rem" }}>
        Join
      </button>
    </div>
  );
}