import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "";
const API_URL = import.meta.env.VITE_SERVER_URL || "";

export default function NoteReview({ roomId, consultationId, authToken }) {
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

  useEffect(() => {
    const socket = io(SOCKET_URL);

    // This socket needs to actually join the room to receive "note-updated"
    // broadcasts (io.to(roomId).emit(...) only reaches sockets that have
    // joined that room) — previously missing, so live updates never arrived.
    socket.emit("watch-notes", { roomId });

    socket.on("note-updated", (data) => {
      setDraftSOAP(data.draftSOAP);
      setActionItems(data.actionItems);
      setAgentFlags(data.agentFlags);
      setRevisionCount(data.revisionCount);
    });

    return () => socket.disconnect();
  }, [roomId]);

  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch(`${API_URL}/api/notes/${consultationId}`, {
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
  }, [consultationId, authToken]);

  function updateField(field, value) {
    setDraftSOAP((prev) => ({ ...prev, [field]: value }));
  }

  async function handleApprove() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/notes/${consultationId}/approve`, {
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