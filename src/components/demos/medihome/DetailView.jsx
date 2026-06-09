import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Download, AlertTriangle, FileText } from 'lucide-react';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (t) => t ? `${String(t[0]).padStart(2,'0')}:${String(t[1]).padStart(2,'0')}` : '—';
const isInvalidTime = (entry, exit) => entry && exit && (exit[0] * 60 + exit[1]) < (entry[0] * 60 + entry[1]);

const present = (v) => v != null && v !== '' && String(v).toUpperCase() !== 'UNDEFINED';

const STATUS = {
  ok:   { dot: 'bg-green-400',  text: 'text-green-400',  ring: 'border-green-400/40' },
  warn: { dot: 'bg-yellow-400', text: 'text-yellow-400', ring: 'border-yellow-400/40' },
  fail: { dot: 'bg-red-400',    text: 'text-red-400',    ring: 'border-red-400/40' },
};

// Deriva el semáforo de validación a partir de los datos que el backend ya devuelve.
function buildChecks({ patient, personnel, period, day_registries }) {
  const total = day_registries.length;
  const profSigned = day_registries.filter((r) => r.professional_signature).length;
  const respSigned = day_registries.filter((r) => r.responsible_signature).length;
  const sigStatus = (n) => (total === 0 ? 'warn' : n === total ? 'ok' : n === 0 ? 'fail' : 'warn');

  return [
    { label: 'Paciente identificado',   status: present(patient?.name) ? 'ok' : 'fail',
      detail: present(patient?.name) ? patient.name : 'Sin coincidencia' },
    { label: 'Profesional identificado', status: present(personnel?.name) ? 'ok' : 'fail',
      detail: present(personnel?.name) ? personnel.name : 'Sin coincidencia' },
    { label: 'Obra social',             status: present(patient?.coverage) ? 'ok' : 'warn',
      detail: present(patient?.coverage) ? patient.coverage : 'No legible' },
    { label: 'Período',                 status: (Array.isArray(period) && period[1]) ? 'ok' : 'warn',
      detail: (Array.isArray(period) && period[1]) ? `${MONTHS[(period[0] || 1) - 1]} ${period[1]}` : 'No legible' },
    { label: 'Firma profesional',       status: sigStatus(profSigned),
      detail: `${profSigned}/${total} registros` },
    { label: 'Firma responsable',       status: sigStatus(respSigned),
      detail: `${respSigned}/${total} registros` },
  ];
}

function DownloadBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[10px] font-bold uppercase border border-[#EDEFFE]/40 text-[#EDEFFE]/60 px-2 py-1 hover:border-[#EDEFFE] hover:text-[#EDEFFE] transition-colors"
    >
      <Download className="w-3 h-3" /> {label}
    </button>
  );
}

function scoreColor(score) {
  if (score == null) return 'text-[#EDEFFE]/40 border-[#EDEFFE]/20';
  if (score >= 90) return 'text-green-400 border-green-400/40';
  if (score >= 70) return 'text-yellow-400 border-yellow-400/40';
  return 'text-red-400 border-red-400/40';
}

// Badge de coincidencia fuzzy. read=lo que leyó el LLM, matched=la entidad de la base.
function MatchBadge({ score, read, matched, exact }) {
  if (score == null && !exact) return null;
  const tip = exact
    ? `Coincidencia exacta\nLeído: ${read ?? '—'}\nBase: ${matched ?? '—'}`
    : `Leído: ${read ?? '—'}\nBase: ${matched ?? '—'}\nSimilitud: ${score}%`;
  return (
    <span
      title={tip}
      className={`flex items-center gap-1 text-[9px] font-bold uppercase border px-1.5 py-0.5 cursor-help ${scoreColor(exact ? 100 : score)}`}
    >
      {exact ? '✓ exacto' : `${score}% match`}
    </span>
  );
}

