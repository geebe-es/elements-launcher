import type { AppInfo } from "../data/apps";

/** Modal de detalhes do aplicativo: descrição, changelog, hash e link do release. */
export default function AppDetailsModal({ app, onClose }: { app: AppInfo | null; onClose: () => void }) {
  if (!app) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card details-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="details-header">
          <img className="details-icon" src={app.icon} alt="" draggable={false} />
          <div>
            <h3>{app.name}</h3>
            <p className="details-meta">
              v{app.version} · {app.category} · Instalador {app.size}
            </p>
          </div>
          <button className="details-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <p className="details-desc">{app.longDescription}</p>

        {app.changelog.length > 0 && (
          <>
            <h4 className="details-subtitle">Registro de alterações</h4>
            <ul className="details-changelog">
              {app.changelog.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </>
        )}

        <h4 className="details-subtitle">Download</h4>
        {app.downloadUrl ? (
          <div className="details-download">
            <p className="modal-path" title={app.downloadUrl}>
              {app.downloadUrl}
            </p>
            <p className={`modal-hash ${app.sha256 ? "ok" : "warn"}`}>
              {app.sha256
                ? `✓ Integridade verificada por SHA-256 no download · ${app.sha256.slice(0, 16)}…${app.sha256.slice(-8)}`
                : "⚠ Hash do instalador não publicado"}
            </p>
          </div>
        ) : (
          <p className="modal-hash warn">⚠ Endereço de download ainda não publicado.</p>
        )}

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
