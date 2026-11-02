import AppIcon from "./AppIcon";
import { AppStatusBadge, AppActionButton, AppProgressBar } from "./AppAction";
import { APPS, CATEGORIES, type AppInfo } from "../data/apps";

export function AppRow({ app }: { app: AppInfo }) {
  return (
    <div className="app-list-row">
      <AppIcon app={app} size="sm" />
      <div className="row-info">
        <h4>{app.name}</h4>
        <p>{app.description}</p>
      </div>
      <span className="row-category">{app.category}</span>
      <span className="row-version" title={`Tamanho do instalador: ${app.size}`}>
        v{app.version} · {app.size}
      </span>
      <AppStatusBadge app={app} />
      <div className="row-action">
        <AppActionButton app={app} compact />
      </div>
      <button
        className="row-menu"
        title="Detalhes"
        onClick={() =>
          window.alert(
            `Detalhes de ${app.name}\n\nVersão: v${app.version}\nTamanho: ${app.size}\nCategoria: ${app.category}\n\n${app.longDescription}${app.downloadUrl ? "" : "\n\n⚠ Endereço de download ainda não publicado."}`
          )
        }
      >
        ⋮
      </button>
    </div>
  );
}

interface AllAppsProps {
  search: string;
  category: string;
  onCategoryChange: (category: string) => void;
}

export default function AllApps({ search, category, onCategoryChange }: AllAppsProps) {
  const q = search.toLowerCase().trim();
  const visible = APPS.filter((app) => {
    const matchesCategory = category === "all" || app.category === category;
    const matchesSearch =
      !q ||
      app.name.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
          Todos os aplicativos
        </h2>
        <span className="app-count">{visible.length} aplicativos</span>
      </div>

      <div className="filter-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`filter-btn${category === cat.key ? " active" : ""}`}
            onClick={() => onCategoryChange(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="all-apps-list">
          {visible.map((app) => (
            <div key={app.id}>
              <AppRow app={app} />
              <AppProgressBar app={app} />
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-message">
          Nenhum aplicativo encontrado nesta categoria{search && ` para "${search}"`}.
        </p>
      )}
    </section>
  );
}
