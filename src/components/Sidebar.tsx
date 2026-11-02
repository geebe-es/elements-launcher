import type { ReactNode } from "react";
import type { PageKey } from "../App";

interface SidebarProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
}

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Início",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: "library",
    label: "Meus Aplicativos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
    ),
  },
  {
    key: "updates",
    label: "Atualizações",
    badge: "1",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Configurações",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({ page, onNavigate }: SidebarProps) {
  const goUpdates = () => onNavigate("updates");

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo" aria-label="Elements">
          <img src="./logo.png" alt="Logo Elements Launcher" />
        </div>
        <div className="brand-info">
          <strong>Elements Launcher</strong>
          <span>Seus aplicativos, em um só lugar.</span>
        </div>
      </div>

      <nav className="nav-menu">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href="#"
            className={`nav-item${page === item.key ? " active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.key);
            }}
          >
            {item.icon}
            {item.label}
            {item.badge && <span className="badge-count">{item.badge}</span>}
          </a>
        ))}
      </nav>

      <div className="sidebar-promo">
        <div className="promo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <p>
          <strong>Mantenha seus aplicativos sempre atualizados!</strong>
        </p>
        <span>Novas versões trazem melhorias e correções.</span>
        <button className="btn-promo" onClick={goUpdates}>
          Ver atualizações
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="footer-logo">
              <div className="brand-logo-footer">
                <img src="./logo.png" alt="Elements" />
              </div>
          <span>Elements Launcher</span>
        </div>
        <span className="version-tag">v1.0.0</span>
      </div>
    </aside>
  );
}
