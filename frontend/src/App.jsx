import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthForm from "./components/AuthForm";
import VideoCall from "./components/VideoCall";
import NoteReview from "./components/NoteReview";

function AppContent() {
  const { user, token, logout } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  if (!user) {
    return <AuthForm />;
  }

  if (joined) {
    return (
      <div className="app-wrapper">
        <div className="topbar">
          <div className="muted">Logged in as <strong>{user.name}</strong> ({user.role})</div>
          <div>
            <button className="button" onClick={() => setJoined(false)}>
              Leave room
            </button>
          </div>
        </div>

        <div className="container">
          <div className="card video-panel">
            <VideoCall roomId={roomId} userId={user._id} onHangUp={() => setJoined(false)} />
          </div>
          {/* Only providers see the review/approve panel */}
          {user.role === "provider" && (
            <div className="card panel">
              <NoteReview roomId={roomId} authToken={token} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="topbar">
        <h1>Telehealth</h1>
        <div className="muted">{user.name} ({user.role}) — <button onClick={logout}>Log out</button></div>
      </div>

      <div className="container">
        <div className="card auth-card">
          <p>Enter a room ID to join or start a consultation.</p>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="e.g. test-room-1"
          />
          <div className="actions">
            <button className="button" onClick={() => roomId && setJoined(true)}>
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}