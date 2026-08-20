import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthForm from "./components/AuthForm";
import VideoCall from "./components/VideoCall";
import NoteReview from "./components/NoteReview";
import PastVisits from "./components/PastVisits";

function BlobIllustration() {
  // Two overlapping figures (patient + provider) inside the signature
  // "care blob" shape — abstract by design, no real photography or
  // identifiable likeness involved.
  return (
    <svg className="blob-illustration" viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M280 120Q300 200 230 250Q160 300 90 260Q20 220 30 140Q40 60 120 30Q200 0 250 50Q290 90 280 120Z"
        fill="#164C40"
        opacity="0.55"
      />
      <circle cx="120" cy="150" r="46" fill="#D9F0E1" />
      <circle cx="108" cy="140" r="4.5" fill="#164C40" />
      <circle cx="132" cy="140" r="4.5" fill="#164C40" />
      <path d="M104 162Q120 174 136 162" stroke="#164C40" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="195" cy="115" r="38" fill="#FFB627" />
      <circle cx="185" cy="107" r="4" fill="#164C40" />
      <circle cx="205" cy="107" r="4" fill="#164C40" />
      <path d="M182 126Q195 136 208 126" stroke="#164C40" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path
        d="M150 205Q170 190 195 205Q210 214 195 228Q170 245 150 228Q135 216 150 205Z"
        fill="#FF6B57"
      />
    </svg>
  );
}

function CareFigures() {
  return (
    <svg className="care-figures" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="55" r="34" fill="#D9F0E1" />
      <circle cx="50" cy="95" r="40" fill="#FFB627" opacity="0.9" />
      <path
        d="M62 130Q75 118 90 130"
        stroke="#1F6F5C"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

function AppContent() {
  const { user, token, logout } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  // Hanging up (or leaving) should fully return to the home screen, not
  // just toggle the "joined" flag — clearing roomId too so the next visit
  // starts from a clean slate rather than re-showing the last room code.
  function returnHome() {
    setJoined(false);
    setRoomId("");
  }

  if (!user) {
    return (
      <div className="landing">
        <div className="landing-aside">
          <h1>You're not alone in this visit.</h1>
          <p className="tagline">
            A calmer way to see your care team — video, live notes, and a
            record you both can trust.
          </p>
          <BlobIllustration />
          <div className="trust-row">
            <span>End-to-end video</span>
            <span>Private by default</span>
          </div>
        </div>
        <div className="landing-main">
          <AuthForm />
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="brand">
            <span className="brand-dot" />
            Telehealth
          </div>
          <div className="user-chip">
            <span>
              <strong>{user.name}</strong> <span className="role-tag">{user.role}</span>
            </span>
            <button className="btn btn-quiet" onClick={returnHome}>
              Leave room
            </button>
          </div>
        </div>

        <div className="stage-wrap">
          <div className="stage">
            <div className="card video-card">
              <VideoCall roomId={roomId} userId={user._id} onHangUp={returnHome} />
            </div>
            {/* Only providers see the review/approve panel */}
            {user.role === "provider" && (
              <NoteReview roomId={roomId} authToken={token} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Telehealth
        </div>
        <div className="user-chip">
          <span>
            <strong>{user.name}</strong> <span className="role-tag">{user.role}</span>
          </span>
          <button className="btn btn-quiet" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="home-wrap">
        <div className="home-hero">
          <span className="eyebrow">Ready when you are</span>
          <h2>Join a consultation</h2>
          <p className="lead">
            Enter the room code your patient or provider shared with you to
            start the video visit.
          </p>
          <div className="join-row">
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. test-room-1"
            />
            <button
              className="btn btn-primary"
              onClick={() => roomId && setJoined(true)}
            >
              Join call
            </button>
          </div>
          <CareFigures />
        </div>

        <PastVisits onSelect={(id) => setRoomId(id)} />
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