import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const GUEST_SESSION_KEY = 'restart_guest_session';
const USER_SESSION_KEY = 'restart_user_session';
const USER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const USERS_API = import.meta.env.VITE_USERS_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_USERS_API_KEY || 'changeme';

export const usersApi = {
  list: () =>
    fetch(`${USERS_API}/users`).then(r => r.json()),
  add: (email, role) =>
    fetch(`${USERS_API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ email, role }),
    }).then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e)); return r.json(); }),
  updateRole: (email, role) =>
    fetch(`${USERS_API}/users/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ role }),
    }).then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e)); return r.json(); }),
  remove: (email) =>
    fetch(`${USERS_API}/users/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_KEY}` },
    }).then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e)); return r.json(); }),
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      // Sesión de invitado (sessionStorage, vida corta)
      const savedGuest = sessionStorage.getItem(GUEST_SESSION_KEY);
      if (savedGuest) {
        const guest = JSON.parse(savedGuest);
        if (Date.now() < guest.expiresAt) return guest;
        sessionStorage.removeItem(GUEST_SESSION_KEY);
      }
      // Sesión de Google (localStorage, persiste recargas y reinicios del navegador)
      const savedUser = localStorage.getItem(USER_SESSION_KEY);
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (!u.expiresAt || Date.now() < u.expiresAt) return u;
        localStorage.removeItem(USER_SESSION_KEY);
      }
    } catch { /* ignore */ }
    return null;
  });

  // Persiste la sesión de Google para que sobreviva recargas.
  const persistGoogle = (u) => {
    const withExp = { ...u, expiresAt: Date.now() + USER_SESSION_TTL_MS };
    try { localStorage.setItem(USER_SESSION_KEY, JSON.stringify(withExp)); } catch { /* ignore */ }
    setUser(withExp);
  };

  // Login con Google — verifica si el email está autorizado
  const login = async (googleProfile) => {
    try {
      const users = await usersApi.list();
      const found = users.find(u => u.email === googleProfile.email);
      if (!found) return { error: 'not_authorized' };
      persistGoogle({ type: 'google', role: found.role, ...googleProfile });
      return { ok: true };
    } catch {
      // Si la users-api no está disponible, deja pasar (modo dev sin API)
      if (import.meta.env.DEV) {
        persistGoogle({ type: 'google', role: 'admin', ...googleProfile });
        return { ok: true };
      }
      return { error: 'api_error' };
    }
  };

  const loginAsDev = () => {
    persistGoogle({ type: 'google', role: 'admin', name: 'Dev User', email: `dev@${import.meta.env.VITE_ALLOWED_DOMAIN || 'restart-ai.com'}`, picture: null });
  };

  const loginAsGuest = (tokenData) => {
    const guest = { type: 'guest', ...tokenData };
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guest));
    setUser(guest);
  };

  const logout = () => {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  };

  // Auto-logout guest on expiry
  useEffect(() => {
    if (user?.type !== 'guest') return;
    const ms = user.expiresAt - Date.now();
    if (ms <= 0) { logout(); return; }
    const timer = setTimeout(logout, ms);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, loginAsDev, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