function InfoCard({ label, value, sub, badge }) {
  return (
    <div className="border border-[#EDEFFE]/20 bg-[#0000FF]/20 p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-sans text-[10px] font-bold uppercase text-[#EDEFFE]/40 tracking-widest">{label}</p>
        {badge}
      </div>
      <p className="font-sans font-bold text-sm text-[#EDEFFE]">{value || '—'}</p>
      {sub && <p className="font-sans text-[10px] text-[#EDEFFE]/50 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DetailView({ apiUrl, id, onBack, onExpandToggle }) {
  const API = apiUrl;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPdf, setShowPdf] = useState(false);
  const [leftPct, setLeftPct] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const togglePdf = () => {
    const next = !showPdf;
    setShowPdf(next);
    setLeftPct(50);
    onExpandToggle?.(next);
  };

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(80, Math.max(20, pct)));
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    fetch(`${API}/assistance_registry/detail?registry_id=${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setRecord)
      .catch(() => setError('No se pudo cargar el registro.'))
      .finally(() => setLoading(false));
  }, [id]);

  const download = async (type) => {
    const map = {
      excel: [`${API}/assistance_registry/download?registry_id=${id}`, `${id}.xlsx`],
      json:  [`${API}/assistance_registry/raw_file?registry_id=${id}`, `${id}.json`],
    };
    const [url, name] = map[type];
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <p className="font-display text-2xl text-[#EDEFFE]/50 uppercase animate-pulse">Cargando...</p>
    </div>
  );

  if (error || !record) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
      <p className="font-display text-2xl text-[#EDEFFE] uppercase">{error || 'Registro no encontrado'}</p>
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold uppercase border-2 border-[#EDEFFE] px-4 py-2 text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#0000FF] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
    </div>
  );

  const { patient, personnel, period, day_registries = [], unbound = [], observations = [], match_meta } = record;
  const pdfUrl = `${API}/assistance_registry/file?registry_id=${id}`;
  const pm = match_meta?.patient;
  const prm = match_meta?.personnel;
  const checks = buildChecks({ patient, personnel, period, day_registries });
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const overall = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'ok';
  const overallLabel = overall === 'ok' ? 'Validado' : overall === 'warn' ? `${warnCount} advertencia${warnCount !== 1 ? 's' : ''}` : `${failCount} error${failCount !== 1 ? 'es' : ''}`;

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header */}
      <div className="bg-[#1F1F1F] border-b border-[#EDEFFE]/20 px-4 py-2 flex justify-between items-center gap-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold uppercase text-[#EDEFFE]/50 hover:text-[#EDEFFE] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3 h-3" /> Registros
        </button>
        <div className="flex gap-1 flex-wrap justify-end items-center">
          <button
            onClick={togglePdf}
            className={`flex items-center gap-1 text-[10px] font-bold uppercase border px-2 py-1 transition-colors ${
              showPdf
                ? 'border-[#EDEFFE] text-[#EDEFFE] bg-[#EDEFFE]/10'
                : 'border-[#EDEFFE]/40 text-[#EDEFFE]/60 hover:border-[#EDEFFE] hover:text-[#EDEFFE]'
            }`}
          >
            <FileText className="w-3 h-3" /> {showPdf ? 'Ocultar PDF' : 'Ver PDF'}
          </button>
          <DownloadBtn onClick={() => download('excel')} label="XLSX" />
          <DownloadBtn onClick={() => download('json')} label="JSON" />
        </div>
      </div>

      {/* Body — split when PDF visible */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">

        {/* Data panel */}
        <div
          className="overflow-y-auto flex-shrink-0"
          style={{ width: showPdf ? `${leftPct}%` : '100%' }}
        >
          <div className="p-4 flex flex-col gap-5">
            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard
                label="Paciente"
                value={patient?.name}
                sub={[patient?.dni && `DNI: ${patient.dni}`, patient?.coverage].filter(Boolean).join(' · ')}
                badge={pm && <MatchBadge score={pm.name_score} read={pm.raw_name} matched={pm.matched_name} exact={pm.dni_match} />}
              />
              <InfoCard
                label="Profesional"
                value={personnel?.name}
                sub={period ? `Período: ${MONTHS[(period[0] || 1) - 1]} ${period[1]}` : undefined}
                badge={prm && <MatchBadge score={prm.name_score} read={prm.raw_name} matched={prm.matched_name} />}
              />
            </div>

            {/* Semáforo de validación */}
            <div className={`border bg-[#0000FF]/10 ${STATUS[overall].ring}`}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEFFE]/10">
                <span className="font-display text-sm uppercase tracking-widest text-[#EDEFFE]/70">/// Validación</span>
                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${STATUS[overall].text}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS[overall].dot}`} />
                  {overallLabel}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 p-3">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS[c.status].dot}`} />
                    <span className="font-sans text-xs text-[#EDEFFE]/80 flex-shrink-0">{c.label}</span>
                    <span className="font-sans text-[10px] text-[#EDEFFE]/40 truncate ml-auto" title={c.detail}>{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            {observations.length > 0 && (
              <div className="border border-[#EDEFFE]/20 bg-[#0000FF]/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3 h-3 text-[#EDEFFE]/50 flex-shrink-0" />
                  <span className="font-sans text-[10px] font-bold uppercase text-[#EDEFFE]/50 tracking-widest">
                    Observaciones ({observations.length})
                  </span>
                </div>
                <ul className="space-y-1">
                  {observations.map((obs, i) => (
                    <li key={i} className="font-sans text-xs text-[#EDEFFE]/70 flex gap-2">
                      <span className="text-[#EDEFFE]/30 flex-shrink-0">{i + 1}.</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabla de asistencias */}
            <div>
              <h3 className="font-display text-xl uppercase text-[#EDEFFE] border-b border-[#EDEFFE]/20 pb-1 mb-3">
                ///_ASISTENCIAS <span className="text-[#EDEFFE]/40">[{day_registries.length}]</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EDEFFE]/20">
                      {['Día','Entrada','Salida','F. Prof.','F. Resp.','Evolución'].map(h => (
                        <th key={h} className="text-left font-bold uppercase tracking-wider py-2 px-2 text-[#EDEFFE]/40 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {day_registries.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[#EDEFFE]/10 transition-colors hover:bg-[#EDEFFE]/5 ${
                          isInvalidTime(r.entry_time, r.exit_time) ? 'bg-[#0000FF]/20' : ''
                        }`}
                      >
                        <td className="py-2 px-2 font-display text-base text-[#EDEFFE] w-8">{r.day_index ?? '—'}</td>
                        <td className="py-2 px-2 font-sans text-[#EDEFFE]/80 whitespace-nowrap">{fmt(r.entry_time)}</td>
                        <td className={`py-2 px-2 font-sans whitespace-nowrap ${isInvalidTime(r.entry_time, r.exit_time) ? 'text-[#EDEFFE]' : 'text-[#EDEFFE]/80'}`}>
                          {fmt(r.exit_time)}
                        </td>
                        <td className="py-2 px-2 text-center text-base">{r.professional_signature ? '✓' : <span className="text-[#EDEFFE]/30">✗</span>}</td>
                        <td className="py-2 px-2 text-center text-base">{r.responsible_signature ? '✓' : <span className="text-[#EDEFFE]/30">✗</span>}</td>
                        <td className="py-2 px-2 font-sans text-[#EDEFFE]/60 whitespace-normal leading-relaxed">
                          {r.evolution || '—'}
                        </td>
                      </tr>
                    ))}
                    {!day_registries.length && (
                      <tr><td colSpan={6} className="py-4 text-center font-sans text-xs text-[#EDEFFE]/30">Sin registros de asistencia</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sin coincidencia (unbound) */}
            {unbound.length > 0 && (
              <div>
                <h3 className="font-display text-lg uppercase text-[#EDEFFE]/50 border-b border-[#EDEFFE]/10 pb-1 mb-3">
                  ///_SIN_COINCIDENCIA <span className="text-[#EDEFFE]/30">[{unbound.length}]</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#EDEFFE]/10">
                        {['Entrada','Salida','Evolución'].map(h => (
                          <th key={h} className="text-left font-bold uppercase tracking-wider py-2 px-2 text-[#EDEFFE]/30">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {unbound.map((r, i) => (
                        <tr key={i} className="border-b border-[#EDEFFE]/5">
                          <td className="py-2 px-2 font-sans text-[#EDEFFE]/50">{fmt(r.entry_time)}</td>
                          <td className="py-2 px-2 font-sans text-[#EDEFFE]/50">{fmt(r.exit_time)}</td>
                          <td className="py-2 px-2 font-sans text-[#EDEFFE]/50 whitespace-normal leading-relaxed">{r.evolution || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        {showPdf && (
          <div
            onMouseDown={onDividerMouseDown}
            className="w-1.5 flex-shrink-0 bg-[#EDEFFE]/10 hover:bg-[#EDEFFE]/40 active:bg-[#EDEFFE]/60 cursor-col-resize transition-colors flex items-center justify-center group"
          >
            <div className="w-px h-8 bg-[#EDEFFE]/30 group-hover:bg-[#EDEFFE]/70 transition-colors" />
          </div>
        )}

        {/* PDF panel */}
        {showPdf && (
          <div className="flex-1 border-l border-[#EDEFFE]/20 min-w-0">
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF original"
            />
          </div>
        )}
      </div>
    </div>
  );
}
