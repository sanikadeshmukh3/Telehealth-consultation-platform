import { useEffect, useState, useCallback } from "react";

const API_URL = import.meta.env.VITE_SERVER_URL || "";

function initials(name) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Consultations({ user, authToken, onJoin, refreshKey }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/consultations`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error("Failed to load consultations");
      setConsultations(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function peerFor(c) {
    return user.role === "provider" ? c.patient : c.provider;
  }

  const upcoming = consultations.filter((c) => c.status === "scheduled" || c.status === "in_progress");
  const past = consultations.filter((c) => c.status === "completed" || c.status === "cancelled");

  function renderList(list, { showOutcome }) {
    return (
      <ul className="visits-list">
        {list.map((c) => {
          const peer = peerFor(c);
          return (
            <li key={c._id} className="visit-item">
              <div className={`visit-avatar visit-avatar--${user.role === "provider" ? "patient" : "provider"}`}>
                {peer ? initials(peer.name) : "?"}
              </div>
              <div className="visit-body">
                <div className="visit-top">
                  <span className="visit-name">{peer?.name || "Unknown"}</span>
                  <span className="visit-date">{formatDateTime(c.scheduledFor)}</span>
                </div>
                <p className="visit-outcome">
                  {showOutcome ? c.outcome || "No summary yet." : c.reasonForVisit || "No reason given."}
                </p>
                <div className="visit-bottom">
                  <span className={`note-status note-status--${(showOutcome ? c.noteStatus : c.status) || "scheduled"}`}>
                    {(showOutcome ? c.noteStatus || "no note" : c.status).replace("_", " ")}
                  </span>
                  <button
                    className={`btn btn-sm ${showOutcome ? "btn-ghost" : "btn-primary"}`}
                    onClick={() => onJoin(c)}
                  >
                    {showOutcome ? "Reopen" : "Join"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <div className="panel visits-panel">
        <div className="visits-header">
          <h2>Upcoming</h2>
        </div>
        {loading && <p className="visits-empty">Loading…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && upcoming.length === 0 && (
          <p className="visits-empty">Nothing scheduled yet.</p>
        )}
        {!loading && !error && upcoming.length > 0 && renderList(upcoming, { showOutcome: false })}
      </div>

      <div className="panel visits-panel mt-1">
        <div className="visits-header">
          <h2>Past visits</h2>
        </div>
        {!loading && !error && past.length === 0 && (
          <p className="visits-empty">Your past consultations will show up here.</p>
        )}
        {!loading && !error && past.length > 0 && renderList(past, { showOutcome: true })}
      </div>
    </>
  );
}