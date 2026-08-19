import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

// Sits alongside the video call and shows the agent's live-updating draft
// note. A provider can edit the fields before approving — their edits
// become finalSOAP, distinct from the agent's original draftSOAP, so
// there's always a record of what the AI produced vs. what was signed off.
export default function NoteReview({ roomId, authToken }) {
  const [draftSOAP, setDraftSOAP] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [actionItems, setActionItems] = useState([]);
  const [agentFlags, setAgentFlags] = useState([]);
  const [revisionCount, setRevisionCount] = useState(0);
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Listen for live updates from the agent as it revises the note during
  // the call — this is a SEPARATE socket connection from the video call's,
  // since this component may be mounted independently (e.g. a provider
  // reviewing after the call ended, on a different page).
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("note-updated", (data) => {
      setDraftSOAP(data.draftSOAP);
      setActionItems(data.actionItems);
      setAgentFlags(data.agentFlags);
      setRevisionCount(data.revisionCount);
    });

    return () => socket.disconnect();
  }, [roomId]);

  // Load any existing note on mount (covers the case where the agent
  // already produced revisions before this panel was opened).
  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch(`${API_URL}/api/notes/${roomId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const note = await res.json();
          setDraftSOAP(note.draftSOAP);
          setActionItems(note.actionItems);
          setAgentFlags(note.agentFlags);
          setRevisionCount(note.revisionCount);
          setStatus(note.status);
        }
      } catch (err) {
        console.error("Failed to load existing note:", err);
      }
    }
    loadExisting();
  }, [roomId, authToken]);

  function updateField(field, value) {
    setDraftSOAP((prev) => ({ ...prev, [field]: value }));
  }

  async function handleApprove() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/notes/${roomId}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ finalSOAP: draftSOAP, actionItems }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Approval failed");
      }
      setStatus("approved");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card panel">
      <h2>
        Consultation Note{" "}
        <span style={{ fontSize: "0.8rem", color: status === "approved" ? "green" : "#888" }}>
          ({status}, revision {revisionCount})
        </span>
      </h2>

      {agentFlags.length > 0 && (
        <div style={{ background: "#fff3cd", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
          <strong>Needs your attention:</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            {agentFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {["subjective", "objective", "assessment", "plan"].map((field) => (
        <div key={field}>
          <label style={{ display: "block", fontWeight: "bold", textTransform: "capitalize" }}>
            {field}
          </label>
          <textarea
            value={draftSOAP[field]}
            onChange={(e) => updateField(field, e.target.value)}
            disabled={status === "approved"}
            rows={3}
          />
        </div>
      ))}

      {actionItems.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <strong>Action items:</strong>
          <ul>
            {actionItems.map((item, i) => (
              <li key={i}>
                <em>{item.type}</em>: {item.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button className="button" onClick={handleApprove} disabled={saving || status === "approved"}>
        {status === "approved" ? "Approved" : saving ? "Saving..." : "Approve & Sign Note"}
      </button>
    </div>
  );
}