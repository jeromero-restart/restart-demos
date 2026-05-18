import React, { useState, useEffect, useRef } from 'react';
import { Phone, Loader, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function AgentesDemo({ apiUrl }) {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [voices, setVoices]         = useState([]);

  // Agent config
  const [prompt, setPrompt]         = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [temperature, setTemperature]   = useState(0.7);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Call
  const [phone, setPhone]           = useState('');
  const [callStatus, setCallStatus] = useState(CALL_STATUS.IDLE);
  const [callError, setCallError]   = useState('');

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

  const handleCall = async () => {
    if (!phone.trim() || !selectedVoice) return;
    setCallStatus(CALL_STATUS.CONFIGURING);
    setCallError('');
    try {
      const res = await fetch(`${apiUrl}/api/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          prompt,
          first_message: firstMessage,
          temperature,
          voice_id: selectedVoice.id,
        }),
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

  // ── Loading / Error ──────────────────────────────────────────────────────────

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

  // ── Main UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden text-[#EDEFFE]">

      {/* ── Left: Agent config ─────────────────────────────────────────────── */}
      <div className="flex-[3] overflow-y-auto p-5 flex flex-col gap-6 border-b-2 lg:border-b-0 lg:border-r-2 border-[#EDEFFE]">

        {/* System prompt */}
        <div>
          <label className="block font-display text-lg uppercase mb-2">
            // SYSTEM PROMPT
          </label>
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={7}
            className="w-full bg-[#0000FF]/20 border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] placeholder-[#EDEFFE]/30 font-sans text-sm p-3 resize-none focus:outline-none transition-colors"
            placeholder="Describí el rol, objetivo y comportamiento del agente..."
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
            className="w-full bg-[#0000FF]/20 border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] placeholder-[#EDEFFE]/30 font-sans text-sm px-3 py-2.5 focus:outline-none transition-colors"
            placeholder="Hola, te llamo de parte de..."
          />
          <p className="text-[10px] text-[#EDEFFE]/40 mt-1 font-sans">
            Lo primero que dice el agente al ser atendido
          </p>
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
                    ? 'bg-[#EDEFFE] text-[#0000FF] border-[#EDEFFE] shadow-[4px_4px_0_#1F1F1F]'
                    : 'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE]/30 hover:border-[#EDEFFE]'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-display text-base uppercase">{voice.name}</span>
                  <span className={`text-[10px] font-bold border px-1.5 py-0.5 uppercase ${
                    selectedVoice?.id === voice.id
                      ? 'border-[#0000FF] text-[#0000FF]'
                      : 'border-[#EDEFFE]/30 text-[#EDEFFE]/50'
                  }`}>
                    {voice.gender}
                  </span>
                </div>
                <p className={`font-sans text-xs ${
                  selectedVoice?.id === voice.id ? 'text-[#0000FF]/70' : 'text-[#EDEFFE]/60'
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
          <Row label="Voz" value={selectedVoice?.name || '—'} />
          <Row label="Temperatura" value={`${tempInfo.label} (${temperature.toFixed(2)})`} />
          <Row label="Idioma" value="Español" />
          <Row label="Prompt" value={`${prompt.length} caracteres`} />
        </div>

        {/* Phone input */}
        <div className="flex flex-col gap-2">
          <label className="font-display text-lg uppercase">// NÚMERO A LLAMAR</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+54 11 1234-5678"
            className="w-full bg-[#0000FF]/20 border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] placeholder-[#EDEFFE]/30 font-display text-xl px-4 py-3 focus:outline-none tracking-widest transition-colors"
          />
          <p className="text-[10px] text-[#EDEFFE]/40 font-sans">Incluí el código de país (+54, +1, etc.)</p>
        </div>

        {/* Call button */}
        <button
          onClick={handleCall}
          disabled={!phone.trim() || !selectedVoice || callStatus === CALL_STATUS.CONFIGURING || callStatus === CALL_STATUS.CALLING}
          className={`flex items-center justify-center gap-3 py-4 px-6 font-bold text-base uppercase border-2 transition-all ${
            phone.trim() && selectedVoice && callStatus === CALL_STATUS.IDLE
              ? 'bg-[#EDEFFE] text-[#0000FF] border-[#EDEFFE] hover:bg-[#0000FF] hover:text-[#EDEFFE] shadow-[4px_4px_0_#0000FF] hover:shadow-none'
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

        {/* Language badge */}
        <div className="mt-auto pt-4 border-t border-[#EDEFFE]/10 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-[#EDEFFE]/40">Idioma fijo:</span>
          <span className="text-[10px] font-bold uppercase bg-[#0000FF] text-[#EDEFFE] px-2 py-0.5 border border-[#EDEFFE]/30">
            Español
          </span>
        </div>
      </div>
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
