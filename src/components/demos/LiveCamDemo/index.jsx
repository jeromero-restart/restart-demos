import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Trash2, Zap, Eye, AlertCircle, Loader } from 'lucide-react';

const ENTITY_TYPES = [
  { id: 'person', label: 'Persona' },
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'animal', label: 'Animal' },
];

const TRIGGER_TYPES = [
  { id: 'count', label: 'Conteo', desc: 'Alerta cuando N o más entidades están simultáneamente en zona' },
  { id: 'dwell', label: 'Permanencia', desc: 'Alerta cuando una entidad permanece T segundos en zona' },
  { id: 'direction', label: 'Dirección', desc: 'Alerta cuando una entidad ingresa desde una dirección cardinal' },
];

const TRIGGER_LABELS = {
  count: (p) => `≥ ${p.min_count} entidad${p.min_count !== 1 ? 'es' : ''}`,
  dwell: (p) => `${p.threshold_s}s de permanencia`,
  direction: (p) => `Ingreso desde el ${p.direction === 'N' ? 'Norte' : p.direction === 'S' ? 'Sur' : p.direction === 'E' ? 'Este' : 'Oeste'}`,
};

// El video MJPEG llega con algo de retraso (buffer del backend + decode del navegador),
// mientras que las alertas SSE son instantáneas. Retrasamos la alerta este tanto para
// que aparezca cuando el evento se ve en pantalla (no antes). Ajustable.
const EVENT_DISPLAY_DELAY_MS = 3500;

