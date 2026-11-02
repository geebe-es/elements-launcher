import AppIcon from "../components/AppIcon";
import { AppStatusBadge, AppActionButton, AppProgressBar } from "../components/AppAction";
import { APPS } from "../data/apps";
import { useLauncher } from "../context/LauncherContext";

export default function LibraryPage() {
  const { states, scan } = useLauncher();
  const model = APPS.filter((a) => {
    const s = states[a.id]?.status;
    return s === "installed" || s === "updateAvailable";
  });

  return (
    <section className="page-section">
      <div className="section-header">
        <h2>🖥️ Meus Aplicativos</h2>
        <button className="btn-outline" onClick={scan}>
          Verificar instalação
        </button>
      </div>

      <p className="page-note">
        A lista abaixo mostra apenas o que foi detectado instalado neste computador.
      </p>

      {model.length > 0 ? (
        <div className="all-apps-list">
          {model.map((app) => (
            <div key={app.id}>
              <div className="app-list-row">
                <AppIcon app={app} size="sm" />
                <div className="row-info">
                  <h4>{app.name}</h4>
                  <p>{states[app.id]?.installedVersion ? `Detectado: v${states[app.id]?.installedVersion}` : app.description}</p>
                </div>
                <span className="row-version">
                  {states[app.id]?.installedVersion ? `instalada v${states[app.id]?.installedVersion}` : "versão desconhecida"}
                </span>
                <AppStatusBadge app={app} />
                <div className="row-action">
                  <AppActionButton app={app} compact />
                </div>
              </div>
              <AppProgressBar app={app} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <h3>Nenhum aplicativo instalado ainda</h3>
          <p>
            Os aplicativos que você instalar através do Elements Launcher
            aparecerão aqui automaticamente.
          </p>
        </div>
      )}
    </section>
  );
}
