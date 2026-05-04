import { useState } from 'react';
import UploadView from './UploadView';
import ResultsView from './ResultsView';
import DetailView from './DetailView';

export default function MedihomeDemo({ apiUrl, onExpandToggle }) {
  const [view, setView] = useState('upload');
  const [selectedId, setSelectedId] = useState(null);

  const goToDetail = (id) => { setSelectedId(id); setView('detail'); };
  const goToResults = () => { setView('results'); onExpandToggle?.(false); };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex flex-shrink-0 border-b-2 border-[#EDEFFE]/20">
        {[
          { key: 'upload', label: '> Procesar' },
          { key: 'results', label: '> Registros' },
        ].map(({ key, label }, i) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              view === key || (key === 'results' && view === 'detail')
                ? 'bg-[#EDEFFE] text-[#0000FF]'
                : 'text-[#EDEFFE]/50 hover:text-[#EDEFFE]'
            } ${i > 0 ? 'border-l border-[#EDEFFE]/20' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'upload'  && <UploadView apiUrl={apiUrl} onSuccess={goToResults} />}
        {view === 'results' && <ResultsView apiUrl={apiUrl} onDetail={goToDetail} />}
        {view === 'detail'  && <DetailView apiUrl={apiUrl} id={selectedId} onBack={goToResults} onExpandToggle={onExpandToggle} />}
      </div>
    </div>
  );
}
