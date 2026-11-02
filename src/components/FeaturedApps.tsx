import AppIcon from "./AppIcon";
import { AppStatusBadge, AppActionButton, AppProgressBar } from "./AppAction";
import { APPS, type AppInfo } from "../data/apps";

export function AppCard({ app }: { app: AppInfo }) {
  return (
    <div className="app-card">
      <div className="app-card-top">
        <AppIcon app={app} />
        <div className="app-card-meta">
          <h3>{app.name}</h3>
          <span className="app-version" title={`Tamanho do instalador: ${app.size}`}>
            v{app.version} · {app.size}
          </span>
        </div>
        <span className="category-tag">{app.category}</span>
      </div>
      <p className="app-card-desc">{app.description}</p>
      <div className="app-card-footer">
        <AppStatusBadge app={app} />
        <AppActionButton app={app} />
      </div>
      <AppProgressBar app={app} />
    </div>
  );
}

interface FeaturedAppsProps {
  search: string;
}

export default function FeaturedApps({ search }: FeaturedAppsProps) {
  const q = search.toLowerCase().trim();
  const visible = APPS.filter(
    (app) =>
      !q ||
      app.name.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q)
  );

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Aplicativos em destaque
        </h2>
        <span className="app-count">
          {visible.length} de {APPS.length} aplicativos
        </span>
      </div>
      {visible.length > 0 ? (
        <div className="featured-grid">
          {visible.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      ) : (
        <p className="empty-message">Nenhum aplicativo corresponde a "{search}".</p>
      )}
    </section>
  );
}
