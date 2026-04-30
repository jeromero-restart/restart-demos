import { useState, useEffect } from 'react';
import { ArrowLeft, Download, AlertTriangle, ExternalLink } from 'lucide-react';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (t) => t ? `${String(t[0]).padStart(2,'0')}:${String(t[1]).padStart(2,'0')}` : '—';
const isInvalidTime = (entry, exit) => entry && exit && (exit[0] * 60 + exit[1]) < (entry[0] * 60 + entry[1]);

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

function InfoCard({ label, value, sub }) {
  return (
    <div className="border border-[#EDEFFE]/20 bg-[#0000FF]/20 p-3">
      <p className="font-sans text-[10px] font-bold uppercase text-[#EDEFFE]/40 tracking-widest mb-1">{label}</p>
      <p className="font-sans font-bold text-sm text-[#EDEFFE]">{value || '—'}</p>
      {sub && <p className="font-sans text-[10px] text-[#EDEFFE]/50 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DetailView({ apiUrl, id, onBack }) {
  const API = apiUrl;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const { patient, personnel, period, day_registries = [], unbound = [], observations = [] } = record;

  return (
    <div className="h-full overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 bg-[#1F1F1F] border-b border-[#EDEFFE]/20 px-4 py-2 flex justify-between items-center z-10 gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold uppercase text-[#EDEFFE]/50 hover:text-[#EDEFFE] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3 h-3" /> Registros
        </button>
        <div className="flex gap-1 flex-wrap justify-end">
          <DownloadBtn onClick={() => download('excel')} label="XLSX" />
          <DownloadBtn onClick={() => download('json')} label="JSON" />
          <a
            href={`${API}/assistance_registry/file?registry_id=${id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold uppercase border border-[#EDEFFE]/40 text-[#EDEFFE]/60 px-2 py-1 hover:border-[#EDEFFE] hover:text-[#EDEFFE] transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> PDF
          </a>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            label="Paciente"
            value={patient?.name}
            sub={[patient?.dni && `DNI: ${patient.dni}`, patient?.coverage].filter(Boolean).join(' · ')}
          />
          <InfoCard
            label="Profesional"
            value={personnel?.name}
            sub={period ? `Período: ${MONTHS[(period[0] || 1) - 1]} ${period[1]}` : undefined}
          />
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
                    <td className="py-2 px-2 font-sans text-[#EDEFFE]/60 max-w-[200px] truncate" title={r.evolution || ''}>
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
                      <td className="py-2 px-2 font-sans text-[#EDEFFE]/50 max-w-[200px] truncate">{r.evolution || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
