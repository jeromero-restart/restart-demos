import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

export default function UploadView({ apiUrl, onSuccess }) {
  const API = apiUrl;
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError('Solo se aceptan archivos PDF.'); return; }
    setError(null);
    setFile(f);
  };

  const stopPolling = () => { if (pollRef.current) clearInterval(pollRef.current); };
  useEffect(() => () => stopPolling(), []);

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/processing_status`);
        if (res.ok) setStatus((await res.json()).message);
      } catch { /* backend puede no tener log aún */ }
    }, 2000);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setStatus('Iniciando procesamiento...');
    startPolling();
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/evaluate_registry`, { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(err.detail || 'Error procesando el archivo');
      }
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      stopPolling();
      setProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo ASCII sutil */}
      <div className="absolute inset-0 opacity-5 font-display text-xs leading-tight break-all select-none text-[#EDEFFE] pointer-events-none overflow-hidden">
        {("10110100101101001011010010110100101101001011010010110100101101001011010010 ").repeat(100)}
      </div>

      {/* Overlay de procesamiento */}
      {processing && (
        <div className="absolute inset-0 bg-[#1F1F1F]/95 flex flex-col items-center justify-center z-20 gap-6 p-6">
          <Loader2 className="w-10 h-10 text-[#EDEFFE] animate-spin" />
          <h3 className="font-display text-3xl text-[#EDEFFE] uppercase tracking-widest">PROCESANDO...</h3>
          <div className="w-full max-w-sm border-2 border-[#EDEFFE]/30 bg-[#0000FF]/20 p-4 min-h-[3rem] flex items-center justify-center">
            <p className="font-display text-sm text-[#EDEFFE]/80 text-center tracking-wide">
              {status || '...'}
            </p>
          </div>
          <p className="font-sans text-xs text-[#EDEFFE]/40 text-center max-w-xs">
            El backend está extrayendo y validando los datos con IA. Esto puede tardar unos minutos.
          </p>
        </div>
      )}

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-4">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed p-8 flex flex-col items-center gap-4 cursor-pointer transition-all ${
            dragging
              ? 'border-[#EDEFFE] bg-[#EDEFFE]/10 scale-[1.01]'
              : file
              ? 'border-[#0000FF] bg-[#0000FF]/30 shadow-[4px_4px_0_#EDEFFE]'
              : 'border-[#EDEFFE]/40 hover:border-[#EDEFFE] hover:bg-[#EDEFFE]/5'
          }`}
        >
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          {file ? (
            <>
              <FileText className="w-12 h-12 text-[#EDEFFE]" />
              <div className="text-center">
                <p className="font-sans font-bold text-sm text-[#EDEFFE] break-all">{file.name}</p>
                <p className="font-sans text-xs text-[#EDEFFE]/50 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-[10px] font-bold uppercase text-[#EDEFFE]/40 hover:text-[#EDEFFE] transition-colors"
              >
                Cambiar archivo
              </button>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-[#EDEFFE]/30" />
              <div className="text-center">
                <p className="font-sans font-bold text-sm text-[#EDEFFE]/70">Arrastrar o hacer click</p>
                <p className="font-sans text-xs text-[#EDEFFE]/40 mt-1">Solo archivos PDF · Planilla de asistencia médica</p>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="border-2 border-[#EDEFFE]/40 bg-[#0000FF]/20 p-3">
            <p className="font-sans text-xs text-[#EDEFFE] text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || processing}
          className="w-full bg-[#0000FF] border-2 border-[#EDEFFE] text-[#EDEFFE] font-display text-2xl uppercase py-3 hover:bg-[#EDEFFE] hover:text-[#0000FF] transition-colors shadow-[4px_4px_0_#EDEFFE] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          &gt; Procesar planilla
        </button>
      </div>
    </div>
  );
}