export default function LiveCamDemo({ apiUrl }) {
  const [step, setStep] = useState('cameras');
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const [polygon, setPolygon] = useState([]);
  const [closed, setClosed] = useState(false);
  const [entityType, setEntityType] = useState('person');
  const [triggerType, setTriggerType] = useState('count');
  const [triggerParams, setTriggerParams] = useState({ min_count: 2 });

  const [areaId, setAreaId] = useState(null);
  const [events, setEvents] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}/api/cameras`)
      .then(r => {
        if (!r.ok) throw new Error('No se pudo conectar al backend de detección');
        return r.json();
      })
      .then(data => { setCameras(data.cameras || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [apiUrl]);

  const drawPolygon = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (polygon.length === 0) return;

    const toC = (pt) => ({ x: pt.x * canvas.width, y: pt.y * canvas.height });

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#EDEFFE';
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';

    ctx.beginPath();
    const first = toC(polygon[0]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < polygon.length; i++) {
      const p = toC(polygon[i]);
      ctx.lineTo(p.x, p.y);
    }
    if (closed) { ctx.closePath(); ctx.fill(); }
    ctx.stroke();

    polygon.forEach((pt, i) => {
      const c = toC(pt);
      ctx.beginPath();
      ctx.arc(c.x, c.y, i === 0 ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#EDEFFE' : '#0000FF';
      ctx.strokeStyle = '#EDEFFE';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });
  }, [polygon, closed]);

  useEffect(() => { drawPolygon(); }, [drawPolygon]);

  const handleCanvasClick = (e) => {
    if (closed) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (polygon.length >= 3) {
      const dx = x - polygon[0].x;
      const dy = y - polygon[0].y;
      if (Math.sqrt(dx * dx + dy * dy) < 0.04) { setClosed(true); return; }
    }
    setPolygon(prev => [...prev, { x, y }]);
  };

  const resetZone = () => { setPolygon([]); setClosed(false); };

  const handleTriggerTypeChange = (type) => {
    setTriggerType(type);
    if (type === 'count') setTriggerParams({ min_count: 2 });
    else if (type === 'dwell') setTriggerParams({ threshold_s: 5 });
    else setTriggerParams({ direction: 'N' });
  };

  const submitAndLaunch = async () => {
    if (!closed || polygon.length < 3) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: selectedCamera.id,
          polygon: polygon.map(pt => [pt.x, pt.y]),
          entity_type: entityType,
          trigger: { type: triggerType, params: triggerParams },
        }),
      });
      if (!res.ok) throw new Error('Error al crear la zona');
      const data = await res.json();
      setAreaId(data.area_id);
      setEvents([]);
      setStep('live');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== 'live' || !areaId || !selectedCamera) return;
    const es = new EventSource(
      `${apiUrl}/api/cameras/${selectedCamera.id}/live/events?area_id=${areaId}`
    );
    const timers = [];
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event') {
          // Delay the alert so it lands in sync with the (buffered) video instead of ahead of it.
          const t = setTimeout(() => {
            setEvents(prev => [{ ...data, _ts: Date.now() }, ...prev].slice(0, 40));
          }, EVENT_DISPLAY_DELAY_MS);
          timers.push(t);
        }
      } catch {}
    };
    return () => { es.close(); timers.forEach(clearTimeout); };
  }, [step, areaId, selectedCamera, apiUrl]);

  const stopLive = async () => {
    if (selectedCamera && areaId) {
      await fetch(
        `${apiUrl}/api/cameras/${selectedCamera.id}/live/session?area_id=${areaId}`,
        { method: 'DELETE' }
      ).catch(() => {});
    }
    setAreaId(null);
    setEvents([]);
    setPolygon([]);
    setClosed(false);
    setSelectedCamera(null);
    setStep('cameras');
  };

  // ── Loading / Error ──────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full text-[#EDEFFE]">
      <div className="text-center">
        <Loader className="w-10 h-10 animate-spin mx-auto mb-3 opacity-60" />
        <div className="font-display text-2xl uppercase animate-pulse">Conectando con el backend...</div>
      </div>
    </div>
  );

  if (error && step !== 'config') return (
    <div className="flex-1 flex items-center justify-center h-full text-[#EDEFFE] p-8">
      <div className="border-2 border-red-400 bg-[#1F1F1F] p-6 max-w-md text-center shadow-[6px_6px_0_#EDEFFE]">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="font-sans text-sm mb-4">{error}</p>
        <button
          onClick={() => { setError(null); setStep('cameras'); }}
          className="px-4 py-2 bg-[#EDEFFE] text-[#0000FF] font-bold text-xs uppercase border-2 border-[#EDEFFE]"
        >
          Volver
        </button>
      </div>
    </div>
  );

  // ── Step 1: Camera selection ─────────────────────────────────────────────────

  if (step === 'cameras') return (
    <div className="h-full overflow-y-auto p-6 text-[#EDEFFE]">
      <div className="mb-6 border-b-2 border-[#EDEFFE] pb-4">
        <h2 className="font-display text-3xl uppercase">// SELECCIONÁ UNA CÁMARA</h2>
        <p className="font-sans text-sm text-[#EDEFFE]/60 mt-1">
          Elegí la fuente de video para configurar la zona de detección
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cameras.map(cam => (
          <button
            key={cam.id}
            onClick={() => { setSelectedCamera(cam); setStep('config'); }}
            className="text-left border-2 border-[#EDEFFE] bg-[#1F1F1F] p-4 hover:bg-[#0000FF] hover:shadow-[6px_6px_0_#EDEFFE] transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="font-display text-xl uppercase text-[#EDEFFE] group-hover:underline">{cam.name}</span>
              <span className="text-[10px] font-bold bg-[#0000FF] group-hover:bg-[#1F1F1F] text-[#EDEFFE] border border-[#EDEFFE] px-2 py-0.5 uppercase">
                {cam.resolution}
              </span>
            </div>
            <p className="font-sans text-xs text-[#EDEFFE]/70 mb-3">{cam.description}</p>
            <div className="flex gap-3 text-[10px] font-bold uppercase text-[#EDEFFE]/50">
              <span>{cam.fps} FPS</span>
              <span>ID: {cam.id}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2: Zone config ──────────────────────────────────────────────────────

  if (step === 'config') return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Video + canvas */}
      <div className="flex-[2] relative bg-black border-b-2 lg:border-b-0 lg:border-r-2 border-[#EDEFFE] min-h-[280px] flex items-center justify-center overflow-hidden">
        <div className="absolute top-3 left-3 right-3 z-20 bg-[#0000FF]/90 border border-[#EDEFFE] px-3 py-2 flex justify-between items-center">
          <span className="font-sans text-xs text-[#EDEFFE]">
            {!closed
              ? polygon.length === 0
                ? 'Hacé clic para marcar los vértices de la zona'
                : polygon.length < 3
                  ? `${polygon.length} punto${polygon.length > 1 ? 's' : ''} — necesitás al menos 3`
                  : 'Hacé clic cerca del primer punto para cerrar la zona'
              : '✓ Zona definida — configurá la regla y lanzá la demo'}
          </span>
          {polygon.length > 0 && (
            <button
              onClick={resetZone}
              className="ml-2 flex items-center gap-1 text-[10px] font-bold uppercase text-[#EDEFFE]/70 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Borrar
            </button>
          )}
        </div>

        {/* Caja 16:9 exacta: el canvas se superpone al video sin letterbox, así las
            coordenadas dibujadas coinciden 1:1 con el frame que procesa el backend. */}
        <div className="relative w-full aspect-video">
          <video
            src={`${apiUrl}/api/cameras/${selectedCamera.id}/stream?v=2`}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10"
            width={1280}
            height={720}
            onClick={handleCanvasClick}
          />
        </div>
      </div>

      {/* Config panel */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#1F1F1F] text-[#EDEFFE] flex flex-col gap-5 min-w-[240px]">
        <button
          onClick={() => setStep('cameras')}
          className="flex items-center gap-1 text-xs font-bold uppercase text-[#EDEFFE]/50 hover:text-[#EDEFFE] transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" /> Cambiar cámara
        </button>

        {/* Entity type */}
        <div>
          <h3 className="font-display text-lg uppercase border-b border-[#EDEFFE]/30 pb-1 mb-3">
            // ENTIDAD A DETECTAR
          </h3>
          <div className="flex flex-col gap-2">
            {ENTITY_TYPES.map(et => (
              <button
                key={et.id}
                onClick={() => setEntityType(et.id)}
                className={`text-left px-3 py-2 text-xs font-bold uppercase border-2 transition-all ${
                  entityType === et.id
                    ? 'bg-[#EDEFFE] text-[#0000FF] border-[#EDEFFE]'
                    : 'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE]/30 hover:border-[#EDEFFE]'
                }`}
              >
                {et.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger type */}
        <div>
          <h3 className="font-display text-lg uppercase border-b border-[#EDEFFE]/30 pb-1 mb-3">
            // REGLA DE ALERTA
          </h3>
          <div className="flex flex-col gap-2 mb-3">
            {TRIGGER_TYPES.map(tt => (
              <button
                key={tt.id}
                onClick={() => handleTriggerTypeChange(tt.id)}
                className={`text-left px-3 py-2 border-2 transition-all ${
                  triggerType === tt.id
                    ? 'bg-[#0000FF] text-[#EDEFFE] border-[#0000FF]'
                    : 'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE]/30 hover:border-[#EDEFFE]'
                }`}
              >
                <div className="text-xs font-bold uppercase">{tt.label}</div>
                <div className="text-[10px] text-[#EDEFFE]/60 mt-0.5 font-sans">{tt.desc}</div>
              </button>
            ))}
          </div>

          {/* Trigger params */}
          <div className="border border-[#EDEFFE]/20 p-3 bg-[#0000FF]/10">
            {triggerType === 'count' && (
              <>
                <label className="text-[10px] uppercase font-bold text-[#EDEFFE]/60 block mb-1">
                  Cantidad mínima en zona
                </label>
                <input
                  type="number" min="1"
                  value={triggerParams.min_count}
                  onChange={e => setTriggerParams({ min_count: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-[#1F1F1F] border border-[#EDEFFE]/40 text-[#EDEFFE] px-2 py-1 text-sm font-bold focus:outline-none focus:border-[#EDEFFE]"
                />
              </>
            )}
            {triggerType === 'dwell' && (
              <>
                <label className="text-[10px] uppercase font-bold text-[#EDEFFE]/60 block mb-1">
                  Tiempo de permanencia (seg)
                </label>
                <input
                  type="number" min="1" step="0.5"
                  value={triggerParams.threshold_s}
                  onChange={e => setTriggerParams({ threshold_s: Math.max(0.5, parseFloat(e.target.value) || 1) })}
                  className="w-full bg-[#1F1F1F] border border-[#EDEFFE]/40 text-[#EDEFFE] px-2 py-1 text-sm font-bold focus:outline-none focus:border-[#EDEFFE]"
                />
              </>
            )}
            {triggerType === 'direction' && (
              <>
                <label className="text-[10px] uppercase font-bold text-[#EDEFFE]/60 block mb-2">
                  Dirección de ingreso a alertar
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'N', label: 'Norte' },
                    { id: 'S', label: 'Sur' },
                    { id: 'E', label: 'Este' },
                    { id: 'W', label: 'Oeste' },
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => setTriggerParams({ direction: d.id })}
                      className={`py-1.5 text-xs font-bold uppercase border-2 transition-all ${
                        triggerParams.direction === d.id
                          ? 'bg-[#EDEFFE] text-[#0000FF] border-[#EDEFFE]'
                          : 'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE]/30 hover:border-[#EDEFFE]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 border border-red-400 px-3 py-2">{error}</p>
        )}

        <button
          onClick={submitAndLaunch}
          disabled={!closed || submitting}
          className={`mt-auto flex items-center justify-center gap-2 py-3 px-4 font-bold text-sm uppercase border-2 transition-all ${
            closed && !submitting
              ? 'bg-[#EDEFFE] text-[#0000FF] border-[#EDEFFE] hover:bg-[#0000FF] hover:text-[#EDEFFE] shadow-[4px_4px_0_#0000FF]'
              : 'bg-[#1F1F1F] text-[#EDEFFE]/30 border-[#EDEFFE]/20 cursor-not-allowed'
          }`}
        >
          {submitting
            ? <><Loader className="w-4 h-4 animate-spin" /> Iniciando...</>
            : !closed
              ? 'Dibujá una zona primero'
              : <><Play className="w-4 h-4" /> Lanzar en Vivo</>}
        </button>
      </div>
    </div>
  );

  // ── Step 3: Live view ────────────────────────────────────────────────────────

  if (step === 'live') return (
    <div className="h-full flex flex-col">
      <div className="border-b-2 border-[#EDEFFE] bg-[#0000FF] px-4 py-2 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="font-display text-lg uppercase text-[#EDEFFE] truncate">
            EN VIVO — {selectedCamera?.name}
          </span>
          <span className="hidden sm:inline text-[10px] font-bold border border-[#EDEFFE]/40 text-[#EDEFFE]/60 px-2 py-0.5 uppercase flex-shrink-0">
            {entityType} · {TRIGGER_LABELS[triggerType]?.(triggerParams)}
          </span>
        </div>
        <button
          onClick={stopLive}
          className="text-xs font-bold uppercase text-[#EDEFFE] border border-[#EDEFFE]/40 px-3 py-1.5 hover:border-[#EDEFFE] hover:bg-[#1F1F1F] transition-colors flex-shrink-0 ml-2"
        >
          Detener
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* MJPEG stream */}
        <div className="flex-[2] bg-black flex items-center justify-center min-h-[220px]">
          <img
            src={`${apiUrl}/api/cameras/${selectedCamera.id}/live/video?area_id=${areaId}`}
            alt="Stream en vivo"
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Events panel */}
        <div className="w-full lg:w-64 xl:w-72 flex flex-col border-t-2 lg:border-t-0 lg:border-l-2 border-[#EDEFFE] bg-[#1F1F1F] overflow-hidden flex-shrink-0">
          <div className="bg-[#0000FF] border-b border-[#EDEFFE]/30 px-4 py-2 flex-shrink-0">
            <h3 className="font-display text-base uppercase text-[#EDEFFE] flex items-center gap-2">
              <Zap className="w-4 h-4" />
              ALERTAS
              {events.length > 0 && (
                <span className="bg-[#EDEFFE] text-[#0000FF] text-[10px] font-bold px-1.5 py-0.5 ml-auto">
                  {events.length}
                </span>
              )}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-6 text-center text-[#EDEFFE]/40">
                <Eye className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="font-sans text-xs leading-relaxed">
                  Monitoreando la zona...<br />Las alertas aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EDEFFE]/10">
                {events.map((ev, i) => {
                  const entity = ev.class_name === 'person' ? 'Persona'
                    : ev.class_name === 'vehicle' ? 'Vehículo'
                    : ev.class_name === 'animal' ? 'Animal'
                    : (ev.class_name || 'Objeto');
                  const reason = ev.trigger_type === 'count' ? 'Conteo en zona'
                    : ev.trigger_type === 'dwell' ? 'Permanencia'
                    : ev.trigger_type === 'direction' ? 'Ingreso por dirección'
                    : 'Detección';
                  return (
                    <div
                      key={ev.event_id || i}
                      className={`px-4 py-3 border-l-4 border-l-red-400 transition-colors ${i === 0 ? 'bg-[#0000FF]/30' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="flex items-center gap-1.5 font-display text-sm uppercase text-red-400">
                          <Zap className="w-3.5 h-3.5" /> Alerta
                        </span>
                        <span className="text-[10px] text-[#EDEFFE]/50 font-mono flex-shrink-0 ml-2">
                          {ev.timestamp_s != null ? `${ev.timestamp_s.toFixed(1)}s` : ''}
                        </span>
                      </div>
                      <p className="font-sans text-sm text-[#EDEFFE]">
                        {entity} <span className="text-[#EDEFFE]/50">#{ev.track_id}</span>
                      </p>
                      <p className="font-sans text-[10px] uppercase tracking-wider text-[#EDEFFE]/40 mt-0.5">
                        {reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}
