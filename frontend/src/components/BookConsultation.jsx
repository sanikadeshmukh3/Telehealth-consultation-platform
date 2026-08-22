import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_SERVER_URL || "";

export default function BookConsultation({ authToken, onBooked }) {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    async function loadPatients() {
      try {
        const res = await fetch(`${API_URL}/api/users/patients`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error("Failed to load patients");
        setPatients(await res.json());
      } catch (err) {
        setError(err.message);
      }
    }
    loadPatients();
  }, [open, authToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/consultations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ patientId, scheduledFor, reasonForVisit }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Booking failed");
      }
      setOpen(false);
      setPatientId("");
      setScheduledFor("");
      setReasonForVisit("");
      onBooked?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary book-toggle" onClick={() => setOpen(true)}>
        New consultation
      </button>
    );
  }

  return (
    <form className="panel book-form" onSubmit={handleSubmit}>
      <h3>Schedule a visit</h3>

      <div className="field">
        <label>Patient</label>
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
          <option value="">Select a patient…</option>
          {patients.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} ({p.email})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Date & time</label>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Reason for visit</label>
        <input
          value={reasonForVisit}
          onChange={(e) => setReasonForVisit(e.target.value)}
          placeholder="e.g. Follow-up on blood pressure"
        />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Booking…" : "Book visit"}
        </button>
      </div>
    </form>
  );
}