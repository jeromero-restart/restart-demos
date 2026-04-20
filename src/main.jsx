import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { verifyToken } from './auth/guestToken'
import App from './App.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import './index.css'

function Root() {
  const { user, loginAsGuest } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guestToken = params.get('guest');
    if (guestToken && !user) {
      verifyToken(guestToken).then(result => {
        if (result.valid) {
          loginAsGuest(result);
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, []);

  return user ? <App /> : <LoginScreen />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
