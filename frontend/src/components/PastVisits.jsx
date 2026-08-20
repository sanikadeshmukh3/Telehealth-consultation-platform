// Placeholder data until a real endpoint exists (e.g. GET /api/consultations
// for the logged-in user). Shape mirrors what that response will likely
// look like: roomId, the other participant, when it happened, and a
// one-line outcome pulled from the note's finalSOAP/plan once available.
const MOCK_VISITS = [
  {
    roomId: "room-4f2a",
    peerName: "Dr. Amara Osei",
    peerRole: "provider",
    date: "Aug 12",
    status: "approved",
    outcome: "Started a 5-day course of amoxicillin for strep throat.",
  },
  {
    roomId: "room-91cd",
    peerName: "Marcus Webb",
    peerRole: "patient",
    date: "Aug 8",
    status: "approved",
    outcome: "Follow-up scheduled to check blood pressure in 2 weeks.",
  },
  {
    roomId: "room-2b7e",
    peerName: "Dr. Priya Nair",
    peerRole: "provider",
    date: "Jul 29",
    status: "draft",
    outcome: "Note still awaiting sign-off.",
  },
];

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PastVisits({ onSelect }) {
  return (
    <div className="panel visits-panel">
      <div className="visits-header">
        <h2>Recent visits</h2>
        <span className="placeholder-tag">Sample data</span>
      </div>

      {MOCK_VISITS.length === 0 ? (
        <p className="visits-empty">Your past consultations will show up here.</p>
      ) : (
        <ul className="visits-list">
          {MOCK_VISITS.map((visit) => (
            <li key={visit.roomId} className="visit-item">
              <div className={`visit-avatar visit-avatar--${visit.peerRole}`}>
                {initials(visit.peerName)}
              </div>
              <div className="visit-body">
                <div className="visit-top">
                  <span className="visit-name">{visit.peerName}</span>
                  <span className="visit-date">{visit.date}</span>
                </div>
                <p className="visit-outcome">{visit.outcome}</p>
                <div className="visit-bottom">
                  <span className={`note-status note-status--${visit.status}`}>
                    {visit.status}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onSelect(visit.roomId)}
                  >
                    Reopen room
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}