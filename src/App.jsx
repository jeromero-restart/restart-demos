import React, { useState, useEffect } from 'react';
import { Search, Play, FileText, Filter, Terminal, ArrowRight, ArrowLeft, Share2, LogOut, Users } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import SharePanel from './components/SharePanel';
import MedihomeDemo from './components/demos/medihome/index';
import TelegramLauncher from './components/demos/TelegramLauncher';
import UsersPanel from './components/admin/UsersPanel';
import { demosData, verticals } from './data/demos';

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=VT323&display=swap');

  @font-face {
    font-family: 'PP Neue Bit';
    src: local('PP Neue Bit Bold'), local('PPNeueBit-Bold');
    font-weight: bold;
    font-style: normal;
  }

  .font-display {
    font-family: 'PP Neue Bit', 'VT323', monospace;
    letter-spacing: 0.05em;
  }

  .font-sans {
    font-family: 'Inter', sans-serif;
  }
`;

function useCountdown(expiresAt) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const ms = expiresAt - Date.now();
      if (ms <= 0) { setTimeLeft('00:00'); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return timeLeft;
}

export default function App() {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVertical, setSelectedVertical] = useState("Todas");
  const [activeDemo, setActiveDemo] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  const timeLeft = useCountdown(user?.type === 'guest' ? user.expiresAt : null);

  const isGuest = user?.type === 'guest';
  const allowedDemoIds = isGuest && user.demos !== 'all' ? user.demos : null;

  const filteredDemos = demosData.filter(demo => {
    const matchesGuest = !allowedDemoIds || allowedDemoIds.includes(demo.id);
    const matchesSearch = demo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          demo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVertical = selectedVertical === "Todas" || demo.vertical === selectedVertical;
    return matchesGuest && matchesSearch && matchesVertical;
  });

  if (activeDemo) {
    return (
      <div className="min-h-screen bg-[#0000FF] font-sans text-[#EDEFFE] selection:bg-[#EDEFFE] selection:text-[#0000FF]">
        <style>{fontStyles}</style>

        {isGuest && (
          <div className="bg-[#1F1F1F] border-b-2 border-[#EDEFFE] px-4 py-2 flex justify-between items-center text-xs">
            <span className="font-sans font-bold uppercase text-[#EDEFFE]/70">
              Acceso invitado · <span className="text-[#EDEFFE]">{user.label}</span>
            </span>
            <span className="font-display text-base text-[#EDEFFE]">EXPIRA: {timeLeft}</span>
          </div>
        )}

        <header className="bg-[#0000FF] border-b-2 border-[#EDEFFE] sticky top-0 z-50 p-3 md:p-4 flex justify-between items-center gap-2">
          <button
            onClick={() => setActiveDemo(null)}
            className="flex items-center gap-1 md:gap-2 font-sans font-bold uppercase text-xs md:text-sm bg-[#EDEFFE] text-[#0000FF] px-3 py-2 hover:bg-[#1F1F1F] hover:text-[#EDEFFE] hover:border-[#EDEFFE] border-2 border-[#EDEFFE] transition-colors shadow-[2px_2px_0_#1F1F1F] md:shadow-[4px_4px_0_#1F1F1F] flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver al Hub</span>
            <span className="sm:hidden">Volver</span>
          </button>

          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <span className="font-display text-lg sm:text-2xl md:text-3xl text-[#EDEFFE] uppercase truncate">
              ///__ENTORNO_ACTIVO
            </span>
            <img src="/logo.png" alt="RESTART Logo" className="h-6 md:h-8 w-auto opacity-50 hidden sm:block" />
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1 font-sans font-bold uppercase text-xs bg-transparent text-[#EDEFFE] border-2 border-[#EDEFFE]/40 px-3 py-2 hover:border-[#EDEFFE] hover:bg-[#1F1F1F] transition-colors flex-shrink-0"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </header>

        <main className="max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col xl:flex-row gap-6 md:gap-8 min-h-[calc(100vh-80px)] xl:h-[calc(100vh-80px)] overflow-x-hidden">
          <section className="flex-[3] flex flex-col border-2 border-[#EDEFFE] bg-[#1F1F1F] shadow-[6px_6px_0_#EDEFFE] md:shadow-[12px_12px_0_#EDEFFE] min-h-[50vh] xl:min-h-0">
            <div className="border-b-2 border-[#EDEFFE] bg-[#0000FF] p-2 md:p-3 flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-[#EDEFFE] rounded-full animate-pulse flex-shrink-0"></div>
                <span className="font-display text-lg md:text-xl text-[#EDEFFE] tracking-widest truncate">{activeDemo.title}.exe</span>
              </div>
              <span className="font-sans text-[10px] md:text-xs font-bold uppercase text-[#EDEFFE] flex-shrink-0 ml-2">
                ID: {activeDemo.ascii}
              </span>
            </div>

            <div className="flex-1 overflow-hidden bg-[#1F1F1F]">
              {activeDemo.id === 3 ? (
                <MedihomeDemo apiUrl={activeDemo.apiUrl} />
              ) : activeDemo.botUrl ? (
                <TelegramLauncher
                  botUrl={activeDemo.botUrl}
                  knowledgeBase={activeDemo.knowledgeBase}
                />
              ) : (
                <div className="h-full relative flex flex-col justify-center items-center p-4 md:p-8">
                  <div className="absolute inset-0 opacity-10 font-display text-xs md:text-sm leading-tight break-all select-none text-[#EDEFFE] pointer-events-none overflow-hidden">
                    {("1010101011110001010101010101010111010100001010101010101010101010101010101010101 ").repeat(200)}
                  </div>
                  <Terminal className="w-16 h-16 md:w-24 md:h-24 text-[#0000FF] mb-4 md:mb-6 relative z-10" />
                  <h2 className="font-display text-3xl md:text-5xl text-[#EDEFFE] uppercase text-center relative z-10 mb-2 md:mb-4">
                    [ ESPACIO INTERACTIVO ]
                  </h2>
                  <p className="font-sans text-sm md:text-base text-[#EDEFFE]/60 text-center max-w-md relative z-10">
                    Aquí se incrustará la interfaz funcional de la demo.
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="flex-1 flex flex-col gap-6 xl:overflow-y-auto pb-8 xl:pb-0">
            <div className="bg-[#EDEFFE] border-2 border-[#1F1F1F] p-4 md:p-6 shadow-[6px_6px_0_#1F1F1F] md:shadow-[8px_8px_0_#1F1F1F]">
              <h1 className="font-display text-4xl md:text-5xl text-[#0000FF] uppercase leading-[0.8] mb-4">
                {activeDemo.title}
              </h1>
              <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
                <span className="bg-[#1F1F1F] text-[#EDEFFE] text-[10px] md:text-xs font-bold px-2 py-1 uppercase border-2 border-[#1F1F1F]">
                  {activeDemo.vertical}
                </span>
                <span className="bg-[#0000FF] text-[#EDEFFE] text-[10px] md:text-xs font-display px-2 py-1 tracking-widest uppercase border-2 border-[#0000FF]">
                  {activeDemo.tech}
                </span>
              </div>
              <p className="font-sans text-xs md:text-sm font-medium text-[#1F1F1F] leading-relaxed mb-4 md:mb-6">
                {activeDemo.description}
              </p>
              <div className="bg-[#0000FF] p-3 md:p-4 border-2 border-[#1F1F1F]">
                <h4 className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-[#EDEFFE] uppercase tracking-widest mb-1 md:mb-2">
                  {'>'} OBJETIVO PRINCIPAL
                </h4>
                <p className="font-sans text-xs md:text-sm font-bold text-[#EDEFFE]">
                  {activeDemo.objective}
                </p>
              </div>
            </div>

            <div className="bg-[#1F1F1F] border-2 border-[#EDEFFE] p-4 md:p-6 shadow-[6px_6px_0_#EDEFFE] md:shadow-[8px_8px_0_#EDEFFE] text-[#EDEFFE]">
              <h3 className="font-display text-xl md:text-2xl uppercase border-b-2 border-[#EDEFFE] pb-2 mb-4 md:mb-6">
                ///_IMPACTO_EN_NEGOCIO
              </h3>
              <ul className="space-y-3 md:space-y-4 font-sans text-sm">
                {activeDemo.impactMetrics?.map((metric, idx) => {
                  const isUp = metric.startsWith('↑');
                  const isDown = metric.startsWith('↓');
                  const text = metric.substring(1).trim();
                  return (
                    <li key={idx} className="flex items-start gap-2 md:gap-3 border-b border-[#EDEFFE]/20 pb-2 md:pb-3 last:border-0 last:pb-0">
                      <span className={`font-display text-base md:text-lg px-2 py-0.5 border flex-shrink-0 leading-none ${
                        isUp ? 'bg-[#EDEFFE] text-[#0000FF] border-[#EDEFFE]' :
                        isDown ? 'bg-[#0000FF] text-[#EDEFFE] border-[#0000FF]' :
                        'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE]'
                      }`}>
                        {isUp ? '↑' : isDown ? '↓' : '>'}
                      </span>
                      <span className="font-sans text-[11px] md:text-sm font-medium leading-relaxed pt-0.5">{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0000FF] font-sans text-[#EDEFFE] selection:bg-[#EDEFFE] selection:text-[#0000FF]">
      <style>{fontStyles}</style>

      {/* Banner invitado */}
      {isGuest && (
        <div className="bg-[#1F1F1F] border-b-2 border-[#EDEFFE] px-4 py-2 flex justify-between items-center text-xs">
          <span className="font-sans font-bold uppercase text-[#EDEFFE]/70">
            Acceso invitado · <span className="text-[#EDEFFE]">{user.label}</span>
            {allowedDemoIds && <span className="ml-2 text-[#EDEFFE]/50">· {allowedDemoIds.length} demo{allowedDemoIds.length !== 1 ? 's' : ''} disponible{allowedDemoIds.length !== 1 ? 's' : ''}</span>}
          </span>
          <span className="font-display text-base text-[#EDEFFE]">EXPIRA: {timeLeft}</span>
        </div>
      )}

      <header className="bg-[#0000FF] border-b-2 border-[#EDEFFE] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div className="flex flex-col items-start w-full md:w-auto">
            <img src="/logo.png" alt="RESTART Logo" className="h-10 md:h-12 w-auto object-contain" />
            <span className="font-sans text-[0.65rem] font-bold text-[#EDEFFE] tracking-[0.15em] mt-2 uppercase">
              / TU COMPAÑÍA EN IA.
            </span>
          </div>

          <div className="flex w-full md:w-96 border-2 border-[#EDEFFE] bg-[#0000FF] focus-within:border-[#EDEFFE] transition-colors relative group shadow-[4px_4px_0_#1F1F1F]">
            <span className="bg-[#EDEFFE] text-[#0000FF] p-2 flex items-center justify-center">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Buscar demos, verticales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-transparent focus:outline-none text-sm font-semibold text-[#EDEFFE] placeholder-[#EDEFFE]/60"
            />
          </div>

          <div className="flex items-center gap-2">
            {!isGuest && user?.role === 'admin' && (
              <button
                onClick={() => setShowUsers(true)}
                className="flex items-center gap-2 font-sans font-bold uppercase text-xs bg-transparent text-[#EDEFFE] border-2 border-[#EDEFFE]/40 px-4 py-2 hover:border-[#EDEFFE] hover:bg-[#1F1F1F] transition-colors"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Accesos</span>
              </button>
            )}
            {!isGuest && (
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-2 font-sans font-bold uppercase text-xs bg-[#EDEFFE] text-[#0000FF] border-2 border-[#EDEFFE] px-4 py-2 hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors shadow-[3px_3px_0_#1F1F1F]"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Compartir</span>
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 font-sans font-bold uppercase text-xs bg-transparent text-[#EDEFFE] border-2 border-[#EDEFFE]/40 px-4 py-2 hover:border-[#EDEFFE] hover:bg-[#1F1F1F] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-[#0000FF] text-[#EDEFFE] border-b-2 border-[#EDEFFE] relative overflow-hidden flex items-center min-h-[40vh]">
        <div className="absolute inset-0 opacity-20 font-display text-xl leading-none break-all select-none overflow-hidden text-[#EDEFFE]">
          {("010010111011001001101001110001110101111011010101101111100111100110001101010100100111001010 ").repeat(150)}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-12">
          <div className="font-display text-[#EDEFFE] text-lg mb-4 flex items-center gap-2">
            <span className="bg-[#1F1F1F] px-2 py-0.5 border border-[#EDEFFE]">/*</span>
            <span className="uppercase tracking-widest bg-[#0000FF] px-2 border border-[#EDEFFE]">Vayamos más profundo</span>
          </div>
          <h1 className="font-display text-7xl md:text-9xl uppercase leading-[0.85] mb-6">
            SOLUCIONES<br/>DE NEGOCIO
          </h1>
          <p className="font-sans text-lg md:text-xl font-medium max-w-2xl border-l-4 border-[#EDEFFE] pl-6 py-2 bg-[#0000FF]/50 backdrop-blur-sm">
            Donde los procesos se vuelven inteligencia.<br/>
            IA pensada juntos, diseñada a medida.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-28 bg-[#0000FF] border-2 border-[#EDEFFE] p-4 shadow-[6px_6px_0_#1F1F1F]">
            <div className="border-b-2 border-[#EDEFFE] pb-2 mb-6 flex justify-between items-end">
              <h2 className="font-display text-3xl uppercase text-[#EDEFFE]">///__FILTROS</h2>
              <Filter className="h-6 w-6 text-[#EDEFFE]" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-sans text-xs font-bold text-[#EDEFFE]/70 tracking-widest uppercase mb-2">
                {'>'} Verticales
              </span>
              {verticals.map((vertical) => (
                <button
                  key={vertical}
                  onClick={() => setSelectedVertical(vertical)}
                  className={`text-left px-4 py-3 text-sm font-bold uppercase transition-all border-2 ${
                    selectedVertical === vertical
                      ? "bg-[#EDEFFE] border-[#EDEFFE] text-[#0000FF] translate-x-2 shadow-[4px_4px_0_#1F1F1F]"
                      : "bg-[#0000FF] border-[#EDEFFE] text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#0000FF]"
                  }`}
                >
                  {selectedVertical === vertical ? `[ ${vertical} ]` : vertical}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="mb-8 flex justify-between items-end border-b-2 border-[#EDEFFE] pb-4">
            <h2 className="font-display text-4xl uppercase text-[#EDEFFE]">
              <span className="text-[#1F1F1F] bg-[#EDEFFE] px-1 mr-2">{'>>>>'}</span> DEMOS ACTIVAS
            </h2>
            <span className="font-display text-xl text-[#0000FF] bg-[#EDEFFE] px-2 py-1 shadow-[3px_3px_0_#1F1F1F]">
              [{filteredDemos.length}]
            </span>
          </div>

          {filteredDemos.length === 0 ? (
            <div className="border-2 border-dashed border-[#EDEFFE] p-16 text-center bg-[#0000FF] shadow-[8px_8px_0_#1F1F1F]">
              <Terminal className="mx-auto h-16 w-16 text-[#EDEFFE] mb-4" />
              <h3 className="font-display text-4xl uppercase text-[#EDEFFE] mb-2">ERROR 404_</h3>
              <p className="font-sans font-medium text-[#EDEFFE]/80">No se encontraron resultados para los parámetros actuales.</p>
              <button
                onClick={() => { setSearchTerm(""); setSelectedVertical("Todas"); }}
                className="mt-6 bg-[#EDEFFE] text-[#0000FF] font-sans font-bold py-2 px-6 uppercase text-sm hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors border-2 border-[#EDEFFE] shadow-[4px_4px_0_#1F1F1F]"
              >
                Reiniciar Búsqueda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredDemos.map((demo, index) => {
                const isDark = index % 2 !== 0;
                return (
                  <div
                    key={demo.id}
                    className={`group border-2 flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0_#1F1F1F] ${
                      isDark ? 'bg-[#1F1F1F] border-[#EDEFFE]' : 'bg-[#EDEFFE] border-[#1F1F1F]'
                    }`}
                  >
                    <div className={`h-32 relative p-4 flex flex-col justify-between overflow-hidden border-b-2 ${
                      isDark ? 'bg-[#0000FF] border-[#EDEFFE]' : 'bg-[#1F1F1F] border-[#1F1F1F]'
                    }`}>
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'linear-gradient(#EDEFFE 1px, transparent 1px), linear-gradient(90deg, #EDEFFE 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}></div>
                      <div className="flex justify-between items-start relative z-10 w-full">
                        <span className={`text-xs font-bold px-2 py-1 uppercase border-2 ${
                          isDark ? 'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE]' : 'bg-[#EDEFFE] text-[#1F1F1F] border-[#1F1F1F]'
                        }`}>
                          {demo.vertical}
                        </span>
                        <span className={`text-xs font-display px-2 py-1 tracking-widest uppercase border-2 ${
                          isDark ? 'bg-[#EDEFFE] text-[#0000FF] border-[#EDEFFE]' : 'bg-[#0000FF] text-[#EDEFFE] border-[#0000FF]'
                        }`}>
                          {demo.tech}
                        </span>
                      </div>
                      <div className="relative z-10 font-display text-3xl text-[#EDEFFE] self-end opacity-40 group-hover:opacity-100 transition-opacity">
                        {demo.ascii}
                      </div>
                    </div>

                    <div className={`p-6 flex-1 flex flex-col ${isDark ? 'bg-[#1F1F1F]' : 'bg-[#EDEFFE]'}`}>
                      <h3 className={`font-display text-4xl uppercase mb-4 leading-[0.9] group-hover:underline decoration-2 underline-offset-4 ${
                        isDark ? 'text-[#EDEFFE]' : 'text-[#1F1F1F]'
                      }`}>
                        {demo.title}
                      </h3>
                      <div className="space-y-6 flex-1 font-sans">
                        <div>
                          <h4 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest border-b-2 pb-1 mb-2 ${
                            isDark ? 'text-[#EDEFFE] border-[#EDEFFE]' : 'text-[#1F1F1F] border-[#1F1F1F]'
                          }`}>
                            /// Funcionamiento
                          </h4>
                          <p className={`text-sm leading-relaxed font-medium ${
                            isDark ? 'text-[#EDEFFE]/80' : 'text-[#1F1F1F]/90'
                          }`}>
                            {demo.description}
                          </p>
                        </div>
                        <div className={`p-4 border-2 relative ${
                          isDark ? 'bg-[#EDEFFE] text-[#1F1F1F] border-[#EDEFFE] shadow-[4px_4px_0_#0000FF]' : 'bg-[#0000FF] text-[#EDEFFE] border-[#1F1F1F] shadow-[4px_4px_0_#1F1F1F]'
                        }`}>
                          <div className="absolute top-0 right-0 bg-[#1F1F1F] text-[#EDEFFE] text-[10px] px-1 font-display">KPI_</div>
                          <h4 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2 ${
                            isDark ? 'text-[#1F1F1F]' : 'text-[#EDEFFE]'
                          }`}>
                            {'>'} Impacto
                          </h4>
                          <p className={`text-sm font-bold ${isDark ? 'text-[#0000FF]' : 'text-[#EDEFFE]'}`}>
                            {demo.objective}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`border-t-2 flex ${isDark ? 'border-[#EDEFFE] bg-[#1F1F1F]' : 'border-[#1F1F1F] bg-[#EDEFFE]'}`}>
                      <button
                        onClick={() => setActiveDemo(demo)}
                        className={`flex-1 font-sans font-bold text-sm uppercase py-4 px-4 transition-colors flex justify-center items-center gap-2 border-r-2 ${
                          isDark
                            ? 'bg-[#1F1F1F] text-[#EDEFFE] border-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#0000FF]'
                            : 'bg-[#1F1F1F] text-[#EDEFFE] border-[#1F1F1F] hover:bg-[#0000FF] hover:text-[#EDEFFE]'
                        }`}
                      >
                        <Play className="h-4 w-4" /> Ejecutar Demo
                      </button>
                      <button
                        onClick={() => setActiveDemo(demo)}
                        className={`flex-none py-4 px-6 transition-colors flex justify-center items-center ${
                          isDark
                            ? 'bg-[#1F1F1F] text-[#EDEFFE] hover:bg-[#EDEFFE] hover:text-[#0000FF]'
                            : 'bg-[#EDEFFE] text-[#1F1F1F] hover:bg-[#1F1F1F] hover:text-[#EDEFFE]'
                        }`}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showShare && <SharePanel onClose={() => setShowShare(false)} />}
      {showUsers && <UsersPanel onClose={() => setShowUsers(false)} />}
    </div>
  );
}
