import { createContext, useContext, useState } from "react";

const API_URL = import.meta.env.VITE_SERVER_URL || "";

const AuthContext = createContext(null);

// Centralizes login/register/logout and holds the current user + token,
// so any component in the tree can access auth state without prop-drilling
// (this is what replaces manually pasting a JWT into a text field).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function register({ name, email, password, role, specialty, licenseNumber }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, specialty, licenseNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setUser(data.user);
      setToken(data.token);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function login({ email, password }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setUser(data.user);
      setToken(data.token);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, error, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}