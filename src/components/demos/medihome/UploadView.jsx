import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, Zap, Database, X, ChevronRight, Users } from 'lucide-react';

const SAMPLE_FILES = [
  { id: 1, name: 'Juan Pérez', subtitle: 'Planilla sin errores', file: 'planilla-juan-perez.pdf' },
  { id: 2, name: 'Jon Doe', subtitle: 'Planilla con errores', file: 'planilla-jon-doe-errores.pdf' },
];

export default function UploadView({ apiUrl, onSuccess }) {
  const API = apiUrl;
  const [file, setFile]               = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [status, setStatus]           = useState('');
  const [error, setError]             = useState(null);
  const [loadingSample, setLoadingSample] = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);   // PDF blob URL for preview
  const [previewName, setPreviewName] = useState(null);
  const [showDb, setShowDb]           = useState(false);
  const [patients, setPatients]       = useState([]);
  const [dbLoading, setDbLoading]     = useState(false);
  const inputRef = useRef(null);
  const pollRef  = useRef(null);

  // cleanup blob URL on unmount
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const fetchPatients = async () => {
    setDbLoading(true);
    try {
      const r = await fetch(`${API}/patients`);
      setPatients(r.ok ? await r.json() : []);
    } catch { setPatients([]); }
    setDbLoading(false);
  };

  const toggleDb = () => {
    if (!showDb) fetchPatients();
    setShowDb(v => !v);
  };

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError('Solo se aceptan archivos PDF.'); return; }
    setError(null);
    setFile(f);
    // show preview of manually uploaded file
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setPreviewName(f.name);
  };

  const stopPolling  = () => { if (pollRef.current) clearInterval(pollRef.current); };
  useEffect(() => () => stopPolling(), []);

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/processing_status`);
        if (res.ok) setStatus((await res.json()).message);
      } catch {}
    }, 2000);
  };

  const selectSample = async (sample) => {
    setLoadingSample(sample.id);
    setError(null);
    try {
      const res = await fetch(`/samples/${sample.file}`);
      if (!res.ok) throw new Error('Archivo de ejemplo no encontrado');
      const blob = await res.blob();
      const f = new File([blob], sample.file, { type: 'application/pdf' });
      setFile(f);
      // PDF preview
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewName(sample.name);
    } catch (e) {
      setError(e.message);
    }
    setLoadingSample(null);
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName(null);
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
      clearPreview();
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      stopPolling();
      setProcessing(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Main upload panel ── */}
      <div className={`flex flex-col transition-all duration-300 ${previewUrl || showDb ? 'w-1/2' : 'w-full'} flex-shrink-0 overflow-y-auto`}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">

          {/* Header + DB button */}
          <div className="w-full max-w-md flex items-center justify-between">
            <p className="font-display text-xl uppercase text-[#EDEFFE] tracking-widest">Cargar Planilla</p>
            <button
              onClick={toggleDb}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase border px-2 py-1 transition-colors ${
                showDb
                  ? 'border-[#EDEFFE] text-[#EDEFFE] bg-[#EDEFFE]/10'
                  : 'border-[#EDEFFE]/40 text-[#EDEFFE]/60 hover:border-[#EDEFFE] hover:text-[#EDEFFE]'
              }`}
            >
              <Database className="w-3 h-3" /> Base de datos
            </button>
          </div>

          {/* Drop zone */}
          <div
            className={`w-full max-w-md border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-[#EDEFFE] bg-[#EDEFFE]/10' : 'border-[#EDEFFE]/30 hover:border-[#EDEFFE]/60'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-[#EDEFFE]" />
                <p className="font-sans text-sm text-[#EDEFFE] font-medium truncate max-w-full">{file.name}</p>
                <p className="font-sans text-[10px] text-[#EDEFFE]/50">{(file.size / 1024).toFixed(0)} KB — Click para cambiar</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-[#EDEFFE]/40" />
                <p className="font-sans text-sm text-[#EDEFFE]/60">Arrastrá un PDF o hacé click aquí</p>
              </div>
            )}
          </div>

          {/* Process button */}
          <button
            onClick={handleSubmit}
            disabled={!file || processing}
            className="w-full max-w-md flex items-center justify-center gap-2 bg-[#EDEFFE] text-[#0000FF] border-2 border-[#EDEFFE] py-3 font-display text-lg uppercase tracking-widest hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</> : <><Zap className="w-4 h-4" /> Procesar</>}
          </button>

          {status && processing && (
            <p className="font-sans text-[11px] text-[#EDEFFE]/50 text-center max-w-md">{status}</p>
          )}
          {error && (
            <p className="font-sans text-[11px] text-red-400 text-center max-w-md">{error}</p>
          )}

          {/* Sample files */}
          <div className="w-full max-w-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#EDEFFE]/40 mb-2">Carga rápida</p>
            <div className="flex flex-col gap-2">
              {SAMPLE_FILES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSample(s)}
                  disabled={loadingSample === s.id || processing}
                  className={`flex items-center gap-3 border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                    file?.name === s.file
                      ? 'border-[#EDEFFE] bg-[#EDEFFE]/10'
                      : 'border-[#EDEFFE]/20 hover:border-[#EDEFFE]/60'
                  }`}
                >
                  {loadingSample === s.id
                    ? <Loader2 className="w-4 h-4 text-[#EDEFFE]/50 animate-spin flex-shrink-0" />
                    : <FileText className="w-4 h-4 text-[#EDEFFE]/50 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-medium text-[#EDEFFE] truncate">{s.name}</p>
                    <p className="font-sans text-[10px] text-[#EDEFFE]/50">{s.subtitle}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-[#EDEFFE]/30 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── PDF preview panel ── */}
      {previewUrl && !showDb && (
        <div className="flex-1 flex flex-col border-l-2 border-[#EDEFFE]/20 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEFFE]/20 flex-shrink-0">
            <span className="font-display text-sm uppercase tracking-widest text-[#EDEFFE]/70 truncate">{previewName}</span>
            <button onClick={clearPreview} className="text-[#EDEFFE]/40 hover:text-[#EDEFFE] transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Preview PDF" />
        </div>
      )}

      {/* ── Base de datos panel ── */}
      {showDb && (
        <div className="flex-1 flex flex-col border-l-2 border-[#EDEFFE]/20 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEFFE]/20 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#EDEFFE]/50" />
              <span className="font-display text-sm uppercase tracking-widest text-[#EDEFFE]/70">
                Pacientes registrados {patients.length > 0 && `[${patients.length}]`}
              </span>
            </div>
            <button onClick={() => setShowDb(false)} className="text-[#EDEFFE]/40 hover:text-[#EDEFFE] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {dbLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#EDEFFE]/40 animate-spin" />
              </div>
            )}
            {!dbLoading && patients.length === 0 && (
              <p className="font-sans text-xs text-[#EDEFFE]/40 text-center py-8">Sin pacientes registrados</p>
            )}
            {!dbLoading && patients.map((p) => (
              <div key={p.id} className="border border-[#EDEFFE]/20 bg-[#0000FF]/10 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-sans text-sm font-bold text-[#EDEFFE]">{p.name}</p>
                    <p className="font-sans text-[10px] text-[#EDEFFE]/50">DNI: {p.dni} · {p.coverage}</p>
                  </div>
                </div>
                {p.personnel?.length > 0 && (
                  <div>
                    <p className="font-sans text-[9px] font-bold uppercase tracking-widest text-[#EDEFFE]/30 mb-1">Profesionales asignados</p>
                    <div className="flex flex-wrap gap-1">
                      {p.personnel.map((pp) => (
                        <span key={pp.id} className="font-sans text-[10px] text-[#EDEFFE]/70 border border-[#EDEFFE]/20 px-1.5 py-0.5">
                          {pp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
