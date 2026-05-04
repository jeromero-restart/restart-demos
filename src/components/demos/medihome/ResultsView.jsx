import { useState, useEffect } from 'react';
import { Download, ChevronRight, RefreshCw, Trash2 } from 'lucide-react';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const fmtPeriod = ([m, y]) => `${MONTHS[(m || 1) - 1]} ${y}`;

export default function ResultsView({ apiUrl, onDetail }) {
  const API = apiUrl;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecords = () => {
    setLoading(true);
    setError(null);
    fetch(`${API}/assistance_registries`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setRecords)
      .catch(() => setError('No se pudo conectar con el backend.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchRecords, []);

  const deleteRecord = async (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await fetch(`${API}/assistance_registry?registry_id=${id}`, { method: 'DELETE' });
      setRecords(prev => prev.filter(r => r.key !== id));
    } catch { /* ignore */ }
  };

  const downloadExcel = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/assistance_registry/download?registry_id=${id}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `${id}.xlsx` }).click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <p className="font-display text-2xl text-[#EDEFFE]/50 uppercase tracking-widest animate-pulse">Cargando registros...</p>
    </div>
  );

  if (error) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
      <div className="border-2 border-[#EDEFFE]/40 p-6 text-center max-w-sm">
        <p className="font-display text-2xl text-[#EDEFFE] uppercase mb-2">Sin conexión</p>
        <p className="font-sans text-xs text-[#EDEFFE]/60 mb-4">{error}</p>
        <button onClick={fetchRecords} className="flex items-center gap-2 mx-auto text-xs font-bold uppercase border-2 border-[#EDEFFE] px-4 py-2 text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#0000FF] transition-colors">
          <RefreshCw className="w-3 h-3" /> Reintentar
        </button>
      </div>
    </div>
  );

  if (!records.length) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
      <div className="border-2 border-dashed border-[#EDEFFE]/20 p-8 text-center max-w-sm">
        <p className="font-display text-2xl text-[#EDEFFE]/50 uppercase mb-2">Sin registros</p>
        <p className="font-sans text-xs text-[#EDEFFE]/40">Procesá una planilla para comenzar.</p>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex justify-between items-center px-4 py-3 border-b border-[#EDEFFE]/10">
        <span className="font-display text-lg text-[#EDEFFE] uppercase tracking-widest">
          [{records.length}] registros
        </span>
        <button onClick={fetchRecords} className="text-[#EDEFFE]/40 hover:text-[#EDEFFE] transition-colors p-1">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-[#EDEFFE]/20">
            {['#', 'Paciente', 'DNI', 'Obra Social', 'Período', ''].map((h, i) => (
              <th key={i} className="text-left font-bold uppercase tracking-widest py-2 px-3 text-[#EDEFFE]/40">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map(({ key, registry }, i) => (
            <tr
              key={key}
              onClick={() => onDetail(key)}
              className="border-b border-[#EDEFFE]/10 hover:bg-[#0000FF]/30 cursor-pointer group transition-colors"
            >
              <td className="py-3 px-3 font-display text-base text-[#EDEFFE]/30">{i + 1}</td>
              <td className="py-3 px-3 font-sans font-bold text-[#EDEFFE]">{registry.paciente_nombre || '—'}</td>
              <td className="py-3 px-3 font-sans text-[#EDEFFE]/70">{registry.paciente_dni || '—'}</td>
              <td className="py-3 px-3 font-sans text-[#EDEFFE]/70 max-w-[8rem] truncate">{registry.paciente_os || '—'}</td>
              <td className="py-3 px-3">
                {registry.periodo && (
                  <span className="bg-[#0000FF] text-[#EDEFFE] px-2 py-0.5 font-display text-sm border border-[#EDEFFE]/30">
                    {fmtPeriod(registry.periodo)}
                  </span>
                )}
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => downloadExcel(e, key)}
                    title="Descargar Excel"
                    className="p-1.5 border border-[#EDEFFE]/30 text-[#EDEFFE]/40 hover:border-[#EDEFFE] hover:text-[#EDEFFE] transition-colors"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => deleteRecord(e, key)}
                    title="Eliminar registro"
                    className="p-1.5 border border-[#EDEFFE]/30 text-[#EDEFFE]/40 hover:border-red-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-[#EDEFFE]/20 group-hover:text-[#EDEFFE] transition-colors" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
