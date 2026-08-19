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
    <div className="card auth-card">
      <h2>{mode === "login" ? "Log in" : "Sign up"}</h2>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <div>
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <label>I am a</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="patient">Patient</option>
                <option value="provider">Provider</option>
              </select>
            </div>

            {role === "provider" && (
              <>
                <div>
                  <label>Specialty</label>
                  <input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>
                <div>
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

        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
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

        <button className="button full-width" type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <p className="mt-1">
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