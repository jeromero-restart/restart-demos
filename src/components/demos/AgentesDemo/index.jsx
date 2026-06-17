import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation } from '@elevenlabs/client';
import { Phone, Loader, AlertCircle, CheckCircle, Zap, Clock, ChevronDown, ChevronUp, RefreshCw, Volume2, Square, Users, Tag, Plus, Trash2, Mic, MicOff } from 'lucide-react';

const TEMPERATURE_LABELS = {
  low:    { max: 0.35, label: 'Conservador', desc: 'Respuestas predecibles y consistentes' },
  medium: { max: 0.65, label: 'Balanceado',  desc: 'Equilibrio entre creatividad y precisión' },
  high:   { max: 1.00, label: 'Creativo',    desc: 'Respuestas más variadas y espontáneas' },
};

function temperatureLabel(val) {
  if (val <= 0.35) return TEMPERATURE_LABELS.low;
  if (val <= 0.65) return TEMPERATURE_LABELS.medium;
  return TEMPERATURE_LABELS.high;
}

const CALL_STATUS = {
  IDLE:        'idle',
  CONFIGURING: 'configuring',
  CALLING:     'calling',
  SUCCESS:     'success',
  ERROR:       'error',
};

const PRESETS = [
  {
    id: 'cobranza',
    name: 'Agente de Cobranza',
    description: 'Valida al titular, acuerda fecha de pago y registra los datos',
    temperature: 0.3,
    data_collection: [
      { identifier: 'titular_validado', type: 'boolean', description: 'true si la persona confirmó ser el titular de la cuenta; false si no se pudo validar la identidad.' },
      { identifier: 'intencion_pago',   type: 'string',  description: 'Intención de pago del cliente durante la llamada.', enum: ['Va a pagar', 'No puede pagar ahora', 'A evaluar'] },
      { identifier: 'fecha_pago',       type: 'string',  description: 'Fecha comprometida o tentativa de pago que indica el cliente (ej. "viernes", "15/06"). Vacío si no acordó ninguna.' },
      { identifier: 'monto_modalidad',  type: 'string',  description: 'Monto o modalidad que el cliente se compromete a pagar (total, parcial, en cuotas). Vacío si no lo especificó.' },
    ],
    first_message: '¡Hola, buen día! Le habla Sandra, de Financiera Aurora. ¿Estoy hablando con el titular de la cuenta?',
    prompt: `Sos Sandra, agente de cobranzas de Financiera Aurora. Llamás a un cliente que tiene una cuota vencida para acordar el pago, de forma cordial y profesional.

Flujo de la llamada:
1. Validá que estás hablando con el titular antes de dar cualquier detalle de la deuda.
2. Informá de forma breve que figura una cuota vencida y consultá si puede regularizarla.
3. Acordá una fecha concreta de pago (o una tentativa), y registrá su intención y el monto/modalidad.
4. Confirmá lo acordado, agradecé y cerrá la llamada.

Reglas:
- Hablá en español rioplatense (voseo y modismos de Argentina), nunca en español neutro.
- Tono empático y profesional, nunca agresivo ni intimidante.
- No des información de la deuda si no confirmaste la identidad del titular.
- Si no puede pagar, registralo sin presionar y ofrecé que un asesor lo recontacte.
- Sé breve: la llamada no debe superar los 3 minutos.`,
  },
  {
    id: 'encuesta',
    name: 'Encuestador de Satisfacción',
    description: 'Mide NPS y recopila feedback de clientes',
    temperature: 0.2,
    first_message: '¡Hola! Mi nombre es Sofía y llamo de parte del equipo de calidad. ¿Tiene dos minutos para responder una breve encuesta sobre su experiencia con nosotros?',
    prompt: `Sos un encuestador telefónico de satisfacción al cliente. Tu objetivo es obtener feedback genuino y puntajes NPS de forma natural y conversacional.

Preguntas a realizar en este orden:
1. "En una escala del 1 al 10, ¿qué tan satisfecho/a estás con nuestro servicio en general?"
2. "¿Qué es lo que más valorás de nosotros?"
3. "¿Hay algo puntual que mejorarías o que te haya generado alguna incomodidad?"
4. "¿Nos recomendarías a un familiar o amigo? ¿Por qué?"

Instrucciones:
- Esperá la respuesta completa antes de pasar a la siguiente pregunta
- Si el puntaje es 6 o menos, preguntá específicamente qué falló
- Respondé con empatía ante críticas ("gracias por la honestidad, eso nos ayuda mucho a mejorar")
- No defientas a la empresa si hay quejas, solo registrá y agradecé
- Al finalizar, agradecé y avisá que el feedback será compartido con el equipo
- Duración máxima: 3 minutos`,
  },
  {
    id: 'retencion',
    name: 'Retención de Bajas',
    description: 'Evita cancelaciones con ofertas personalizadas',
    temperature: 0.5,
    first_message: '¡Hola, buen día! Habla Lucía del equipo de atención al cliente. Me comunico porque vimos que iniciaste una solicitud de baja de tu servicio y quería entender qué pasó para ver si podemos ayudarte.',
    prompt: `Sos un agente especializado en retención de clientes. Tu objetivo es evitar la cancelación del servicio escuchando activamente y ofreciendo soluciones concretas.

Flujo de la llamada:
1. Escuchá sin interrumpir el motivo de la baja — dejá que el cliente se exprese completamente
2. Validá su experiencia con empatía genuina ("entiendo perfectamente, lamento que hayas vivido eso")
3. Según el motivo identificado, ofrecé una solución específica:
   - Precio elevado → ofrecé descuento del 20-30% por 3 meses o plan más económico
   - Falta de uso → mostrá 1 o 2 funcionalidades clave que quizás no conoce
   - Problema técnico → prometé escalado prioritario con seguimiento personal
   - Mala atención previa → pedí disculpas directas y ofrecé compensación concreta
   - Se va a la competencia → preguntá qué ofrece el competidor y evaluá si podés igualar
4. Si acepta quedarse, confirmá los beneficios acordados con claridad
5. Si definitivamente no acepta, cerrá de forma amigable y dejá la puerta abierta

Reglas importantes:
- Nunca presiones ni repitas la oferta más de dos veces
- El cliente debe sentir que la decisión es completamente suya
- No hagas promesas que no podás cumplir`,
  },
  {
    id: 'leads',
    name: 'Calificador de Leads',
    description: 'Captura datos de potenciales clientes y califica el interés',
    temperature: 0.45,
    data_collection: [
      { identifier: 'nombre',      type: 'string', description: 'Nombre completo del potencial cliente.' },
      { identifier: 'empresa',     type: 'string', description: 'Empresa u organización del cliente, si la menciona.' },
      { identifier: 'necesidad',   type: 'string', description: 'Necesidad o problema principal que quiere resolver.' },
      { identifier: 'presupuesto', type: 'string', description: 'Presupuesto aproximado disponible que menciona el cliente.' },
      { identifier: 'urgencia',    type: 'string', description: 'Nivel de urgencia para avanzar.', enum: ['Inmediata', 'Próximos 3 meses', 'Explorando'] },
      { identifier: 'email',       type: 'string', description: 'Email de contacto para el seguimiento.' },
    ],
    first_message: '¡Hola! Soy Valentina, asesora comercial. Me comunico para contarte sobre nuestros servicios. ¿Tenés un momento?',
    prompt: `Sos un agente de calificación de leads comerciales. Tu objetivo es recopilar información clave del potencial cliente de forma natural y conversacional, sin que parezca un interrogatorio.

Datos que debés obtener durante la conversación:
1. Nombre completo
2. Empresa u organización (si aplica)
3. Necesidad principal o problema que quiere resolver
4. Presupuesto aproximado disponible
5. Urgencia (inmediata / en los próximos 3 meses / explorando)
6. Email de contacto para el seguimiento

Flujo recomendado:
- Presentate y generá confianza antes de preguntar
- Hacé preguntas abiertas, una por vez
- Adaptá el tono según las respuestas del cliente
- Si el cliente no quiere dar algún dato, no insistas y pasá al siguiente
- Al finalizar, confirmá que un asesor humano lo contactará dentro de las 24hs

Reglas:
- Nunca mencionés montos ni prometé descuentos sin autorización
- Si el cliente pregunta precios, decí que el asesor le enviará una propuesta personalizada
- La llamada no debe durar más de 5 minutos`,
  },
  {
    id: 'citas',
    name: 'Coordinador de Citas',
    description: 'Agenda, confirma y reprograma turnos',
    temperature: 0.25,
    first_message: '¡Hola! Habla Rodrigo del equipo de coordinación. Lo llamo para gestionar su turno. ¿Me puede confirmar su nombre completo?',
    prompt: `Sos un coordinador de citas telefónico. Tu objetivo es agendar, confirmar o reprogramar turnos de forma clara, precisa y eficiente.

Flujo principal:
1. Confirmá el nombre completo del cliente
2. Identificá si quiere: agendar un turno nuevo, confirmar uno existente o reprogramar
3. Para turno nuevo:
   - Consultá preferencia de horario (mañana/tarde) y días disponibles
   - Ofrecé exactamente 2 opciones de fecha y hora concretas
   - Confirmá la opción elegida
4. Para reprogramación: primero cancelá el turno anterior, luego seguí el flujo de turno nuevo
5. Antes de cerrar, confirmá: nombre, fecha, hora y motivo de la consulta
6. Informá si hay alguna preparación necesaria para el turno

Reglas de comportamiento:
- Usá siempre fecha y hora exactas, nunca términos vagos como "a la tarde" o "en unos días"
- Si no hay disponibilidad en la fecha pedida, ofrecé la más cercana disponible
- Repetí los datos del turno confirmado al final para evitar errores
- La llamada debe ser breve y eficiente, no más de 3 minutos`,
  },
];

