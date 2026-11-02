import { APPS } from "../data/apps";

interface TopBarProps {
  onSearch: (term: string) => void;
  search: string;
}

export default function TopBar({ search, onSearch }: TopBarProps) {
  const api = window.electronAPI;

  const handleMinimize = () => api?.minimize();
  const handleMaximize = () => api?.maximize();
  const handleClose = () => api?.close();

  return (
    <header className="topbar">
      <div className="search-box">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar aplicativos..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Buscar aplicativos"
        />
        {search && (
          <button
            className="search-clear"
            title="Limpar busca"
            onClick={() => onSearch("")}
          >
            ×
          </button>
        )}
      </div>
      <div className="topbar-actions">
        <button
          className="icon-btn"
          title={`${APPS.length} aplicativos disponíveis`}
          disabled
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <div className="window-controls">
          <button className="win-btn" title="Minimizar" onClick={handleMinimize}>
            ─
          </button>
          <button className="win-btn" title="Maximizar" onClick={handleMaximize}>
            ☐
          </button>
          <button className="win-btn close" title="Fechar" onClick={handleClose}>
            ×
          </button>
        </div>
      </div>
    </header>
  );
}
