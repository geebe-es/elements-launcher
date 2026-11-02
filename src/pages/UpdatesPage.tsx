import AppIcon from "../components/AppIcon";
import { AppStatusBadge, AppActionButton } from "../components/AppAction";
import { APPS } from "../data/apps";
import { useLauncher } from "../context/LauncherContext";

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default function UpdatesPage() {
  const { states, lastScan, scan, updateStatus, updater, updaterInstall, updaterDownload, updaterCheck } = useLauncher();

  // Atualização pendente = instalado com versão anterior à do catálogo.
  const pending = APPS.filter((a) => {
    const st = states[a.id];
    if (!st) return false;
    if (st.status === "installed" && st.installedVersion) {
      return compareSemver(st.installedVersion, a.version) < 0;
    }
    return false;
  });

  // Notifica o contexto do estado de atualização (usado pelos botões "Atualizar").
  for (const app of pending) {
    const before = states[app.id];
    if (before.status !== "updateAvailable") {
      // Marcamos via useEffect-like one-time set; chamada direta idempotente.
      updateStatus(app.id, { status: "updateAvailable" });
    }
  }

  const lastScanLabel = lastScan
    ? `Hoje, ${lastScan.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "Nunca";

  return (
    <section className="page-section">
      <div className="section-header">
        <h2>🔄 Atualizações</h2>
        <button className="btn-action" onClick={scan}>
          Verificar atualizações
        </button>
      </div>

      <div className="launcher-version-card">
        <div className="brand-logo-footer">
          <img src="/logo.png" alt="Elements" />
        </div>
        <div className="row-info">
          <h4>Elements Launcher</h4>
          <p>
            Versão atual: v1.0.0{updater.version && updater.status !== "latest" ? ` · Nova versão: v${updater.version}` : ""}
          </p>
          {updater.status === "checking" && <p>Verificando atualizações…</p>}
          {updater.status === "downloading" && (
            <div className="download-progress">
              <div className="bar" style={{ width: `${updater.progress ?? 0}%` }} />
            </div>
          )}
          {updater.status === "downloaded" && <p>Atualização baixada — pronta para instalar.</p>}
          {updater.status === "latest" && <p>Você está em dia com a versão mais recente.</p>}
          {updater.status === "unavailable-dev" && (
            <p>Verificação automática disponível na versão empacotada (instalada).</p>
          )}
          {updater.status === "error" && <p className="modal-hash warn">Falha: {updater.error || "erro desconhecido"}</p>}
        </div>
        <div className="updater-actions">
          {updater.status === "available" || updater.status === "downloading" ? (
            <button className="version-tag" disabled title="Baixando atualização">
              {updater.status === "downloading" ? `Baixando ${updater.progress != null ? `${updater.progress}%` : ""}` : "Nova versão"}
            </button>
          ) : null}
          {updater.status === "downloaded" ? (
            <button className="btn-action" onClick={updaterInstall}>
              Reiniciar e instalar
            </button>
          ) : null}
          {updater.status === "available" ? (
            <button className="btn-action" onClick={updaterDownload}>
              Baixar atualização
            </button>
          ) : null}
          {(updater.status === "idle" ||
            updater.status === "latest" ||
            updater.status === "error" ||
            updater.status === "unavailable-dev") ? (
            <button className="btn-outline" onClick={updaterCheck}>
              Verificar atualização
            </button>
          ) : null}
        </div>
      </div>

      <div className="launcher-version-card">
        <div className="row-info">
          <h4>Última verificação</h4>
          <p>{lastScanLabel}</p>
        </div>
      </div>

      <h3 className="subsection-title">
        Atualizações pendentes ({pending.length})
      </h3>
      {pending.length > 0 ? (
        <div className="all-apps-list">
          {pending.map((app) => (
            <div className="app-list-row" key={app.id}>
              <AppIcon app={app} size="sm" />
              <div className="row-info">
                <h4>{app.name}</h4>
                <p>
                  Instalado: v{states[app.id]?.installedVersion} → Disponível: v{app.version}
                </p>
              </div>
              <AppStatusBadge app={app} />
              <div className="row-action">
                <AppActionButton app={app} compact />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-message">
          Nenhuma atualização pendente. Seus aplicativos estão em dia com o catálogo (ou ainda não há versões instaladas).
        </p>
      )}
    </section>
  );
}
