import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const GUEST_SESSION_KEY = 'restart_guest_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(GUEST_SESSION_KEY);
      if (saved) {
        const guest = JSON.parse(saved);
        if (Date.now() < guest.expiresAt) return guest;
        sessionStorage.removeItem(GUEST_SESSION_KEY);
      }
    } catch { /* ignore */ }
    return null;
  });

  const login = (googleProfile) => {
    setUser({ type: 'google', ...googleProfile });
  };

  const loginAsGuest = (tokenData) => {
    const guest = { type: 'guest', ...tokenData };
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guest));
    setUser(guest);
  };

  const logout = () => {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
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
    <AuthContext.Provider value={{ user, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
