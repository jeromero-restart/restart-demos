import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../auth/AuthContext';
import { verifyToken } from '../auth/guestToken';

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN;

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=VT323&display=swap');
  @font-face { font-family: 'PP Neue Bit'; src: local('PP Neue Bit Bold'), local('PPNeueBit-Bold'); font-weight: bold; }
  .font-display { font-family: 'PP Neue Bit', 'VT323', monospace; letter-spacing: 0.05em; }
  .font-sans { font-family: 'Inter', sans-serif; }
`;

export default function LoginScreen({ initialError }) {
  const { login, loginAsGuest } = useAuth();
  const [mode, setMode] = useState('google'); // 'google' | 'guest'
  const [code, setCode] = useState('');
  const [error, setError] = useState(initialError || null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        if (ALLOWED_DOMAIN && !profile.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setError(`Acceso restringido a cuentas @${ALLOWED_DOMAIN}`);
          return;
        }
        login(profile);
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Error al iniciar sesión con Google.'),
  });

  const handleDevLogin = () => {
    login({ name: 'Dev User', email: `dev@${ALLOWED_DOMAIN || 'restart-ai.com'}`, picture: null });
  };

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const result = await verifyToken(code.trim());
    setLoading(false);
    if (!result.valid) {
      setError(result.expired ? 'Este código ha expirado.' : 'Código inválido.');
      return;
    }
    loginAsGuest(result);
  };

  return (
    <div className="min-h-screen bg-[#0000FF] font-sans text-[#EDEFFE] flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#EDEFFE] selection:text-[#0000FF]">
      <style>{fontStyles}</style>
      <div className="absolute inset-0 opacity-10 font-display text-xs leading-tight break-all select-none text-[#EDEFFE] pointer-events-none overflow-hidden">
        {("010010111011001001101001110001110101111011010101101111100111100110001101010100100111001010 ").repeat(200)}
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-[#0000FF] border-2 border-[#EDEFFE] shadow-[8px_8px_0_#1F1F1F]">

          {/* Header */}
          <div className="bg-[#1F1F1F] border-b-2 border-[#EDEFFE] p-3 flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <div className="w-3 h-3 bg-[#EDEFFE] rounded-full animate-pulse"></div>
              <span className="font-display text-lg text-[#EDEFFE] tracking-widest">LOGIN.exe</span>
            </div>
            <span className="font-sans text-[10px] font-bold uppercase text-[#EDEFFE]/60">v1.0.0</span>
          </div>

          <div className="p-8 flex flex-col items-center gap-6">
            <img src="/logo.png" alt="RESTART Logo" className="h-14 w-auto object-contain" />

            <div className="text-center">
              <h1 className="font-display text-5xl text-[#EDEFFE] uppercase leading-tight mb-2">
                ACCESO<br/>RESTRINGIDO
              </h1>
            </div>

            {/* Toggle */}
            <div className="w-full flex border-2 border-[#EDEFFE]">
              <button
                onClick={() => { setMode('google'); setError(null); }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${mode === 'google' ? 'bg-[#EDEFFE] text-[#0000FF]' : 'bg-transparent text-[#EDEFFE] hover:bg-[#EDEFFE]/10'}`}
              >
                Cuenta corporativa
              </button>
              <button
                onClick={() => { setMode('guest'); setError(null); }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest border-l-2 border-[#EDEFFE] transition-colors ${mode === 'guest' ? 'bg-[#EDEFFE] text-[#0000FF]' : 'bg-transparent text-[#EDEFFE] hover:bg-[#EDEFFE]/10'}`}
              >
                Código de acceso
              </button>
            </div>

            {/* Google login */}
            {mode === 'google' && (
              <div className="w-full flex flex-col gap-3">
                <p className="font-sans text-xs text-[#EDEFFE]/70 text-center">
                  Inicia sesión con tu cuenta{ALLOWED_DOMAIN && <> <span className="text-[#EDEFFE] font-bold">@{ALLOWED_DOMAIN}</span></>}
                </p>
                <button
                  onClick={() => handleGoogleLogin()}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-[#EDEFFE] text-[#0000FF] border-2 border-[#EDEFFE] px-6 py-4 font-sans font-bold text-sm uppercase tracking-widest hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors shadow-[4px_4px_0_#1F1F1F] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  {loading ? 'Verificando...' : 'Continuar con Google'}
                </button>
              </div>
            )}

            {/* Guest code login */}
            {mode === 'guest' && (
              <form onSubmit={handleGuestLogin} className="w-full flex flex-col gap-3">
                <p className="font-sans text-xs text-[#EDEFFE]/70 text-center">
                  Ingresá el código que te compartieron
                </p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Pegar código aquí..."
                  className="w-full bg-[#1F1F1F] border-2 border-[#EDEFFE] text-[#EDEFFE] px-4 py-3 font-display text-lg tracking-widest placeholder-[#EDEFFE]/30 focus:outline-none focus:border-[#EDEFFE] text-center"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full bg-[#EDEFFE] text-[#0000FF] border-2 border-[#EDEFFE] px-6 py-4 font-sans font-bold text-sm uppercase tracking-widest hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors shadow-[4px_4px_0_#1F1F1F] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : '> Acceder'}
                </button>
              </form>
            )}

            {import.meta.env.DEV && (
              <button
                onClick={handleDevLogin}
                className="w-full border-2 border-dashed border-[#EDEFFE]/30 text-[#EDEFFE]/40 py-2 text-xs uppercase tracking-widest hover:border-[#EDEFFE]/60 hover:text-[#EDEFFE]/60 transition-colors"
              >
                [DEV] Saltar login
              </button>
            )}

            {error && (
              <div className="w-full bg-[#1F1F1F] border-2 border-[#EDEFFE] p-3 text-center">
                <p className="font-sans text-xs font-bold text-[#EDEFFE]">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