export default function AgentesDemo({ apiUrl }) {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [voices, setVoices]         = useState([]);

  const [prompt, setPrompt]         = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [temperature, setTemperature]   = useState(0.7);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [activePreset, setActivePreset]   = useState(null);
  const [dataCollection, setDataCollection] = useState([]);
  const [playingId, setPlayingId]         = useState(null);
  const audioRef = useRef(null);

  const [phone, setPhone]           = useState('');

  // History
  const [tab, setTab]                     = useState('config');
  const [conversations, setConversations] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId]       = useState(null);
  const [transcripts, setTranscripts]     = useState({});
  const [callStatus, setCallStatus] = useState(CALL_STATUS.IDLE);
  const [callError, setCallError]   = useState('');

  // Test por navegador (micrófono)
  const [webStatus, setWebStatus] = useState('idle'); // idle | connecting | active
  const [webError, setWebError]   = useState('');
  const [agentMode, setAgentMode] = useState('listening'); // speaking | listening
  const convRef = useRef(null);

  // cortar la sesión si se desmonta el componente
  useEffect(() => () => { try { convRef.current?.endSession?.(); } catch (_) {} }, []);

  // Leads
  const [leads, setLeads]           = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const promptRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`${apiUrl}/api/agent`).then(r => r.json()),
      fetch(`${apiUrl}/api/voices`).then(r => r.json()),
    ])
      .then(([agentData, voicesData]) => {
        setPrompt(agentData.prompt || '');
        setFirstMessage(agentData.first_message || '');
        setTemperature(agentData.temperature ?? 0.7);
        setDataCollection(agentData.data_collection || []);
        const list = voicesData.voices || [];
        setVoices(list);
        const current = list.find(v => v.id === agentData.voice_id) || list[0] || null;
        setSelectedVoice(current);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [apiUrl]);

  const togglePlay = (voice, e) => {
    e.stopPropagation();
    if (playingId === voice.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); }
    const audio = new Audio(voice.preview_url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(voice.id);
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await fetch(`${apiUrl}/api/conversations`);
      const data = await r.json();
      setConversations(data.conversations || []);
    } catch (_) {}
    setHistoryLoading(false);
  }, [apiUrl]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const r = await fetch(`${apiUrl}/api/leads`);
      const data = await r.json();
      setLeads(data.leads || []);
    } catch (_) {}
    setLeadsLoading(false);
  }, [apiUrl]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'leads') loadLeads();
  }, [tab, loadHistory, loadLeads]);

  const loadTranscript = async (id) => {
    if (transcripts[id]) { setExpandedId(expandedId === id ? null : id); return; }
    try {
      const r = await fetch(`${apiUrl}/api/conversations/${id}`);
      const data = await r.json();
      setTranscripts(prev => ({ ...prev, [id]: data.transcript || [] }));
      setExpandedId(id);
    } catch (_) {}
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setPrompt(preset.prompt);
    setFirstMessage(preset.first_message);
    setTemperature(preset.temperature);
    setDataCollection(preset.data_collection ? preset.data_collection.map(f => ({ ...f })) : []);
  };

  const addField    = () => setDataCollection(d => [...d, { identifier: '', type: 'string', description: '' }]);
  const removeField = (i) => setDataCollection(d => d.filter((_, idx) => idx !== i));
  const updateField = (i, key, val) => setDataCollection(d => d.map((f, idx) => idx === i ? { ...f, [key]: val } : f));

  // Config compartida entre la llamada telefónica y el test por navegador
  const buildAgentPayload = () => ({
    prompt,
    first_message: firstMessage,
    temperature,
    voice_id: selectedVoice?.id,
    data_collection: dataCollection
      .filter(f => f.identifier.trim())
      .map(f => ({
        identifier: f.identifier.trim(),
        type: f.type || 'string',
        description: f.description || '',
        ...(f.enum && f.enum.length ? { enum: f.enum } : {}),
      })),
  });

  // ── Test por navegador (micrófono) ──
  const startWebSession = async () => {
    if (!selectedVoice || webStatus !== 'idle') return;
    setWebError('');
    setWebStatus('connecting');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch(`${apiUrl}/api/web-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAgentPayload()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'No se pudo iniciar la sesión');
      }
      const { signed_url } = await res.json();
      if (!signed_url) throw new Error('Sesión no disponible');
      convRef.current = await Conversation.startSession({
        signedUrl: signed_url,
        onConnect:    () => setWebStatus('active'),
        onDisconnect: () => { setWebStatus('idle'); convRef.current = null; },
        onModeChange: ({ mode }) => setAgentMode(mode),
        onError:      (msg) => setWebError(typeof msg === 'string' ? msg : 'Error de conexión'),
      });
    } catch (e) {
      setWebError(e.name === 'NotAllowedError' ? 'Permiso de micrófono denegado' : e.message);
      setWebStatus('idle');
    }
  };

  const endWebSession = async () => {
    try { await convRef.current?.endSession(); } catch (_) {}
    convRef.current = null;
    setWebStatus('idle');
  };

  const handleCall = async () => {
    if (!phone.trim() || !selectedVoice) return;
    setCallStatus(CALL_STATUS.CONFIGURING);
    setCallError('');
    try {
      const res = await fetch(`${apiUrl}/api/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), ...buildAgentPayload() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Error al disparar la llamada');
      }
      setCallStatus(CALL_STATUS.SUCCESS);
      setTimeout(() => setCallStatus(CALL_STATUS.IDLE), 5000);
    } catch (e) {
      setCallError(e.message);
      setCallStatus(CALL_STATUS.ERROR);
    }
  };

  const tempInfo = temperatureLabel(temperature);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full text-[#EDEFFE]">
      <div className="text-center">
        <Loader className="w-10 h-10 animate-spin mx-auto mb-3 opacity-60" />
        <div className="font-display text-2xl uppercase animate-pulse">Cargando agente...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center h-full text-[#EDEFFE] p-8">
      <div className="border-2 border-red-400 bg-[#1F1F1F] p-6 max-w-md text-center shadow-[6px_6px_0_#EDEFFE]">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="font-sans text-sm mb-4">{error}</p>
      </div>
    </div>
  );

  const statusLabel = (s) => ({ done: 'Completada', in_progress: 'En curso', error: 'Error' }[s] || s);
  const statusColor = (s) => ({ done: 'text-green-400', in_progress: 'text-yellow-400', error: 'text-red-400' }[s] || 'text-[#EDEFFE]/40');
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-[#EDEFFE]">

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex border-b-2 border-[#EDEFFE] flex-shrink-0">
        {[['config', 'Configurar'], ['leads', 'Repositorios de datos'], ['history', 'Historial']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-6 py-3 font-display text-sm uppercase tracking-wide transition-colors ${
              tab === key
                ? 'bg-[#EDEFFE] text-[#1e22aa]'
                : 'text-[#EDEFFE]/60 hover:text-[#EDEFFE]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Leads panel ────────────────────────────────────────────────────── */}
      {tab === 'leads' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex justify-between items-center mb-1">
            <span className="font-display text-lg uppercase">// Repositorios de datos</span>
            <button onClick={loadLeads} className="flex items-center gap-1.5 text-[#EDEFFE]/50 hover:text-[#EDEFFE] transition-colors text-xs font-bold uppercase">
              <RefreshCw className={`w-3.5 h-3.5 ${leadsLoading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>
          <p className="text-[11px] text-[#EDEFFE]/40 font-sans mb-4">Datos capturados en la última llamada registrada.</p>

          {leadsLoading && (
            <div className="flex items-center gap-2 text-[#EDEFFE]/50 text-sm">
              <Loader className="w-4 h-4 animate-spin" /> Cargando datos...
            </div>
          )}

          {!leadsLoading && leads.length === 0 && (
            <div className="text-[#EDEFFE]/40 text-sm font-sans text-center py-16">
              No hay registros aún. Realizá una llamada con el preset "Calificador de Leads".
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...leads].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 1).map(lead => {
              const dc = lead.data_collection || {};
              const fields = Object.entries(dc);
              return (
                <div key={lead.id} className="border-2 border-[#EDEFFE]/20 bg-[#1e22aa]/10 flex flex-col">
                  {/* Card header */}
                  <div className="px-4 py-3 border-b border-[#EDEFFE]/10 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display text-base uppercase truncate text-[#EDEFFE]">
                        {dc['nombre']?.value || dc['name']?.value || lead.phone}
                      </div>
                      <div className="font-sans text-[10px] text-[#EDEFFE]/40 mt-0.5">{fmtDate(lead.date)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[10px] font-bold uppercase ${statusColor(lead.status)}`}>
                        {statusLabel(lead.status)}
                      </span>
                      <div className="font-mono text-[10px] text-[#EDEFFE]/40 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />{lead.duration}
                      </div>
                    </div>
                  </div>

                  {/* Data collection fields */}
                  <div className="flex-1 px-4 py-3 flex flex-col gap-2">
                    {fields.length === 0 && (
                      <p className="text-[10px] text-[#EDEFFE]/30 font-sans italic">Sin datos recopilados</p>
                    )}
                    {fields.map(([key, { value, rationale }]) => (
                      <div key={key}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Tag className="w-2.5 h-2.5 text-[#EDEFFE]/40 flex-shrink-0" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#EDEFFE]/40">{key}</span>
                        </div>
                        <div className="text-xs font-sans text-[#EDEFFE] pl-4">
                          {value != null && value !== '' ? String(value) : <span className="text-[#EDEFFE]/30 italic">No obtenido</span>}
                        </div>
                        {rationale && (
                          <div className="text-[9px] text-[#EDEFFE]/30 font-sans pl-4 mt-0.5 leading-tight">{rationale}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-[#EDEFFE]/10">
                    <div className="text-[9px] font-mono text-[#EDEFFE]/25 truncate">{lead.phone} · {lead.message_count} msgs</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── History panel ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="font-display text-lg uppercase">// Transcripciones</span>
            <button onClick={loadHistory} className="flex items-center gap-1.5 text-[#EDEFFE]/50 hover:text-[#EDEFFE] transition-colors text-xs font-bold uppercase">
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>

          {historyLoading && (
            <div className="flex items-center gap-2 text-[#EDEFFE]/50 text-sm">
              <Loader className="w-4 h-4 animate-spin" /> Cargando...
            </div>
          )}

          {!historyLoading && conversations.length === 0 && (
            <div className="text-[#EDEFFE]/40 text-sm font-sans text-center py-16">
              No hay llamadas registradas aún.
            </div>
          )}

          <div className="flex flex-col gap-2">
            {conversations.map(conv => (
              <div key={conv.id} className="border-2 border-[#EDEFFE]/20 hover:border-[#EDEFFE]/40 transition-colors">
                <button
                  className="w-full text-left p-4 flex items-center gap-4"
                  onClick={() => loadTranscript(conv.id)}
                >
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Teléfono</div>
                      <div className="font-display text-base">{conv.phone}</div>
                    </div>
                    <div>
                      <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Fecha y hora</div>
                      <div className="font-sans text-xs">{fmtDate(conv.date)}</div>
                    </div>
                    <div>
                      <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Duración</div>
                      <div className="font-mono text-sm flex items-center gap-1"><Clock className="w-3 h-3" />{conv.duration}</div>
                    </div>
                    <div>
                      <div className="text-[#EDEFFE]/40 text-[10px] uppercase font-bold mb-0.5">Estado</div>
                      <div className={`text-xs font-bold uppercase ${statusColor(conv.status)}`}>{statusLabel(conv.status)}</div>
                    </div>
                  </div>
                  {expandedId === conv.id
                    ? <ChevronUp className="w-4 h-4 text-[#EDEFFE]/40 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-[#EDEFFE]/40 flex-shrink-0" />}
                </button>

                {expandedId === conv.id && (
                  <div className="border-t-2 border-[#EDEFFE]/10 px-4 py-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {!transcripts[conv.id] && (
                      <div className="flex items-center gap-2 text-[#EDEFFE]/40 text-xs">
                        <Loader className="w-3 h-3 animate-spin" /> Cargando transcripción...
                      </div>
                    )}
                    {(transcripts[conv.id] || []).map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === 'agent' ? '' : 'flex-row-reverse'}`}>
                        <span className={`text-[10px] font-bold uppercase flex-shrink-0 mt-1 w-12 ${msg.role === 'agent' ? 'text-[#EDEFFE]/40' : 'text-[#1e22aa] text-right'}`}>
                          {msg.role === 'agent' ? 'Agente' : 'Cliente'}
                        </span>
                        <div className={`text-xs font-sans px-3 py-2 max-w-[75%] border ${
                          msg.role === 'agent'
                            ? 'bg-[#1e22aa]/20 border-[#EDEFFE]/20 text-[#EDEFFE]'
                            : 'bg-[#EDEFFE]/10 border-[#EDEFFE]/30 text-[#EDEFFE]'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Config panel ───────────────────────────────────────────────────── */}
      {tab === 'config' && (
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

      {/* ── Left: Agent config ─────────────────────────────────────────────── */}
      <div className="flex-[3] overflow-y-auto p-5 flex flex-col gap-6 border-b-2 lg:border-b-0 lg:border-r-2 border-[#EDEFFE]">

        {/* Presets */}
        <div>
          <label className="block font-display text-lg uppercase mb-2">
            // PRESETS
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 border-2 transition-all ${
                  activePreset === preset.id
                    ? 'bg-[#EDEFFE] text-[#1e22aa] border-[#EDEFFE] shadow-[4px_4px_0_#1e22aa]'
                    : 'bg-[#1e22aa]/10 text-[#EDEFFE] border-[#EDEFFE]/30 hover:border-[#EDEFFE] hover:bg-[#1e22aa]/20'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className={`w-3 h-3 flex-shrink-0 ${activePreset === preset.id ? 'text-[#1e22aa]' : 'text-[#EDEFFE]/50'}`} />
                  <span className="font-display text-sm uppercase leading-tight">{preset.name}</span>
                </div>
                <p className={`font-sans text-[11px] leading-tight ${activePreset === preset.id ? 'text-[#1e22aa]/70' : 'text-[#EDEFFE]/50'}`}>
                  {preset.description}
                </p>
              </button>
            ))}
            <button
              onClick={() => { setActivePreset(null); setPrompt(''); setFirstMessage(''); setTemperature(0.7); }}
              className={`text-left p-3 border-2 border-dashed transition-all ${
                activePreset === null && !prompt
                  ? 'border-[#EDEFFE] text-[#EDEFFE]'
                  : 'border-[#EDEFFE]/30 text-[#EDEFFE]/50 hover:border-[#EDEFFE]/60 hover:text-[#EDEFFE]/80'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-display text-sm uppercase leading-tight">+ Personalizado</span>
              </div>
              <p className="font-sans text-[11px] leading-tight">Escribir prompt desde cero</p>
            </button>
          </div>
        </div>

        {/* System prompt */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="font-display text-lg uppercase">// SYSTEM PROMPT</label>
            {activePreset && (
              <span className="text-[10px] font-bold uppercase text-[#EDEFFE]/40 font-mono">
                preset: {PRESETS.find(p => p.id === activePreset)?.name}
              </span>
            )}
          </div>
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={e => { setPrompt(e.target.value); setActivePreset(null); }}
            rows={8}
            className="w-full bg-[#1e22aa]/20 border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] placeholder-[#EDEFFE]/30 font-sans text-sm p-3 resize-none focus:outline-none transition-colors"
            placeholder="Describí el rol, objetivo y comportamiento del agente, o seleccioná un preset arriba..."
          />
          <div className="flex justify-end mt-1">
            <span className="text-[10px] text-[#EDEFFE]/40 font-mono">{prompt.length} caracteres</span>
          </div>
        </div>

        {/* First message */}
        <div>
          <label className="block font-display text-lg uppercase mb-2">
            // PRIMER MENSAJE
          </label>
          <input
            type="text"
            value={firstMessage}
            onChange={e => setFirstMessage(e.target.value)}
            className="w-full bg-[#1e22aa]/20 border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] placeholder-[#EDEFFE]/30 font-sans text-sm px-3 py-2.5 focus:outline-none transition-colors"
            placeholder="Hola, te llamo de parte de..."
          />
          <p className="text-[10px] text-[#EDEFFE]/40 mt-1 font-sans">
            Lo primero que dice el agente al ser atendido
          </p>
        </div>

        {/* Data collection */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="font-display text-lg uppercase">// Repositorios de datos</label>
            <button
              onClick={addField}
              className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#EDEFFE]/60 hover:text-[#EDEFFE] border border-[#EDEFFE]/30 hover:border-[#EDEFFE] px-2 py-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Campo
            </button>
          </div>
          <p className="text-[10px] text-[#EDEFFE]/40 mb-2 font-sans">
            Datos que el agente extraerá automáticamente de cada llamada.
          </p>

          {dataCollection.length === 0 && (
            <p className="text-[11px] text-[#EDEFFE]/30 font-sans italic border border-dashed border-[#EDEFFE]/20 p-3 text-center">
              Sin campos. El agente no capturará datos estructurados.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {dataCollection.map((f, i) => (
              <div key={i} className="border border-[#EDEFFE]/20 bg-[#1e22aa]/10 p-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-[#EDEFFE]/40 flex-shrink-0" />
                  <input
                    type="text"
                    value={f.identifier}
                    onChange={e => updateField(i, 'identifier', e.target.value)}
                    placeholder="identificador (ej. email)"
                    className="flex-1 bg-[#1e22aa]/20 border border-[#EDEFFE]/30 focus:border-[#EDEFFE] text-[#EDEFFE] placeholder-[#EDEFFE]/30 font-mono text-xs px-2 py-1 focus:outline-none"
                  />
                  <select
                    value={f.type}
                    onChange={e => updateField(i, 'type', e.target.value)}
                    className="bg-[#1F1F1F] border border-[#EDEFFE]/30 focus:border-[#EDEFFE] text-[#EDEFFE] text-[11px] px-1.5 py-1 focus:outline-none"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                  <button
                    onClick={() => removeField(i)}
                    className="text-[#EDEFFE]/40 hover:text-red-400 transition-colors p-1"
                    title="Quitar campo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={f.description}
                  onChange={e => updateField(i, 'description', e.target.value)}
                  placeholder="Instrucción de extracción para el modelo..."
                  className="w-full bg-[#1e22aa]/20 border border-[#EDEFFE]/20 focus:border-[#EDEFFE]/60 text-[#EDEFFE]/80 placeholder-[#EDEFFE]/30 font-sans text-[11px] px-2 py-1 focus:outline-none"
                />
                {f.enum && f.enum.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-1">
                    {f.enum.map((opt, oi) => (
                      <span key={oi} className="text-[9px] font-mono text-[#EDEFFE]/50 border border-[#EDEFFE]/20 px-1 py-0.5">{opt}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="font-display text-lg uppercase">// TEMPERATURA</label>
            <div className="text-right">
              <span className="font-display text-base text-[#EDEFFE]">{tempInfo.label}</span>
              <span className="font-display text-sm text-[#EDEFFE]/50 ml-2">{temperature.toFixed(2)}</span>
            </div>
          </div>
          <input
            type="range"
            min="0" max="1" step="0.01"
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-[#EDEFFE] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#EDEFFE]/40 font-sans mt-1">
            <span>Conservador</span>
            <span>{tempInfo.desc}</span>
            <span>Creativo</span>
          </div>
        </div>

        {/* Voice selector */}
        <div>
          <label className="block font-display text-lg uppercase mb-2">// VOZ</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {voices.map(voice => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice)}
                className={`text-left p-3 border-2 transition-all ${
                  selectedVoice?.id === voice.id
                    ? 'bg-[#EDEFFE] text-[#1e22aa] border-[#EDEFFE] shadow-[4px_4px_0_#1F1F1F]'
                    : 'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE]/30 hover:border-[#EDEFFE]'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-display text-base uppercase">{voice.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold border px-1.5 py-0.5 uppercase ${
                      selectedVoice?.id === voice.id
                        ? 'border-[#1e22aa] text-[#1e22aa]'
                        : 'border-[#EDEFFE]/30 text-[#EDEFFE]/50'
                    }`}>
                      {voice.gender}
                    </span>
                    {voice.preview_url && (
                      <button
                        onClick={(e) => togglePlay(voice, e)}
                        title={playingId === voice.id ? 'Detener' : 'Escuchar preview'}
                        className={`p-1 border transition-colors ${
                          playingId === voice.id
                            ? selectedVoice?.id === voice.id
                              ? 'border-[#1e22aa] text-[#1e22aa] bg-[#1e22aa]/10'
                              : 'border-[#EDEFFE] text-[#EDEFFE] bg-[#EDEFFE]/10'
                            : selectedVoice?.id === voice.id
                              ? 'border-[#1e22aa]/40 text-[#1e22aa]/60 hover:border-[#1e22aa]'
                              : 'border-[#EDEFFE]/20 text-[#EDEFFE]/40 hover:border-[#EDEFFE]/60'
                        }`}
                      >
                        {playingId === voice.id
                          ? <Square className="w-2.5 h-2.5" />
                          : <Volume2 className="w-2.5 h-2.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <p className={`font-sans text-xs ${
                  selectedVoice?.id === voice.id ? 'text-[#1e22aa]/70' : 'text-[#EDEFFE]/60'
                }`}>
                  {voice.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Call panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-5 gap-5 bg-[#1F1F1F] min-w-[240px]">

        {/* Summary */}
        <div className="border-2 border-[#EDEFFE]/20 p-4 flex flex-col gap-2">
          <h3 className="font-display text-lg uppercase text-[#EDEFFE] border-b border-[#EDEFFE]/20 pb-2 mb-1">
            // CONFIG ACTIVA
          </h3>
          <Row label="Preset" value={activePreset ? PRESETS.find(p => p.id === activePreset)?.name : 'Personalizado'} />
          <Row label="Voz" value={selectedVoice?.name || '—'} />
          <Row label="Temperatura" value={`${tempInfo.label} (${temperature.toFixed(2)})`} />
          <Row label="Idioma" value="Español" />
          <Row label="Prompt" value={`${prompt.length} caracteres`} />
          <Row label="Data collection" value={`${dataCollection.filter(f => f.identifier.trim()).length} campos`} />
        </div>

        {/* Phone input */}
        <div className="flex flex-col gap-2">
          <label className="font-display text-lg uppercase">// NÚMERO A LLAMAR</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+54 11 1234-5678"
            className="w-full bg-[#1e22aa]/20 border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] placeholder-[#EDEFFE]/30 font-display text-xl px-4 py-3 focus:outline-none tracking-widest transition-colors"
          />
          <p className="text-[10px] text-[#EDEFFE]/40 font-sans">Incluí el código de país (+54, +1, etc.)</p>
        </div>

        {/* Call button */}
        <button
          onClick={handleCall}
          disabled={!phone.trim() || !selectedVoice || callStatus === CALL_STATUS.CONFIGURING || callStatus === CALL_STATUS.CALLING}
          className={`flex items-center justify-center gap-3 py-4 px-6 font-bold text-base uppercase border-2 transition-all ${
            phone.trim() && selectedVoice && callStatus === CALL_STATUS.IDLE
              ? 'bg-[#EDEFFE] text-[#1e22aa] border-[#EDEFFE] hover:bg-[#1e22aa] hover:text-[#EDEFFE] shadow-[4px_4px_0_#1e22aa] hover:shadow-none'
              : 'bg-[#1F1F1F] text-[#EDEFFE]/30 border-[#EDEFFE]/20 cursor-not-allowed'
          }`}
        >
          {callStatus === CALL_STATUS.CONFIGURING ? (
            <><Loader className="w-5 h-5 animate-spin" /> Configurando agente...</>
          ) : callStatus === CALL_STATUS.CALLING ? (
            <><Loader className="w-5 h-5 animate-spin" /> Iniciando llamada...</>
          ) : (
            <><Phone className="w-5 h-5" /> Llamar</>
          )}
        </button>

        {/* Status feedback */}
        {callStatus === CALL_STATUS.SUCCESS && (
          <div className="flex items-center gap-3 border-2 border-green-400 p-3 bg-green-400/10">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-green-400 uppercase">Llamada iniciada</p>
              <p className="text-xs text-[#EDEFFE]/60 font-sans mt-0.5">{phone}</p>
            </div>
          </div>
        )}
        {callStatus === CALL_STATUS.ERROR && (
          <div className="flex items-start gap-3 border-2 border-red-400 p-3 bg-red-400/10">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-400 uppercase">Error</p>
              <p className="text-xs text-[#EDEFFE]/70 font-sans mt-0.5">{callError}</p>
              <button
                onClick={() => setCallStatus(CALL_STATUS.IDLE)}
                className="text-[10px] font-bold uppercase text-red-400 hover:text-[#EDEFFE] mt-1 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#EDEFFE]/15" />
          <span className="text-[10px] font-bold uppercase text-[#EDEFFE]/40">o probá por navegador</span>
          <div className="flex-1 h-px bg-[#EDEFFE]/15" />
        </div>

        {/* Web test (microphone) */}
        {webStatus === 'active' ? (
          <div className="flex flex-col gap-3 border-2 border-green-400 p-4 bg-green-400/5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400" />
              </span>
              <div className="flex-1">
                <p className="font-bold text-sm text-green-400 uppercase">En conversación</p>
                <p className="text-[11px] text-[#EDEFFE]/60 font-sans">
                  {agentMode === 'speaking' ? 'El agente está hablando…' : 'Escuchando tu micrófono…'}
                </p>
              </div>
            </div>
            <button
              onClick={endWebSession}
              className="flex items-center justify-center gap-2 py-3 px-6 font-bold text-sm uppercase border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-[#1F1F1F] transition-all"
            >
              <MicOff className="w-4 h-4" /> Finalizar
            </button>
          </div>
        ) : (
          <button
            onClick={startWebSession}
            disabled={!selectedVoice || webStatus === 'connecting'}
            className={`flex items-center justify-center gap-3 py-4 px-6 font-bold text-base uppercase border-2 transition-all ${
              selectedVoice && webStatus === 'idle'
                ? 'border-[#EDEFFE] text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#1e22aa]'
                : 'bg-[#1F1F1F] text-[#EDEFFE]/30 border-[#EDEFFE]/20 cursor-not-allowed'
            }`}
          >
            {webStatus === 'connecting'
              ? <><Loader className="w-5 h-5 animate-spin" /> Conectando…</>
              : <><Mic className="w-5 h-5" /> Hablar con el agente</>}
          </button>
        )}
        {webError && (
          <div className="flex items-start gap-2 border-2 border-red-400 p-2.5 bg-red-400/10">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#EDEFFE]/70 font-sans">{webError}</p>
          </div>
        )}

        {/* Language badge */}
        <div className="mt-auto pt-4 border-t border-[#EDEFFE]/10 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-[#EDEFFE]/40">Idioma fijo:</span>
          <span className="text-[10px] font-bold uppercase bg-[#1e22aa] text-[#EDEFFE] px-2 py-0.5 border border-[#EDEFFE]/30">
            Español
          </span>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center text-xs gap-2">
      <span className="text-[#EDEFFE]/50 font-sans uppercase font-bold flex-shrink-0">{label}</span>
      <span className="text-[#EDEFFE] font-sans text-right truncate">{value}</span>
    </div>
  );
}
