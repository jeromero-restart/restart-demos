import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader, ShieldAlert, HardHat, Flame, Zap, Eye } from 'lucide-react';

// Metadatos de presentación por cámara (los ids vienen del backend /health).
const CAM_META = {
  'cam-no-helmet': { label: 'Personas sin casco', icon: ShieldAlert, accent: 'border-red-400',    critical: true },
  'cam-helmet':    { label: 'Personas con casco', icon: HardHat,     accent: 'border-green-400' },
  'cam-fire':      { label: 'Fuego / Humo',       icon: Flame,       accent: 'border-orange-400', critical: true },
};
const metaFor = (id) => CAM_META[id] || { label: id, icon: Eye, accent: 'border-[#EDEFFE]/30' };

const classLabel = (c) => {
  if (c === 'no_helmet') return 'Persona SIN casco';
  if (c === 'helmet') return 'Persona con casco';
  if (/smoke|fire/i.test(c)) return 'Fuego / humo';
  if (c === 'person') return 'Persona';
  return c;
};
const isCritical = (c) => c === 'no_helmet' || /smoke|fire/i.test(c);

const pad2 = (n) => String(n).padStart(2, '0');
const fmtClock = (ts) => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };

export default function EppDemo({ apiUrl }) {
  const API = (apiUrl || 'http://localhost:8005').replace(/\/$/, '');
  const [cameras, setCameras] = useState([]);   // [{ id, state, fps }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const lastAlertRef = useRef({});               // dedupe: `${cam}:${class}` -> ts

  // Poll de /health (lista de cámaras + estado + FPS)
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`${API}/health`);
        if (!r.ok) throw new Error('backend');
        const data = await r.json();
        if (!active) return;
        const cams = Object.entries(data.cameras || {})
          .map(([id, h]) => ({ id, state: h.state, fps: h.fps }))
          .sort((a, b) => a.id.localeCompare(b.id));
        setCameras(cams);
        setError(null);
        setLoading(false);
      } catch {
        if (active) { setError('No se pudo conectar al backend de detección'); setLoading(false); }
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => { active = false; clearInterval(t); };
  }, [API]);

  // WebSocket /events — alertas en vivo (deduplicadas por cámara+clase cada 3s)
  useEffect(() => {
    if (loading || error) return;
    const wsUrl = API.replace(/^http/, 'ws') + '/events';
    let ws;
    try { ws = new WebSocket(wsUrl); } catch { return; }
    ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        const cam = evt.camera_id;
        const now = Date.now();
        (evt.detections || []).filter((d) => isCritical(d.class)).forEach((d) => {
          const key = `${cam}:${d.class}`;
          if (now - (lastAlertRef.current[key] || 0) < 3000) return;
          lastAlertRef.current[key] = now;
          setAlerts((prev) => [{ id: `${key}:${now}`, cam, cls: d.class, score: d.score, ts: now }, ...prev].slice(0, 30));
        });
      } catch { /* ignore */ }
    };
    return () => { try { ws.close(); } catch { /* ignore */ } };
  }, [API, loading, error]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full text-[#EDEFFE]">
      <div className="text-center">
        <Loader className="w-10 h-10 animate-spin mx-auto mb-3 opacity-60" />
        <div className="font-display text-2xl uppercase animate-pulse">Conectando con el backend...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center h-full text-[#EDEFFE] p-8">
      <div className="border-2 border-red-400 bg-[#1F1F1F] p-6 max-w-md text-center shadow-[6px_6px_0_#EDEFFE]">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="font-sans text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Grilla de cámaras */}
      <div className="flex-[3] overflow-y-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {cameras.map((cam) => {
            const meta = metaFor(cam.id);
            const Icon = meta.icon;
            const online = String(cam.state).toUpperCase() === 'CONNECTED';
            return (
              <div key={cam.id} className={`border-2 ${meta.accent} bg-black flex flex-col`}>
                <div className="flex items-center justify-between px-3 py-2 bg-[#1F1F1F] border-b-2 border-inherit">
                  <span className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-[#EDEFFE]">
                    <Icon className="w-4 h-4" /> {meta.label}
                    {meta.critical && <span className="text-[9px] font-bold uppercase border border-red-400 text-red-400 px-1">alarma</span>}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-mono text-[#EDEFFE]/60">
                    <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                    {online ? `${cam.fps?.toFixed?.(1) ?? cam.fps} fps` : 'offline'}
                  </span>
                </div>
                <img
                  src={`${API}/mjpeg/${cam.id}`}
                  alt={meta.label}
                  className="w-full aspect-video object-contain bg-black"
                />
              </div>
            );
          })}
          {cameras.length === 0 && (
            <p className="font-sans text-sm text-[#EDEFFE]/40 col-span-full text-center py-16">
              No hay cámaras activas.
            </p>
          )}
        </div>
      </div>

      {/* Panel de alertas */}
      <div className="w-full lg:w-72 xl:w-80 flex flex-col border-t-2 lg:border-t-0 lg:border-l-2 border-[#EDEFFE] bg-[#1F1F1F] flex-shrink-0">
        <div className="bg-[#0000FF] border-b border-[#EDEFFE]/30 px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <h3 className="font-display text-base uppercase text-[#EDEFFE] flex items-center gap-2 flex-1">
            <Zap className="w-4 h-4" /> Alertas
          </h3>
          {alerts.length > 0 && (
            <span className="bg-[#EDEFFE] text-[#0000FF] text-[10px] font-bold px-1.5 py-0.5">{alerts.length}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-[#EDEFFE]/40">
              <Eye className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-sans text-xs leading-relaxed">Monitoreando…<br />Las alertas de EPP y fuego aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EDEFFE]/10">
              {alerts.map((a, i) => {
                const fire = /smoke|fire/i.test(a.cls);
                const accent = fire ? 'border-l-orange-400' : 'border-l-red-400';
                const color = fire ? 'text-orange-400' : 'text-red-400';
                return (
                  <div key={a.id} className={`px-4 py-3 border-l-4 ${accent} ${i === 0 ? 'bg-[#0000FF]/30' : ''}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`flex items-center gap-1.5 font-display text-sm uppercase ${color}`}>
                        {fire ? <Flame className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />} Alerta
                      </span>
                      <span className="text-[10px] text-[#EDEFFE]/50 font-mono">{fmtClock(a.ts)}</span>
                    </div>
                    <p className="font-sans text-sm text-[#EDEFFE]">{classLabel(a.cls)}</p>
                    <p className="font-sans text-[10px] uppercase tracking-wider text-[#EDEFFE]/40 mt-0.5">
                      {metaFor(a.cam).label} · {(a.score * 100).toFixed(0)}%
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
