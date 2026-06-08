import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, HardHat, ClipboardList, RefreshCw, FileText, ChevronRight, BookOpen, X } from 'lucide-react';

/**
 * Agente de conocimiento empresarial — chat web (stateless).
 *
 * POST {apiUrl}/chat {role, query} -> {parts:[text|figure], sources:[{title,page,url}]}.
 * Figuras inline (GET /figure/{id}) y fuentes citables que abren el PDF original en
 * un modal (GET /document/{id}#page=N). GET /documents lista lo que hay indexado.
 */

const ROLES = [
  { key: 'tecnico', label: 'Técnico de Campo', icon: HardHat, desc: 'Respuestas cortas, accionables y con figuras. Optimizado para velocidad en campo.' },
  { key: 'supervisor', label: 'Supervisor', icon: ClipboardList, desc: 'Respuestas detalladas y estructuradas, con referencias a documento y página.' },
];

const WELCOME = {
  tecnico: 'Hola 👷 Veo que sos Técnico de Campo. Hacé tus consultas y te respondo corto y al grano, con imágenes cuando ayuden.',
  supervisor: 'Hola 📋 Veo que sos Supervisor. Consultá lo que necesites y te doy respuestas detalladas, con referencias a documento y página.',
};

export default function AgenteChatDemo({ apiUrl, knowledgeBase = [] }) {
  const API = (apiUrl || 'http://localhost:8200').replace(/\/$/, '');
  const [role, setRole] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docs, setDocs] = useState([]);
  const [showDocs, setShowDocs] = useState(false);
  const [pdf, setPdf] = useState(null); // {url, title}
  const threadRef = useRef(null);

  const suggestions = knowledgeBase.flatMap((k) => k.questions || []).slice(0, 4);

  useEffect(() => {
    fetch(`${API}/documents`)
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d) => setDocs(d.documents || []))
      .catch(() => setDocs([]));
  }, [API]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const chooseRole = (key) => {
    setRole(key);
    setMessages([{ role: 'assistant', parts: [{ type: 'text', text: WELCOME[key] }], sources: [] }]);
  };

  // Flag para rollback inmediato: poné STREAM=false y vuelve al comportamiento previo.
  const STREAM = false;

  const patchLast = (updater) =>
    setMessages((m) => {
      if (!m.length) return m;
      const copy = m.slice();
      copy[copy.length - 1] = updater(copy[copy.length - 1]);
      return copy;
    });

  // Camino clásico (no streaming) — idéntico al original, sirve de fallback.
  const runNonStream = async (query) => {
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, query }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error en el backend');
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', parts: data.parts || [], sources: data.sources || [] }]);
    } catch (e) {
      setError(e.message || 'No se pudo conectar al agente.');
      setMessages((m) => [...m, { role: 'assistant', parts: [{ type: 'text', text: '⚠️ No se pudo obtener respuesta.' }], sources: [] }]);
    }
  };

  // Camino streaming (SSE): meta (figuras+fuentes) → deltas de texto → done.
  const runStream = async (query) => {
    setMessages((m) => [...m, { role: 'assistant', text: '', figures: {}, sources: [], streaming: true }]);
    try {
      const res = await fetch(`${API}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, query }),
      });
      if (!res.ok || !res.body) throw new Error('stream_unavailable');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamErr = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;
          let evt;
          try { evt = JSON.parse(payload); } catch { continue; }
          if (evt.type === 'meta') {
            patchLast((p) => ({ ...p, figures: evt.figures || {}, sources: evt.sources || [] }));
          } else if (evt.type === 'delta') {
            patchLast((p) => ({ ...p, text: (p.text || '') + evt.text }));
          } else if (evt.type === 'error') {
            streamErr = evt.detail || 'error';
          }
        }
      }
      patchLast((p) => ({ ...p, streaming: false }));
      if (streamErr) throw new Error(streamErr);
    } catch (e) {
      // Si el stream falla sin texto, removemos el placeholder y caemos al método clásico.
      let hadText = false;
      setMessages((m) => {
        const last = m[m.length - 1];
        if (last && last.role === 'assistant' && last.streaming !== undefined) {
          hadText = !!(last.text && last.text.trim());
          if (!hadText) return m.slice(0, -1);
          return m.map((x, i) => (i === m.length - 1 ? { ...x, streaming: false } : x));
        }
        return m;
      });
      if (!hadText) await runNonStream(query);
    }
  };

  const send = async (text) => {
    const query = (text ?? input).trim();
    if (!query || loading || !role) return;
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: query }]);
    setLoading(true);
    try {
      if (STREAM) await runStream(query);
      else await runNonStream(query);
    } finally {
      setLoading(false);
    }
  };

  const openDoc = (d) => setPdf({ url: `${API}/document/${d.id}`, title: d.title });

  // Render de un mensaje en streaming: parte el texto por [[FIG:ref]] e intercala figuras.
  const renderStreamed = (m) => {
    let text = m.text || '';
    const nodes = [];
    const re = /\[\[FIG:([^\]]+)\]\]/g;
    let lastIndex = 0, match, k = 0;
    while ((match = re.exec(text)) !== null) {
      const chunk = text.slice(lastIndex, match.index);
      if (chunk.trim()) nodes.push(
        <div key={`t${k}`} className="bg-[#1F1F1F] border border-[#EDEFFE]/20 text-[#EDEFFE] px-3 py-2 font-sans text-sm whitespace-pre-wrap leading-relaxed">{chunk.trim()}</div>
      );
      const fig = m.figures?.[match[1]];
      if (fig) nodes.push(
        <figure key={`f${k}`} className="border-2 border-[#EDEFFE]/30 bg-[#1F1F1F]">
          <img src={`${API}${fig.url}`} alt={fig.label || match[1]} className="w-full max-h-72 object-contain bg-black" />
          {(fig.caption || fig.label) && (
            <figcaption className="px-2 py-1 text-[10px] text-[#EDEFFE]/50 border-t border-[#EDEFFE]/20">
              {fig.label ? `${fig.label}: ` : ''}{fig.caption}
            </figcaption>
          )}
        </figure>
      );
      lastIndex = re.lastIndex;
      k++;
    }
    let tail = text.slice(lastIndex);
    if (m.streaming) tail = tail.replace(/\[\[FIG:[^\]]*$/, ''); // ocultar marcador parcial
    if (tail.trim() || nodes.length === 0) nodes.push(
      <div key="tail" className="bg-[#1F1F1F] border border-[#EDEFFE]/20 text-[#EDEFFE] px-3 py-2 font-sans text-sm whitespace-pre-wrap leading-relaxed">
        {tail}{m.streaming && <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-[#EDEFFE]/70 animate-pulse" />}
      </div>
    );
    return nodes;
  };

  // Modal de PDF — compartido entre la pantalla de selección y el chat
  const pdfModal = pdf && (
    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col p-3 md:p-6" onClick={() => setPdf(null)}>
      <div className="flex items-center justify-between mb-2" onClick={(e) => e.stopPropagation()}>
        <span className="font-display text-base uppercase tracking-widest text-[#EDEFFE] truncate">{pdf.title}</span>
        <button
          onClick={() => setPdf(null)}
          className="flex items-center gap-1 text-xs font-bold uppercase border-2 border-[#EDEFFE] px-3 py-1.5 text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#0000FF] transition-colors"
        >
          <X className="w-4 h-4" /> Cerrar
        </button>
      </div>
      <iframe
        src={pdf.url}
        title={pdf.title}
        className="flex-1 w-full bg-white border-2 border-[#EDEFFE]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

  // ----- Pantalla de selección de rol -----
  if (!role) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-6 font-sans relative overflow-y-auto">
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
              onClick={() => chooseRole(key)}
              className="text-left border-2 border-[#EDEFFE] bg-[#0000FF]/10 p-4 hover:bg-[#EDEFFE] hover:text-[#0000FF] transition-colors group shadow-[4px_4px_0_#1F1F1F]"
            >
              <Icon className="w-7 h-7 mb-2 text-[#EDEFFE] group-hover:text-[#0000FF]" />
              <p className="font-display text-2xl uppercase leading-none text-[#EDEFFE] group-hover:text-[#0000FF]">{label}</p>
              <p className="font-sans text-[11px] text-[#EDEFFE]/60 group-hover:text-[#0000FF]/80 mt-2 leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>

        {/* Base de conocimiento — documentos cargados, clickeables para previsualizar */}
        {docs.length > 0 && (
          <div className="w-full max-w-lg">
            <p className="font-display text-sm uppercase tracking-widest text-[#EDEFFE]/60 mb-2 text-center">
              /// Base de conocimiento · {docs.length} documento{docs.length !== 1 ? 's' : ''}
            </p>
            <p className="font-sans text-[10px] text-[#EDEFFE]/40 text-center mb-3">
              Hacé click en un documento para previsualizarlo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDoc(d)}
                  title="Previsualizar PDF"
                  className="flex items-center gap-2 border border-[#EDEFFE]/30 bg-[#0000FF]/10 px-3 py-2 text-left hover:border-[#EDEFFE] hover:bg-[#EDEFFE]/10 transition-colors group"
                >
                  <FileText className="w-4 h-4 text-[#EDEFFE]/50 group-hover:text-[#EDEFFE] flex-shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-xs text-[#EDEFFE]/80 group-hover:text-[#EDEFFE] truncate">{d.title}</span>
                    {d.pages > 0 && <span className="block font-sans text-[10px] text-[#EDEFFE]/40">{d.pages} pág.</span>}
                  </span>
                  <ChevronRight className="w-3 h-3 text-[#EDEFFE]/30 group-hover:text-[#EDEFFE]/70 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {pdfModal}
      </div>
    );
  }

  const activeRole = ROLES.find((r) => r.key === role);
  const onlyWelcome = messages.length <= 1;

  return (
    <div className="h-full flex flex-col font-sans relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b-2 border-[#EDEFFE]/20 flex-shrink-0">
        <div className="flex items-center gap-2 text-[#EDEFFE]">
          <activeRole.icon className="w-4 h-4" />
          <span className="font-display text-base uppercase tracking-widest">{activeRole.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDocs((v) => !v)}
            className={`flex items-center gap-1 text-[10px] font-bold uppercase border px-2 py-1 transition-colors ${
              showDocs ? 'border-[#EDEFFE] text-[#EDEFFE] bg-[#EDEFFE]/10' : 'border-[#EDEFFE]/40 text-[#EDEFFE]/60 hover:border-[#EDEFFE] hover:text-[#EDEFFE]'
            }`}
          >
            <BookOpen className="w-3 h-3" /> {docs.length} docs
          </button>
          <button
            onClick={() => { setRole(null); setMessages([]); setError(null); setShowDocs(false); }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase border border-[#EDEFFE]/40 px-2 py-1 text-[#EDEFFE]/60 hover:border-[#EDEFFE] hover:text-[#EDEFFE] transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Cambiar rol
          </button>
        </div>
      </div>

      {/* Panel documentos cargados */}
      {showDocs && (
        <div className="border-b-2 border-[#EDEFFE]/20 bg-[#0000FF]/10 px-4 py-3">
          <p className="font-display text-sm uppercase tracking-widest text-[#EDEFFE]/70 mb-2">/// Documentos cargados</p>
          {docs.length === 0 ? (
            <p className="font-sans text-xs text-[#EDEFFE]/40">No hay documentos indexados.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {docs.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => openDoc(d)}
                    title="Previsualizar PDF"
                    className="w-full flex items-center gap-2 font-sans text-xs text-[#EDEFFE]/80 px-2 py-1 -mx-2 hover:bg-[#EDEFFE]/10 hover:text-[#EDEFFE] transition-colors text-left group"
                  >
                    <FileText className="w-3 h-3 text-[#EDEFFE]/50 group-hover:text-[#EDEFFE] flex-shrink-0" />
                    <span className="flex-1 truncate">{d.title}</span>
                    {d.pages > 0 && <span className="text-[#EDEFFE]/40">{d.pages} pág.</span>}
                    <ChevronRight className="w-3 h-3 text-[#EDEFFE]/30 group-hover:text-[#EDEFFE]/70 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] bg-[#EDEFFE] text-[#0000FF] px-3 py-2 font-sans text-sm font-medium">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[85%] flex flex-col gap-2">
                {m.text !== undefined ? renderStreamed(m) : m.parts.map((p, j) =>
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
                {m.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {m.sources.map((s, k) => (
                      <button
                        key={k}
                        onClick={() => setPdf({ url: `${API}${s.url}`, title: s.title })}
                        title="Ver fuente en el PDF"
                        className="flex items-center gap-1 text-[10px] font-bold border border-[#EDEFFE]/30 text-[#EDEFFE]/70 px-2 py-1 hover:border-[#EDEFFE] hover:text-[#EDEFFE] hover:bg-[#EDEFFE]/10 transition-colors"
                      >
                        <FileText className="w-3 h-3" /> {s.title} · pág. {s.page}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Sugerencias bajo la bienvenida */}
        {onlyWelcome && suggestions.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-w-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#EDEFFE]/40">Probá preguntar</p>
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

        {loading && !(messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.streaming !== undefined) && (
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

      {/* Modal de PDF */}
      {pdfModal}
    </div>
  );
}
