import { useLauncher, type AppRuntimeState } from "../context/LauncherContext";
import type { AppInfo } from "../data/apps";

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + " MB";
  if (value >= 1024) return (value / 1024).toFixed(0) + " KB";
  return value + " B";
}

export function AppStatusBadge({ app }: { app: AppInfo }) {
  const st = useLauncher().states[app.id];
  const status = st?.status ?? "available";

  const labels: Record<string, { text: string; className: string }> = {
    available: { text: "Disponível", className: "label-violet" },
    downloading: { text: "Baixando...", className: "label-violet" },
    downloaded: { text: "Baixado", className: "label-sky" },
    installing: { text: "Instalando...", className: "label-amber" },
    installed: { text: "Instalado", className: "label-green" },
    updateAvailable: { text: "Atualização disponível", className: "label-sky" },
    error: { text: "Erro", className: "label-red" },
  };
  const label = labels[status] || labels.available;

  return (
    <div className={`status-badge ${label.className}`}>
      {status === "downloading" || status === "installing" ? (
        <span className="mini-spinner" aria-hidden="true" />
      ) : (
        <span className={`status-dot`} aria-hidden="true" />
      )}
      {label.text}
      {status === "downloading" && st && st.received > 0 && (
        <span className="dl-bytes">
          {" · "}
          {formatBytes(st.received)}
          {st.total ? ` / ${formatBytes(st.total)}` : ""}
        </span>
      )}
    </div>
  );
}

export function AppProgressBar({ app }: { app: AppInfo }) {
  const st = useLauncher().states[app.id];
  if (!st || st.status !== "downloading") return null;
  return (
    <div className="download-progress" title={st.total ? `${formatBytes(st.received)} de ${formatBytes(st.total)}` : `${formatBytes(st.received)} baixados`}>
      {st.total ? <div className="bar"><div style={{ width: `${st.progress}%` }} /></div> : <div className="bar indeterminate" />}
    </div>
  );
}

export function AppActionButton({ app, compact = false }: { app: AppInfo; compact?: boolean }) {
  const { states, download, cancel, requestInstall, openApp } = useLauncher();
  const st: AppRuntimeState | undefined = states[app.id];
  const status = st?.status ?? "available";
  const className = compact ? "btn-sm" : "btn-action";

  switch (status) {
    case "downloading":
      return (
        <div className={`action-group${compact ? " compact" : ""}`}>
          <button className={`${className} btn-soft`} onClick={() => cancel(app)}>
            Cancelar
          </button>
        </div>
      );
    case "downloaded":
      return (
        <button
          className={className}
          onClick={() => requestInstall(app, st?.filePath ?? null, st?.shaVerified ?? false)}
        >
          Instalar
        </button>
      );
    case "installing":
      return (
        <button className={`${className} btn-soft`} disabled>
          Instalando...
        </button>
      );
    case "installed":
      return (
        <button className={className} onClick={() => openApp(app)}>
          Abrir
        </button>
      );
    case "error":
      return (
        <button className={`${className} btn-soft`} onClick={() => download(app)} title={st?.error || "Erro no download"}>
          Tentar novamente
        </button>
      );
    case "updateAvailable":
      return (
        <button className={className} onClick={() => download(app)}>
          Atualizar
        </button>
      );
    default:
      return (
        <button className={className} onClick={() => download(app)}>
          Baixar
        </button>
      );
  }
}
