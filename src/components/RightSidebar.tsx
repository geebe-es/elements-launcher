import AppIcon from "./AppIcon";
import { APPS } from "../data/apps";
import { useLauncher } from "../context/LauncherContext";

export default function RightSidebar() {
  const { states, lastScan, scan, openApp } = useLauncher();

  // Painel de Atualizações — dados reais do contexto (nada fixo/inventado)
  const installedApps = APPS.filter((a) => {
    const st = states[a.id];
    return st?.status === "installed" || st?.status === "updateAvailable";
  });

  const lastScanLabel = lastScan
    ? `Hoje, ${lastScan.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "Nunca";

  return (
    <aside className="right-sidebar">
      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Aplicativos instalados
          </h3>
          <span className="badge-count">{installedApps.length}</span>
        </div>
        {installedApps.length > 0 ? (
          installedApps.map((app) => (
            <div className="update-item-card" key={app.id}>
              <AppIcon app={app} size="sm" />
              <div className="update-info">
                <h4>{app.name}</h4>
                <p className="version-change">
                  {states[app.id]?.installedVersion ? `v${states[app.id]?.installedVersion}` : "versão não identificada"}
                </p>
                <button className="text-mini-btn" onClick={() => openApp(app)}>
                  Abrir
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="update-item-card empty-widget">
            <div className="update-info">
              <p className="update-desc">
                Nada detectado ainda. Realize a varredura ou instale um aplicativo.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="last-check">
        <div className="check-time-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Última verificação
        </div>
        <span>{lastScanLabel}</span>
        <button className="btn-verify" onClick={scan}>
          Verificar atualizações
        </button>
      </div>

      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
            Novidades
          </h3>
        </div>
        <div className="news-card">
          <div className="news-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="news-content">
            <h4>Novo visual do Launcher!</h4>
            <p>Mais moderno, mais rápido e com novas funcionalidades.</p>
            <span className="news-date">02 de nov. de 2026 →</span>
          </div>
        </div>
      </div>

      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
            Dicas
          </h3>
        </div>
        <div className="tip-content">
          <div className="tip-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p>
              Use a barra de pesquisa para encontrar rapidamente seus aplicativos
              favoritos.
            </p>
          </div>
          <div className="carousel-dots">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      </div>
    </aside>
  );
}
