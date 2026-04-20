const SECRET = import.meta.env.VITE_TOKEN_SECRET || 'restart-demos-secret';

function toBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function getKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function generateToken({ demos, durationMinutes, label }) {
  const payload = JSON.stringify({
    demos,          // array de IDs (ej: [1,3]) o 'all'
    expiresAt: Date.now() + durationMinutes * 60 * 1000,
    label: label || 'Invitado',
  });
  const encodedPayload = toBase64url(new TextEncoder().encode(payload));
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${toBase64url(sig)}`;
}

export async function verifyToken(token) {
  try {
    const [encodedPayload, encodedSig] = token.trim().split('.');
    if (!encodedPayload || !encodedSig) return { valid: false };

    const key = await getKey();
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      fromBase64url(encodedSig),
      new TextEncoder().encode(encodedPayload)
    );
    if (!valid) return { valid: false };

    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(encodedPayload)));
    if (Date.now() > payload.expiresAt) return { valid: false, expired: true };

    return { valid: true, ...payload };
  } catch {
    return { valid: false };
  }
}
