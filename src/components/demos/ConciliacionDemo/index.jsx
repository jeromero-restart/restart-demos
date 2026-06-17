import React, { useState, useEffect, useRef } from 'react';
import { Upload, Loader, AlertCircle, CheckCircle, Download, Zap, FileSpreadsheet, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

const DEMO_USER = import.meta.env.VITE_ALBERDI_DEMO_USER || 'demo';
const DEMO_PASS = import.meta.env.VITE_ALBERDI_DEMO_PASS || 'demo1234';

const STEP = { UPLOAD: 'upload', PROCESSING: 'processing', SUGGESTIONS: 'suggestions', RESULTS: 'results' };

function viabilityPct(v) { return Math.round((v / 15) * 100); }
function viabilityColor(v) {
  if (v >= 12) return 'text-green-400 border-green-400';
  if (v >= 8)  return 'text-yellow-400 border-yellow-400';
  return 'text-red-400 border-red-400';
}
function fmtImporte(n) {
  return typeof n === 'number'
    ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
    : n;
}

export default function ConciliacionDemo({ apiUrl }) {
  const [step, setStep]               = useState(STEP.UPLOAD);
  const [error, setError]             = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [fileName, setFileName]       = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats]             = useState(null);
  const [expanded, setExpanded]       = useState({});
  const [confirmed, setConfirmed]     = useState(new Set());
  const [processing, setProcessing]   = useState(false);
  const fileInputRef = useRef(null);

  // Auto-login on mount
  useEffect(() => {
    fetch(`${apiUrl}/usuario/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: DEMO_USER, password: DEMO_PASS }),
    }).catch(() => {});
  }, [apiUrl]);

  const apiFetch = (path, opts = {}) =>
    fetch(`${apiUrl}${path}`, { credentials: 'include', ...opts });

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.xlsx')) {
      setError('El archivo debe ser un Excel (.xlsx)');
      return;
    }
    setError(null);
    setFileName(file.name);
    setStep(STEP.PROCESSING);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const r = await apiFetch('/conciliaciones/excel/procesar-a-json', { method: 'POST', body: formData });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al procesar el archivo');
      }

      const r2 = await apiFetch('/conciliaciones/obtener-posibles-conciliaciones');
      if (!r2.ok) throw new Error('Error al obtener conciliaciones');
      const data = await r2.json();
      setSuggestions(data.recomendacionesDeConciliacion || []);
      setStep(STEP.SUGGESTIONS);
    } catch (e) {
      setError(e.message);
      setStep(STEP.UPLOAD);
    }
  };

  const autoReconcile = async () => {
    setProcessing(true);
    setError(null);
    try {
      const r = await apiFetch('/conciliaciones/ejecutar-posibles-conciliaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(10),
      });
      if (!r.ok) throw new Error('Error al ejecutar conciliaciones');
      await loadStats();
    } catch (e) {
      setError(e.message);
    }
    setProcessing(false);
  };

  const confirmSelected = async () => {
    if (confirmed.size === 0) return;
    setProcessing(true);
    try {
      const r = await apiFetch('/conciliaciones/confirmar-conciliacion-de-saldos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([...confirmed]),
      });
      if (!r.ok) throw new Error('Error al confirmar');
      await loadStats();
    } catch (e) {
      setError(e.message);
    }
    setProcessing(false);
  };

  const loadStats = async () => {
    const r = await apiFetch('/conciliaciones/obtener-estadisticas-de-conciliaciones');
    if (r.ok) {
      setStats(await r.json());
      setStep(STEP.RESULTS);
    }
  };

  const downloadExcel = async () => {
    const r = await apiFetch('/conciliaciones/descargar-excel-conciliaciones');
    if (!r.ok) return;
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'conciliaciones.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleConfirm = (id) => setConfirmed(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  // ── Upload ──────────────────────────────────────────────────────────────────

  if (step === STEP.UPLOAD || step === STEP.PROCESSING) return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-[#EDEFFE]">
      <div className="w-full max-w-lg">
        <h2 className="font-display text-3xl uppercase mb-2">// SUBIR ARCHIVO</h2>
        <p className="font-sans text-sm text-[#EDEFFE]/60 mb-6">
          Excel con transacciones del día (.xlsx) — columnas: importe, documento, fecha valor, cuenta, texto, clase de documento
        </p>

        {error && (
          <div className="flex items-start gap-2 border-2 border-red-400 bg-red-400/10 p-3 mb-4 text-xs text-red-300 font-sans">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {step === STEP.PROCESSING ? (
          <div className="border-2 border-[#EDEFFE]/30 p-10 flex flex-col items-center gap-4">
            <Loader className="w-10 h-10 animate-spin text-[#EDEFFE]/60" />
            <div className="font-display text-xl uppercase animate-pulse">Analizando transacciones...</div>
            <p className="font-sans text-xs text-[#EDEFFE]/50">{fileName}</p>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
              dragging ? 'border-[#EDEFFE] bg-[#1e22aa]/20' : 'border-[#EDEFFE]/30 hover:border-[#EDEFFE]/60 hover:bg-[#1e22aa]/10'
            }`}
          >
            <FileSpreadsheet className="w-12 h-12 text-[#EDEFFE]/40" />
            <div className="text-center">
              <p className="font-display text-lg uppercase">Arrastrá el archivo aquí</p>
              <p className="font-sans text-xs text-[#EDEFFE]/50 mt-1">o hacé click para seleccionarlo</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#EDEFFE]/30 border border-[#EDEFFE]/20 px-3 py-1">
              <Upload className="w-3 h-3" /> .xlsx únicamente
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>
        )}
      </div>
    </div>
  );

  // ── Suggestions ─────────────────────────────────────────────────────────────

  if (step === STEP.SUGGESTIONS) return (
    <div className="h-full flex flex-col overflow-hidden text-[#EDEFFE]">
      <div className="border-b-2 border-[#EDEFFE] px-5 py-3 flex items-center justify-between flex-shrink-0 bg-[#1e22aa]">
        <div>
          <span className="font-display text-lg uppercase">// CONCILIACIONES SUGERIDAS</span>
          <span className="ml-3 text-[10px] border border-[#EDEFFE]/40 px-2 py-0.5 font-bold uppercase">
            {suggestions.length} transacciones con match
          </span>
        </div>
        <div className="flex items-center gap-2">
          {confirmed.size > 0 && (
            <button
              onClick={confirmSelected}
              disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-[#1F1F1F] transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Confirmar {confirmed.size}
            </button>
          )}
          <button
            onClick={autoReconcile}
            disabled={processing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border-2 border-[#EDEFFE] text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#1e22aa] transition-all"
          >
            {processing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Conciliar todo automáticamente
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-3 flex items-start gap-2 border border-red-400 bg-red-400/10 p-2 text-xs text-red-300 font-sans">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-[#EDEFFE]/10">
        {suggestions.length === 0 && (
          <div className="p-12 text-center text-[#EDEFFE]/40 font-sans text-sm">
            No se encontraron conciliaciones posibles en este archivo.
          </div>
        )}
        {suggestions.map((s, i) => {
          const sc    = s.saldoCargado;
          const best  = s.posiblesConciliaciones[0];
          const isExp = expanded[sc.id];
          const isCon = confirmed.has(sc.id);

          return (
            <div key={sc.id} className={`transition-colors ${isCon ? 'bg-green-400/5' : ''}`}>
              <div
                className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-[#1e22aa]/10"
                onClick={() => toggleExpand(sc.id)}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleConfirm(sc.id); }}
                  className={`w-5 h-5 border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isCon ? 'bg-green-400 border-green-400' : 'border-[#EDEFFE]/30 hover:border-[#EDEFFE]'
                  }`}
                >
                  {isCon && <CheckCircle className="w-3 h-3 text-[#1F1F1F]" />}
                </button>

                {/* Transaction info */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs min-w-0">
                  <div>
                    <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Importe</div>
                    <div className="font-mono font-bold">{fmtImporte(sc.importe)}</div>
                  </div>
                  <div>
                    <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Doc</div>
                    <div className="font-mono truncate">{sc.nroDeDocumento || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Fecha</div>
                    <div className="font-sans">{sc.fechaValor || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Tarjeta</div>
                    <div className="font-sans truncate">{sc.tarjeta || '—'}</div>
                  </div>
                </div>

                {/* Viability badge */}
                <div className={`flex-shrink-0 border font-display text-sm px-2 py-0.5 ${viabilityColor(best?.viabilidad)}`}>
                  {viabilityPct(best?.viabilidad)}% match
                </div>

                {/* Options count + expand */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-[#EDEFFE]/40 font-sans">
                    {s.posiblesConciliaciones.length} opción{s.posiblesConciliaciones.length !== 1 ? 'es' : ''}
                  </span>
                  {isExp ? <ChevronUp className="w-4 h-4 text-[#EDEFFE]/40" /> : <ChevronDown className="w-4 h-4 text-[#EDEFFE]/40" />}
                </div>
              </div>

              {/* Expanded: show match details */}
              {isExp && (
                <div className="px-5 pb-3 bg-[#1e22aa]/10 border-t border-[#EDEFFE]/10">
                  {s.posiblesConciliaciones.map((pc, j) => (
                    <div key={j} className="mt-3 border border-[#EDEFFE]/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold border px-1.5 py-0.5 uppercase ${viabilityColor(pc.viabilidad)}`}>
                          Viabilidad {viabilityPct(pc.viabilidad)}%
                        </span>
                        <span className="text-[10px] text-[#EDEFFE]/40 font-sans">
                          {pc.saldosDeOperadorDePago.length} saldo{pc.saldosDeOperadorDePago.length !== 1 ? 's' : ''} del operador
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {pc.saldosDeOperadorDePago.map((sop, k) => (
                          <div key={k} className="grid grid-cols-3 gap-2 text-[11px] font-sans text-[#EDEFFE]/70 bg-[#1F1F1F] px-2 py-1.5">
                            <span><span className="text-[#EDEFFE]/40">Importe:</span> {fmtImporte(sop.importe)}</span>
                            <span><span className="text-[#EDEFFE]/40">Doc:</span> {sop.nroDeDocumento || '—'}</span>
                            <span><span className="text-[#EDEFFE]/40">Auth:</span> {sop.codigoDeAutorizacion || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Results ─────────────────────────────────────────────────────────────────

  if (step === STEP.RESULTS && stats) return (
    <div className="h-full overflow-y-auto p-6 text-[#EDEFFE]">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 border-b-2 border-[#EDEFFE] pb-4">
          <h2 className="font-display text-3xl uppercase">// RESULTADO</h2>
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#EDEFFE] text-[#1e22aa] font-bold text-sm uppercase border-2 border-[#EDEFFE] hover:bg-[#1e22aa] hover:text-[#EDEFFE] transition-all shadow-[4px_4px_0_#1e22aa] hover:shadow-none"
          >
            <Download className="w-4 h-4" /> Descargar Excel
          </button>
        </div>

        {/* Main metric */}
        <div className="border-2 border-[#EDEFFE] p-6 mb-4 text-center shadow-[8px_8px_0_#1e22aa]">
          <div className="font-display text-7xl text-[#EDEFFE] mb-1">
            {stats.porcentajeConciliacionesRealizadas}%
          </div>
          <div className="font-display text-xl uppercase text-[#EDEFFE]/60">conciliaciones completadas</div>
          <div className="flex justify-center gap-8 mt-4 text-sm font-sans">
            <div className="text-center">
              <div className="font-display text-3xl text-green-400">{stats.conciliacionesRealizadas}</div>
              <div className="text-[#EDEFFE]/50 text-xs uppercase">conciliadas</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-[#EDEFFE]/40">
                {stats.supuestasConciliacionesPosibles - stats.conciliacionesRealizadas}
              </div>
              <div className="text-[#EDEFFE]/50 text-xs uppercase">pendientes</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-[#EDEFFE]">{stats.supuestasConciliacionesPosibles}</div>
              <div className="text-[#EDEFFE]/50 text-xs uppercase">total posibles</div>
            </div>
          </div>
        </div>

        {/* Error breakdown */}
        <div className="border-2 border-[#EDEFFE]/30 p-5">
          <h3 className="font-display text-lg uppercase mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Distribución de Discrepancias
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Sin error',         pct: stats.porcentajeSinError,                    color: 'bg-green-400' },
              { label: 'Importe',           pct: stats.porcentajeDeErrorImporte,               color: 'bg-yellow-400' },
              { label: 'Fecha valor',       pct: stats.porcentajeDeErrorFechaValor,            color: 'bg-orange-400' },
              { label: 'Cuenta',            pct: stats.porcentajeDeErrorCuenta,                color: 'bg-red-400' },
              { label: 'Cód. autorización', pct: stats.porcentajeDeErrorCodigoDeAutorizacion, color: 'bg-purple-400' },
              { label: 'E-commerce',        pct: stats.porcentajeDeErrorEcommerce,             color: 'bg-blue-400' },
            ].filter(r => r.pct > 0).map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs font-sans text-[#EDEFFE]/60 w-36 flex-shrink-0">{row.label}</span>
                <div className="flex-1 bg-[#EDEFFE]/10 h-2">
                  <div className={`${row.color} h-2 transition-all`} style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-xs font-mono text-[#EDEFFE]/60 w-12 text-right">{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setStep(STEP.UPLOAD); setSuggestions([]); setStats(null); setConfirmed(new Set()); setFileName(null); }}
          className="mt-6 w-full py-2 text-xs font-bold uppercase text-[#EDEFFE]/40 border border-[#EDEFFE]/20 hover:text-[#EDEFFE] hover:border-[#EDEFFE]/40 transition-colors"
        >
          Procesar otro archivo
        </button>
      </div>
    </div>
  );

  return null;
}
