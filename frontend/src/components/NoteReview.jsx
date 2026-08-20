import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "";
const API_URL = import.meta.env.VITE_SERVER_URL || "";

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
    <div className="panel note-review">
      <div className="note-header">
        <h2>Consultation note</h2>
        <span className={`note-status note-status--${status}`}>
          {status} · rev {revisionCount}
        </span>
      </div>

      {agentFlags.length > 0 && (
        <div className="flags-callout">
          <strong>Needs your attention</strong>
          <ul>
            {agentFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {["subjective", "objective", "assessment", "plan"].map((field) => (
        <div className="soap-field" key={field}>
          <label>{field}</label>
          <textarea
            value={draftSOAP[field]}
            onChange={(e) => updateField(field, e.target.value)}
            disabled={status === "approved"}
            rows={3}
            placeholder="Nothing captured yet"
          />
        </div>
      ))}

      {actionItems.length > 0 && (
        <div className="action-items">
          <strong>Action items</strong>
          <ul>
            {actionItems.map((item, i) => (
              <li key={i}>
                <span className="action-type">{item.type.replace("_", " ")}</span>
                {item.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button
        className="btn btn-primary btn-full mt-1"
        onClick={handleApprove}
        disabled={saving || status === "approved"}
      >
        {status === "approved" ? "Approved" : saving ? "Saving…" : "Approve & sign note"}
      </button>
    </div>
  );
}