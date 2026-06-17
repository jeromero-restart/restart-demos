import { useState } from 'react';
import { X, Copy, Check, Link } from 'lucide-react';
import { generateToken } from '../auth/guestToken';
import { demosData } from '../data/demos';

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '2 horas', value: 120 },
  { label: '4 horas', value: 240 },
  { label: '8 horas', value: 480 },
  { label: '24 horas', value: 1440 },
];

export default function SharePanel({ onClose }) {
  const [selectedDemos, setSelectedDemos] = useState([]);
  const [allDemos, setAllDemos] = useState(true);
  const [duration, setDuration] = useState(60);
  const [label, setLabel] = useState('');
  const [token, setToken] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generating, setGenerating] = useState(false);

  const toggleDemo = (id) => {
    setSelectedDemos(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const demos = allDemos ? 'all' : selectedDemos;
    const t = await generateToken({ demos, durationMinutes: duration, label: label || 'Invitado' });
    setToken(t);
    setGenerating(false);
  };

  const copyToClipboard = async (text, type) => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
    if (type === 'link') { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
  };

  const guestLink = token ? `${window.location.origin}${window.location.pathname}?guest=${token}` : '';

  const canGenerate = allDemos || selectedDemos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1F1F]/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1e22aa] border-2 border-[#EDEFFE] shadow-[12px_12px_0_#1F1F1F] max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-[#1F1F1F] border-b-2 border-[#EDEFFE] p-3 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2 items-center">
            <div className="w-3 h-3 bg-[#EDEFFE] rounded-full animate-pulse"></div>
            <span className="font-display text-lg text-[#EDEFFE] tracking-widest">///_GENERAR_ACCESO</span>
          </div>
          <button onClick={onClose} className="text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#1e22aa] p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6">

          {!token ? (
            <>
              {/* Demos */}
              <div>
                <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#EDEFFE]/70 mb-3">&gt; Demos permitidas</h3>
                <button
                  onClick={() => setAllDemos(true)}
                  className={`w-full text-left px-4 py-3 text-sm font-bold uppercase border-2 mb-2 transition-all ${allDemos ? 'bg-[#EDEFFE] text-[#1e22aa] border-[#EDEFFE]' : 'bg-transparent text-[#EDEFFE] border-[#EDEFFE]/40 hover:border-[#EDEFFE]'}`}
                >
                  {allDemos ? '[ Todas las demos ]' : 'Todas las demos'}
                </button>
                <button
                  onClick={() => setAllDemos(false)}
                  className={`w-full text-left px-4 py-3 text-sm font-bold uppercase border-2 mb-3 transition-all ${!allDemos ? 'bg-[#EDEFFE] text-[#1e22aa] border-[#EDEFFE]' : 'bg-transparent text-[#EDEFFE] border-[#EDEFFE]/40 hover:border-[#EDEFFE]'}`}
                >
                  {!allDemos ? '[ Seleccionar demos ]' : 'Seleccionar demos'}
                </button>

                {!allDemos && (
                  <div className="flex flex-col gap-2 pl-2 border-l-2 border-[#EDEFFE]/30">
                    {demosData.map(demo => (
                      <label key={demo.id} className="flex items-start gap-3 cursor-pointer group">
                        <div
                          onClick={() => toggleDemo(demo.id)}
                          className={`mt-0.5 w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${selectedDemos.includes(demo.id) ? 'bg-[#EDEFFE] border-[#EDEFFE]' : 'border-[#EDEFFE]/50 hover:border-[#EDEFFE]'}`}
                        >
                          {selectedDemos.includes(demo.id) && <span className="text-[#1e22aa] text-xs font-bold leading-none">✓</span>}
                        </div>
                        <span
                          onClick={() => toggleDemo(demo.id)}
                          className={`font-sans text-xs font-medium leading-relaxed transition-colors ${selectedDemos.includes(demo.id) ? 'text-[#EDEFFE]' : 'text-[#EDEFFE]/60 group-hover:text-[#EDEFFE]'}`}
                        >
                          {demo.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Duración */}
              <div>
                <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#EDEFFE]/70 mb-3">&gt; Duración del acceso</h3>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={`py-2 text-xs font-bold uppercase border-2 transition-all ${duration === d.value ? 'bg-[#EDEFFE] text-[#1e22aa] border-[#EDEFFE]' : 'bg-transparent text-[#EDEFFE] border-[#EDEFFE]/40 hover:border-[#EDEFFE]'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div>
                <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#EDEFFE]/70 mb-3">&gt; Etiqueta (opcional)</h3>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="ej: Cliente XYZ"
                  className="w-full bg-[#1F1F1F] border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] px-4 py-3 font-sans text-sm placeholder-[#EDEFFE]/30 focus:outline-none transition-colors"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="w-full bg-[#EDEFFE] text-[#1e22aa] border-2 border-[#EDEFFE] py-4 font-sans font-bold text-sm uppercase tracking-widest hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors shadow-[4px_4px_0_#1F1F1F] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? 'Generando...' : '> Generar código'}
              </button>
            </>
          ) : (
            /* Resultado */
            <div className="flex flex-col gap-4">
              <div className="bg-[#1F1F1F] border-2 border-[#EDEFFE] p-4 text-center">
                <p className="font-sans text-xs font-bold uppercase text-[#EDEFFE]/60 mb-2">Código generado</p>
                <p className="font-display text-sm text-[#EDEFFE] break-all leading-relaxed">{token}</p>
              </div>

              <button
                onClick={() => copyToClipboard(token, 'code')}
                className="w-full flex items-center justify-center gap-2 bg-[#EDEFFE] text-[#1e22aa] border-2 border-[#EDEFFE] py-3 font-sans font-bold text-sm uppercase tracking-widest hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors shadow-[4px_4px_0_#1F1F1F]"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Copiado!' : 'Copiar código'}
              </button>

              <button
                onClick={() => copyToClipboard(guestLink, 'link')}
                className="w-full flex items-center justify-center gap-2 bg-transparent text-[#EDEFFE] border-2 border-[#EDEFFE] py-3 font-sans font-bold text-sm uppercase tracking-widest hover:bg-[#EDEFFE] hover:text-[#1e22aa] transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                {copiedLink ? 'Link copiado!' : 'Copiar link directo'}
              </button>

              <div className="border-t border-[#EDEFFE]/20 pt-4 text-center space-y-1">
                <p className="font-sans text-xs text-[#EDEFFE]/60">
                  Demos: <span className="text-[#EDEFFE] font-bold">{token && (JSON.parse(atob(token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')+'==')).demos === 'all' ? 'Todas' : `${JSON.parse(atob(token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')+'==')).demos.length} seleccionadas`)}</span>
                  {' · '}
                  Expira en: <span className="text-[#EDEFFE] font-bold">{DURATIONS.find(d => d.value === duration)?.label}</span>
                </p>
              </div>

              <button
                onClick={() => setToken(null)}
                className="w-full text-[#EDEFFE]/50 text-xs uppercase tracking-widest py-2 hover:text-[#EDEFFE] transition-colors"
              >
                Generar otro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
