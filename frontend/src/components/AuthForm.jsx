import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// Single component handling both login and signup, toggled by a link —
// avoids duplicating the form scaffolding across two separate components.
export default function AuthForm() {
  const { login, register, error, loading } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("patient");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === "login") {
      await login({ email, password });
    } else {
      await register({ name, email, password, role, specialty, licenseNumber });
    }
  }

  return (
    <div className="auth-card">
      <h2>{mode === "login" ? "Welcome back" : "Let's get you set up"}</h2>
      <span className="subhead">
        {mode === "login"
          ? "Log in to join your next visit."
          : "Takes about a minute."}
      </span>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="field">
              <label>I am a</label>
              <div className="role-picker">
                <div
                  className={`role-option ${role === "patient" ? "active" : ""}`}
                  onClick={() => setRole("patient")}
                >
                  Patient
                </div>
                <div
                  className={`role-option ${role === "provider" ? "active" : ""}`}
                  onClick={() => setRole("provider")}
                >
                  Provider
                </div>
              </div>
            </div>

            {role === "provider" && (
              <>
                <div className="field">
                  <label>Specialty</label>
                  <input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>License number</label>
                  <input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
              </>
            )}
          </>
        )}

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <p className="switch-row">
        {mode === "login" ? (
          <>
            No account?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); }}>
              Sign up
            </a>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); }}>
              Log in
            </a>
          </>
        )}
      </p>
    </div>
  );
}