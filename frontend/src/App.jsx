import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthForm from "./components/AuthForm";
import VideoCall from "./components/VideoCall";
import NoteReview from "./components/NoteReview";
import Consultations from "./components/Consultations";
import BookConsultation from "./components/BookConsultation";

function BlobIllustration() {
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

function AppContent() {
  const { user, token, logout } = useAuth();
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function returnHome() {
    setActiveConsultation(null);
    setRefreshKey((k) => k + 1); // status may have changed (e.g. -> completed)
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

  if (activeConsultation) {
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
              <VideoCall
                roomId={activeConsultation.roomId}
                consultationId={activeConsultation._id}
                userId={user._id}
                speaker={user.role}
                onHangUp={returnHome}
              />
            </div>
            {user.role === "provider" && (
              <NoteReview
                roomId={activeConsultation.roomId}
                consultationId={activeConsultation._id}
                authToken={token}
              />
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
        <div className="home-grid">
          <div>
            {user.role === "provider" && (
              <BookConsultation authToken={token} onBooked={() => setRefreshKey((k) => k + 1)} />
            )}
            {user.role === "patient" && (
              <div className="home-hero">
                <span className="eyebrow">Ready when you are</span>
                <h2>Your visits</h2>
                <p className="lead">
                  Your provider will schedule visits here — join from the
                  Upcoming list when it's time.
                </p>
              </div>
            )}
          </div>

          <Consultations
            user={user}
            authToken={token}
            onJoin={setActiveConsultation}
            refreshKey={refreshKey}
          />
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