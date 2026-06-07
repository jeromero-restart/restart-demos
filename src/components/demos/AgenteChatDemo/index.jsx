import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, HardHat, ClipboardList, RefreshCw, FileText, ChevronRight } from 'lucide-react';

/**
 * Agente de conocimiento empresarial — chat web (stateless).
 *
 * Habla con el mismo backend RAG que el bot de Telegram vía POST {apiUrl}/chat
 * {role, query}. La respuesta llega segmentada en parts (text | figure); las
 * figuras traen una URL relativa que servimos desde {apiUrl}. El historial vive
 * solo en el navegador.
 */

const ROLES = [
  { key: 'tecnico', label: 'Técnico de Campo', icon: HardHat, desc: 'Respuestas cortas, accionables y con figuras. Optimizado para velocidad en campo.' },
  { key: 'supervisor', label: 'Supervisor', icon: ClipboardList, desc: 'Respuestas detalladas y estructuradas, con referencias a documento y página.' },
];

export default function AgenteChatDemo({ apiUrl, knowledgeBase = [] }) {
  const API = (apiUrl || 'http://localhost:8200').replace(/\/$/, '');
  const [role, setRole] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const threadRef = useRef(null);

  const suggestions = knowledgeBase.flatMap((k) => k.questions || []).slice(0, 4);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const query = (text ?? input).trim();
    if (!query || loading || !role) return;
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: query }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, query }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error en el backend');
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', parts: data.parts || [] }]);
    } catch (e) {
      setError(e.message || 'No se pudo conectar al agente.');
      setMessages((m) => [...m, { role: 'assistant', parts: [{ type: 'text', text: '⚠️ No se pudo obtener respuesta.' }] }]);
    } finally {
      setLoading(false);
    }
  };

  // ----- Pantalla de selección de rol -----
  if (!role) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-6 font-sans">
        <div className="text-center">
          <p className="font-display text-3xl uppercase text-[#EDEFFE] tracking-widest">Elegí tu perfil</p>
          <p className="font-sans text-xs text-[#EDEFFE]/50 mt-2 max-w-sm">
            El agente adapta sus respuestas según quién pregunta.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {ROLES.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => setRole(key)}
              className="text-left border-2 border-[#EDEFFE] bg-[#0000FF]/10 p-4 hover:bg-[#EDEFFE] hover:text-[#0000FF] transition-colors group shadow-[4px_4px_0_#1F1F1F]"
            >
              <Icon className="w-7 h-7 mb-2 text-[#EDEFFE] group-hover:text-[#0000FF]" />
              <p className="font-display text-2xl uppercase leading-none text-[#EDEFFE] group-hover:text-[#0000FF]">{label}</p>
              <p className="font-sans text-[11px] text-[#EDEFFE]/60 group-hover:text-[#0000FF]/80 mt-2 leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const activeRole = ROLES.find((r) => r.key === role);

  return (
    <div className="h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b-2 border-[#EDEFFE]/20 flex-shrink-0">
        <div className="flex items-center gap-2 text-[#EDEFFE]">
          <activeRole.icon className="w-4 h-4" />
          <span className="font-display text-base uppercase tracking-widest">{activeRole.label}</span>
        </div>
        <button
          onClick={() => { setRole(null); setMessages([]); setError(null); }}
          className="flex items-center gap-1 text-[10px] font-bold uppercase border border-[#EDEFFE]/40 px-2 py-1 text-[#EDEFFE]/60 hover:border-[#EDEFFE] hover:text-[#EDEFFE] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Cambiar rol
        </button>
      </div>

      {/* Thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <p className="font-sans text-xs text-[#EDEFFE]/40 max-w-xs">
              Hacé una consulta sobre la documentación técnica.
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="text-left flex items-start gap-2 border border-[#EDEFFE]/20 bg-[#0000FF]/10 px-3 py-2 hover:border-[#EDEFFE] transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-[#EDEFFE]/40 flex-shrink-0 mt-0.5" />
                    <span className="font-sans text-xs text-[#EDEFFE]/70 leading-relaxed">{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] bg-[#EDEFFE] text-[#0000FF] px-3 py-2 font-sans text-sm font-medium">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[85%] flex flex-col gap-2">
                {m.parts.map((p, j) =>
                  p.type === 'figure' ? (
                    <figure key={j} className="border-2 border-[#EDEFFE]/30 bg-[#1F1F1F]">
                      <img src={`${API}${p.url}`} alt={p.label || p.ref} className="w-full max-h-72 object-contain bg-black" />
                      {(p.caption || p.label) && (
                        <figcaption className="px-2 py-1 text-[10px] text-[#EDEFFE]/50 border-t border-[#EDEFFE]/20">
                          {p.label ? `${p.label}: ` : ''}{p.caption}
                        </figcaption>
                      )}
                    </figure>
                  ) : (
                    <div key={j} className="bg-[#1F1F1F] border border-[#EDEFFE]/20 text-[#EDEFFE] px-3 py-2 font-sans text-sm whitespace-pre-wrap leading-relaxed">
                      {p.text}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1F1F1F] border border-[#EDEFFE]/20 px-3 py-2 flex items-center gap-2 text-[#EDEFFE]/60">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-sans text-xs">El agente está pensando…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t-2 border-[#EDEFFE]/20 p-3">
        {error && <p className="font-sans text-[11px] text-red-400 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Escribí tu consulta…"
            disabled={loading}
            className="flex-1 bg-[#0000FF]/10 border-2 border-[#EDEFFE]/30 focus:border-[#EDEFFE] outline-none px-3 py-2 font-sans text-sm text-[#EDEFFE] placeholder-[#EDEFFE]/40 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-[#EDEFFE] text-[#0000FF] border-2 border-[#EDEFFE] px-4 hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
