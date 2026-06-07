import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Loader2, Users, Activity, Cpu } from 'lucide-react';

/**
 * Perfilador de Clientes — live webcam profiling.
 *
 * Flow: webcam <video> (local, 30fps) → every SEND_INTERVAL_MS we grab a frame
 * to a hidden canvas, JPEG-encode it and send the binary over a WebSocket to the
 * GPU backend. The backend replies with {faces, count, summary, latency_ms}; we
 * draw the boxes on an overlay canvas and render the archetype panel.
 *
 * The <video> is CSS-mirrored (natural selfie view). The overlay is NOT mirrored
 * (so labels stay readable); instead we flip each bbox's X so boxes still align.
 */

const SEND_INTERVAL_MS = 160;   // ~6 fps to the backend; video stays at 30fps
const CAPTURE_MAX_W = 640;      // downscale captured frame for faster inference
const JPEG_QUALITY = 0.7;

const SENTIMENT_COLOR = {
  positivo: '#22c55e',
  negativo: '#ef4444',
  neutral: '#a3a3a3',
};

function wsUrlFrom(apiUrl) {
  const base = (apiUrl || 'http://localhost:8004').replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/ws/profile`;
}

export default function PerfiladorDemo({ apiUrl }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const captureRef = useRef(null);
  const wsRef = useRef(null);
  const sendTimerRef = useRef(null);
  const streamRef = useRef(null);
  const latestRef = useRef({ faces: [], count: 0, summary: null });

  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({ count: 0, summary: null, analytics: null, latency: null });

  // ----- drawing loop (rAF) keeps overlay smooth even between WS messages -----
  const draw = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    const w = video.clientWidth;
    const h = video.clientHeight;
    if (overlay.width !== w || overlay.height !== h) {
      overlay.width = w;
      overlay.height = h;
    }
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const { faces } = latestRef.current;
    for (const f of faces) {
      // Mirror X to align with the CSS-mirrored video.
      const dx1 = (1 - f.bbox[2]) * w;
      const dx2 = (1 - f.bbox[0]) * w;
      const dy1 = f.bbox[1] * h;
      const dy2 = f.bbox[3] * h;
      const bw = dx2 - dx1;
      const bh = dy2 - dy1;

      const color = SENTIMENT_COLOR[f.emotion_sentiment] || '#EDEFFE';
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.strokeRect(dx1, dy1, bw, bh);

      // Label box above the face.
      const tag = f.visitor_id != null ? `V${f.visitor_id} · ` : '';
      const line1 = `${tag}${f.gender}, ${f.age}`;
      const line2 = f.emotion ? f.emotion : '';
      ctx.font = '600 13px Inter, sans-serif';
      const tw = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) + 12;
      const th = line2 ? 38 : 22;
      const ly = dy1 - th < 0 ? dy1 + 2 : dy1 - th;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(dx1, ly, tw, th);
      ctx.fillStyle = '#EDEFFE';
      ctx.fillText(line1, dx1 + 6, ly + 15);
      if (line2) {
        ctx.fillStyle = color;
        ctx.fillText(line2, dx1 + 6, ly + 31);
      }
    }
  }, []);

  useEffect(() => {
    let raf;
    const tick = () => { draw(); raf = requestAnimationFrame(tick); };
    if (active) raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [active, draw]);

  // ----- frame capture + send -----
  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const cap = captureRef.current;
    const ws = wsRef.current;
    if (!video || !cap || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (!video.videoWidth) return;

    const scale = Math.min(1, CAPTURE_MAX_W / video.videoWidth);
    cap.width = Math.round(video.videoWidth * scale);
    cap.height = Math.round(video.videoHeight * scale);
    const ctx = cap.getContext('2d');
    ctx.drawImage(video, 0, 0, cap.width, cap.height);
    cap.toBlob(
      (blob) => {
        if (blob && ws.readyState === WebSocket.OPEN) {
          blob.arrayBuffer().then((buf) => ws.send(buf));
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  }, []);

  const stop = useCallback(() => {
    if (sendTimerRef.current) clearInterval(sendTimerRef.current);
    sendTimerRef.current = null;
    if (wsRef.current) { try { wsRef.current.close(); } catch {} }
    wsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    latestRef.current = { faces: [], count: 0, summary: null };
    setActive(false);
    setStatus({ count: 0, summary: null, analytics: null, latency: null });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const ws = new WebSocket(wsUrlFrom(apiUrl));
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setConnecting(false);
        setActive(true);
        sendTimerRef.current = setInterval(sendFrame, SEND_INTERVAL_MS);
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.error) return;
          latestRef.current = data;
          setStatus({
            count: data.count,
            summary: data.summary,
            analytics: data.analytics ?? null,
            latency: data.latency_ms ?? null,
          });
        } catch {}
      };
      ws.onerror = () => {
        setError('No se pudo conectar al backend del perfilador.');
        setConnecting(false);
        stop();
      };
      ws.onclose = () => {
        if (sendTimerRef.current) clearInterval(sendTimerRef.current);
      };
    } catch (e) {
      setConnecting(false);
      setError(
        e?.name === 'NotAllowedError'
          ? 'Acceso a la cámara denegado. Permitilo en el navegador y reintentá.'
          : 'No se pudo acceder a la cámara.',
      );
      stop();
    }
  }, [apiUrl, sendFrame, stop]);

  useEffect(() => () => stop(), [stop]);

  const analytics = status.analytics;

  return (
    <div className="h-full flex flex-col font-sans">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b-2 border-[#EDEFFE]/20 flex-shrink-0">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#EDEFFE]/60">
          <span className={`flex items-center gap-1 ${active ? 'text-[#EDEFFE]' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-[#EDEFFE]/30'}`} />
            {active ? 'En vivo' : 'Detenido'}
          </span>
          {status.latency != null && (
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {status.latency}ms</span>
          )}
          <span className="flex items-center gap-1" title="En cámara ahora"><Users className="w-3 h-3" /> {status.count}</span>
          {status.analytics && (
            <span className="flex items-center gap-1 text-[#EDEFFE]" title="Visitantes únicos">
              <Cpu className="w-3 h-3" /> {status.analytics.unique_visitors} únicos
            </span>
          )}
        </div>
        <button
          onClick={active ? stop : start}
          disabled={connecting}
          className="flex items-center gap-2 text-xs font-bold uppercase border-2 border-[#EDEFFE] px-3 py-1.5 text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#0000FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : active ? <CameraOff className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
          {connecting ? 'Conectando' : active ? 'Detener' : 'Activar cámara'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <canvas ref={captureRef} className="hidden" />

        {/* Idle / error states */}
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-[#1F1F1F]/80 text-center">
            <Camera className="w-12 h-12 text-[#EDEFFE]/40" />
            <p className="font-display text-2xl uppercase text-[#EDEFFE] tracking-widest">Perfilador de clientes</p>
            <p className="font-sans text-xs text-[#EDEFFE]/50 max-w-xs">
              Activá la cámara para detectar en vivo edad, sexo y emoción de las personas frente al lente.
            </p>
            {error && (
              <div className="border-2 border-red-400/60 bg-red-500/10 px-3 py-2 max-w-xs">
                <p className="font-sans text-xs text-[#EDEFFE]">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Live archetype panel */}
        {active && (
          <div className="absolute top-3 right-3 w-64 max-h-[calc(100%-1.5rem)] overflow-y-auto flex flex-col gap-2">
            {analytics && (
              <div className="bg-[#0000FF]/85 border-2 border-[#EDEFFE] p-3 backdrop-blur-sm">
                <p className="font-display text-sm uppercase tracking-widest text-[#EDEFFE]/70 mb-2">/// Indicadores de tienda</p>
                <div className="grid grid-cols-2 gap-2 text-[#EDEFFE] mb-2">
                  <Stat label="Visitantes únicos" value={analytics.unique_visitors} />
                  <Stat label="Pico ocupación" value={analytics.peak_occupancy ?? 0} />
                  <Stat label="Permanencia prom." value={`${analytics.avg_dwell_s}s`} />
                </div>
                <TrafficChart timeline={analytics.timeline} />
                <Dist label="Sexo" data={analytics.gender_dist} />
                <Dist label="Rango etario" data={analytics.age_dist} />
                <Dist label="Emoción" data={analytics.emotion_dist} />
                <Dist label="Estilo de ropa" data={analytics.style_dist} />
                <Dist label="Color de ropa" data={analytics.color_dist} />
              </div>
            )}

            {latestRef.current.faces.map((f, i) => (
              <div key={i} className="bg-[#1F1F1F]/85 border border-[#EDEFFE]/40 p-2.5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-base uppercase text-[#EDEFFE]">
                    {f.visitor_id != null ? `Visitante ${f.visitor_id}` : `#${i + 1}`}
                  </span>
                  {f.emotion && (
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: (SENTIMENT_COLOR[f.emotion_sentiment] || '#EDEFFE') + '33', color: SENTIMENT_COLOR[f.emotion_sentiment] || '#EDEFFE' }}
                    >
                      {f.emotion}
                    </span>
                  )}
                </div>
                <p className="font-sans text-xs text-[#EDEFFE]/90 font-bold">{f.gender} · {f.age} años</p>
                {(f.style || f.clothing_color) && (
                  <p className="font-sans text-[11px] text-[#EDEFFE]/70 mt-0.5">
                    👕 {[f.style, f.clothing_color].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="font-sans text-[11px] text-[#EDEFFE]/60 mt-0.5">{f.archetype}</p>
                {f.dwell_s != null && f.dwell_s > 0 && (
                  <p className="font-sans text-[10px] text-[#EDEFFE]/40 mt-0.5">Permanencia: {f.dwell_s}s</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-[#EDEFFE]/20 px-2 py-1">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#EDEFFE]/50">{label}</p>
      <p className="font-display text-xl leading-none">{value}</p>
    </div>
  );
}

function TrafficChart({ timeline }) {
  if (!timeline || timeline.length < 2) {
    return (
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#EDEFFE]/40 mb-1">Tráfico en el tiempo</p>
        <div className="h-12 flex items-center justify-center border border-[#EDEFFE]/10">
          <span className="text-[10px] text-[#EDEFFE]/30">Recolectando datos…</span>
        </div>
      </div>
    );
  }
  const W = 228;
  const H = 48;
  const n = timeline.length;
  const maxOcc = Math.max(1, ...timeline.map((d) => d.occ));
  const maxUniq = Math.max(1, ...timeline.map((d) => d.uniq));
  const x = (i) => (n === 1 ? 0 : (i / (n - 1)) * W);
  const yOcc = (v) => H - (v / maxOcc) * H;
  const yUniq = (v) => H - (v / maxUniq) * H;

  const occArea =
    `M 0 ${H} ` +
    timeline.map((d, i) => `L ${x(i).toFixed(1)} ${yOcc(d.occ).toFixed(1)}`).join(' ') +
    ` L ${W} ${H} Z`;
  const uniqLine = timeline
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${yUniq(d.uniq).toFixed(1)}`)
    .join(' ');

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#EDEFFE]/40">Tráfico en el tiempo</p>
        <span className="text-[9px] text-[#EDEFFE]/40">
          <span className="text-[#EDEFFE]">━</span> únicos · <span className="text-[#EDEFFE]/50">▒</span> ocupación
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block">
        <path d={occArea} fill="#EDEFFE" fillOpacity="0.15" />
        <path d={uniqLine} fill="none" stroke="#EDEFFE" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function Dist({ label, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#EDEFFE]/40 mb-1">{label}</p>
      <div className="flex flex-col gap-1">
        {entries.map(([k, n]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-[10px] text-[#EDEFFE]/80 w-20 truncate">{k}</span>
            <div className="flex-1 h-2 bg-[#EDEFFE]/10">
              <div className="h-full bg-[#EDEFFE]" style={{ width: `${(n / total) * 100}%` }} />
            </div>
            <span className="text-[10px] font-bold text-[#EDEFFE] w-4 text-right">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
