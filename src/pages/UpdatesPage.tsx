import { useEffect, useState } from "react";
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
  const { states, lastScan, scan, updater, updaterInstall, updaterDownload, updaterCheck } = useLauncher();
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    window.electronAPI?.appInfo?.().then((info) => setAppVersion(info?.version ?? ""));
  }, []);

  const pending = APPS.filter((a) => {
    const st = states[a.id];
    if (!st) return false;
    if (st.status === "installed" && st.installedVersion) {
      return compareSemver(st.installedVersion, a.version) < 0;
    }
    return false;
  });

  const lastScanLabel = lastScan
    ? `Hoje, ${lastScan.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "Nunca";

  const statusText: Record<string, string> = {
    idle: "Clique em “Verificar atualização” para conferir novas versões.",
    checking: "Verificando atualizações…",
    available: `Nova versão v${updater.version ?? "?"} publicada no GitHub.`,
    downloading: "Baixando atualização…",
    downloaded: "Atualização baixada e pronta para instalar.",
    latest: "Você está na versão mais recente.",
    error: updater.error || "Falha na verificação.",
    "unavailable-dev": "A verificação funciona na versão instalada do launcher.",
  };

  return (
    <section className="page-section">
      <div className="section-header">
        <h2 className="section-title">Atualizações</h2>
        <button className="btn-action" onClick={scan}>
          Verificar atualizações
        </button>
      </div>

      {/* Card hero do launcher */}
      <div className={`updater-hero hero-${updater.status}`}>
        <div className="updater-hero-side">
          <img className="updater-logo" src="./logo.png" alt="" draggable={false} />
          {updater.status === "checking" && <span className="mini-spinner overlay-spin" />}
        </div>

        <div className="updater-hero-main">
          <div className="updater-title-row">
            <h3>Elements Launcher</h3>
            <span className="version-badge current">v{appVersion || "—"}</span>
            {(updater.status === "available" || updater.status === "downloaded") && updater.version && (
              <span className="version-badge new">→ v{updater.version}</span>
            )}
          </div>
          <p className={`updater-sub ${updater.status === "error" ? "modal-hash warn" : ""}`}>{statusText[updater.status]}</p>
          {updater.status === "downloading" && (
            <div className="download-progress hero-progress" title={`${updater.progress ?? 0}%`}>
              <div className="bar" style={{ width: `${updater.progress ?? 0}%` }} />
              <span className="hero-progress-label">{updater.progress != null ? `${updater.progress}%` : ""}</span>
            </div>
          )}
        </div>

        <div className="updater-hero-actions">
          {(updater.status === "idle" || updater.status === "latest" || updater.status === "error" || updater.status === "unavailable-dev") && (
            <button className="btn-outline" onClick={updaterCheck}>
              Verificar atualização
            </button>
          )}
          {updater.status === "available" && (
            <button className="btn-action" onClick={updaterDownload}>
              Baixar atualização
            </button>
          )}
          {updater.status === "downloaded" && (
            <button className="btn-action" onClick={updaterInstall}>
              Reiniciar e instalar
            </button>
          )}
          {updater.status === "downloading" && <button className="btn-outline" disabled>Baixando…</button>}
        </div>
      </div>

      {/* faixa de contexto */}
      <div className="updates-meta">
        <span>
          <b>Última verificação:</b> {lastScanLabel}
        </span>
        <span>Atualizações via GitHub Releases · integridade conferida por hash</span>
      </div>

      <div className="section-header pendings-header">
        <h3 className="subsection-title">Aplicativos do catálogo {pending.length > 0 ? `(${pending.length} pendente${pending.length > 1 ? "s" : ""})` : ""}</h3>
      </div>

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
        <div className="empty-state compact-empty">
          <span className="empty-icon">✅</span>
          <h3>Nenhuma atualização pendente</h3>
          <p>
            Os aplicativos detectados neste computador estão em dia com o catálogo.
            App ainda não instalado? Veja a página <b>Início</b>.
          </p>
        </div>
      )}
    </section>
  );
}
