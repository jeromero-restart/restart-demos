import { ExternalLink, MessageCircle, FileText, ChevronRight } from 'lucide-react';

const QR_API = (url) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=140x140&bgcolor=1F1F1F&color=EDEFFE&data=${encodeURIComponent(url)}`;

export default function TelegramLauncher({ botUrl, knowledgeBase = [] }) {
  return (
    <div className="h-full overflow-y-auto font-sans">
      <div className="p-4 md:p-6 flex flex-col gap-5">

        {/* Header + QR + botón */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0000FF] border-2 border-[#EDEFFE] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-[#EDEFFE]" />
              </div>
              <div>
                <p className="font-sans text-[10px] font-bold uppercase text-[#EDEFFE]/50 tracking-widest">Interfaz</p>
                <p className="font-sans font-bold text-sm text-[#EDEFFE]">Bot de Telegram</p>
              </div>
            </div>
            <a
              href={botUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-[#EDEFFE] text-[#0000FF] border-2 border-[#EDEFFE] px-5 py-3 font-sans font-bold text-sm uppercase tracking-widest hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors shadow-[4px_4px_0_#1F1F1F] w-full sm:w-auto"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir en Telegram
            </a>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <img
              src={QR_API(botUrl)}
              alt="QR Telegram"
              className="w-36 h-36 border-2 border-[#EDEFFE] shadow-[4px_4px_0_#1F1F1F]"
            />
            <p className="font-sans text-[9px] text-[#EDEFFE]/30 uppercase tracking-widest">Escaneá con tu cámara</p>
          </div>
        </div>

        {/* Base de conocimiento */}
        {knowledgeBase.length > 0 && (
          <div>
            <h3 className="font-display text-xl uppercase text-[#EDEFFE] border-b border-[#EDEFFE]/20 pb-1 mb-3">
              ///_BASE_DE_CONOCIMIENTO <span className="text-[#EDEFFE]/40">[{knowledgeBase.length}]</span>
            </h3>

            <div className="flex flex-col gap-4">
              {knowledgeBase.map((item, i) => (
                <div key={i} className="border border-[#EDEFFE]/20 bg-[#0000FF]/10">
                  {/* Doc header */}
                  <div className="flex items-start gap-3 p-3 border-b border-[#EDEFFE]/10">
                    <FileText className="w-4 h-4 text-[#EDEFFE]/50 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-bold text-xs text-[#EDEFFE]">{item.doc}</p>
                      {item.roles?.length > 0 && (
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {item.roles.map(r => (
                            <span key={r} className="text-[9px] font-bold uppercase bg-[#0000FF] border border-[#EDEFFE]/30 text-[#EDEFFE]/70 px-1.5 py-0.5">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preguntas de ejemplo */}
                  <ul className="divide-y divide-[#EDEFFE]/10">
                    {item.questions.map((q, j) => (
                      <li key={j} className="flex items-start gap-2 px-3 py-2 group">
                        <ChevronRight className="w-3 h-3 text-[#EDEFFE]/30 flex-shrink-0 mt-0.5 group-hover:text-[#EDEFFE] transition-colors" />
                        <a
                          href={botUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-sans text-xs text-[#EDEFFE]/70 hover:text-[#EDEFFE] transition-colors leading-relaxed cursor-pointer"
                          title="Abrir en Telegram"
                        >
                          {q}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
