import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { APPS, type AppInfo } from "../data/apps";

export type AppStatus =
  | "available" // Disponível para baixar
  | "downloading" // Baixando
  | "downloaded" // Download concluído (aguardando instalação)
  | "installing" // Instalador em execução
  | "installed" // Detectado como instalado
  | "uninstalling" // Desinstalador em execução
  | "updateAvailable"
  | "error";

export interface AppRuntimeState {
  status: AppStatus;
  progress: number; // 0..100 (null quando tamanho desconhecido)
  received: number;
  total: number | null;
  filePath: string | null;
  installedVersion: string | null;
  exePath: string | null;
  uninstallerPath: string | null;
  error?: string;
  shaVerified?: boolean;
}

interface ConfirmRequest {
  app: AppInfo;
  filePath: string | null;
  shaVerified: boolean;
}

interface UpdaterSnapshot {
  status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "latest" | "error" | "unavailable-dev";
  version: string | null;
  progress: number | null;
  releaseNotes: string | null;
  error: string | null;
}

interface LauncherContextValue {
  states: Record<string, AppRuntimeState>;
  defaultState: (app: AppInfo) => AppRuntimeState;
  download: (app: AppInfo) => void;
  cancel: (app: AppInfo) => void;
  requestInstall: (app: AppInfo, filePath: string | null, shaVerified: boolean) => void;
  uninstallApp: (app: AppInfo) => void;
  openApp: (app: AppInfo) => void;
  scan: () => void;
  lastScan: Date | null;
  confirm: ConfirmRequest | null;
  setConfirm: (value: ConfirmRequest | null) => void;
  updateStatus: (id: string, patch: Partial<AppRuntimeState>) => void;
  autoInstall: boolean;
  setAutoInstall: (value: boolean) => void;
  updater: UpdaterSnapshot;
  updaterCheck: () => void;
  updaterDownload: () => void;
  updaterInstall: () => void;
}

const LauncherContext = createContext<LauncherContextValue | null>(null);

const API = window.electronAPI;

function baseState(): AppRuntimeState {
  return {
    status: "available",
    progress: 0,
    received: 0,
    total: null,
    filePath: null,
    installedVersion: null,
    exePath: null,
    uninstallerPath: null,
  };
}

export function LauncherProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<string, AppRuntimeState>>({});
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [updater, setUpdater] = useState<UpdaterSnapshot>({
    status: "idle",
    version: null,
    progress: null,
    releaseNotes: null,
    error: null,
  });
  const statesRef = useRef(states);
  statesRef.current = states;

  // Instalação automática após download (persistida nas configurações)
  const [autoInstall, setAutoInstallState] = useState(true);
  const autoInstallRef = useRef(autoInstall);
  autoInstallRef.current = autoInstall;

  useEffect(() => {
    window.electronAPI?.settingsGet?.().then((s) => setAutoInstallState(s?.autoInstall !== false));
  }, []);

  const setAutoInstall = (value: boolean) => {
    setAutoInstallState(value);
    autoInstallRef.current = value;
    window.electronAPI?.settingsSet?.({ autoInstall: value }).catch(() => {});
  };

  // Estado inicial do updater (pode já ter estado oferecido de sessões anteriores)
  useEffect(() => {
    window.electronAPI?.updaterState?.().then((s) => {
      if (s) setUpdater(s);
    });
  }, []);

  const updateStatus = useCallback((id: string, patch: Partial<AppRuntimeState>) => {
    setStates((prev) => ({
      ...prev,
      [id]: { ...baseState(), ...(prev[id] || {}), ...patch },
    }));
  }, []);

  // Varredura de instalação no Windows
  const scan = async () => {
    if (!API?.scanApps) return;
    try {
      const results = await API.scanApps(APPS.map((a) => ({ id: a.id, name: a.name })));
      setStates((prev) => {
        const next = { ...prev };
        for (const app of APPS) {
          const result = results[app?.id || app.id];
          const before = prev[app.id];
          next[app.id] = {
            ...baseState(),
            ...(before || {}),
            // Só troca o status se não houver operação em andamento
            status:
              before && (before.status === "downloading" || before.status === "installing" || before.status === "uninstalling")
                ? before.status
                : result?.installed
                  ? "installed"
                  : before?.status === "downloaded" || before?.status === "error" || before?.status === "updateAvailable"
                    ? before.status
                    : "available",
            installedVersion: result?.version ?? null,
            exePath: result?.exe ?? null,
            uninstallerPath: result?.uninstaller ?? null,
          };
        }
        return next;
      });
      setLastScan(new Date());
    } catch {
      setLastScan(new Date()); // mesmo em falha registamos a tentativa
    }
  };

  // Varredura inicial ao abrir o launcher
  useEffect(() => {
    scan();
  }, []);

  // Eventos nativos de download
  useEffect(() => {
    if (!API?.onNativeEvent) return;
    const off = API.onNativeEvent(async (event: unknown) => {
      const data = event as { type: string; id: string; [k: string]: unknown };
      const { type, id } = data;
      if (type === "progress") {
        const received = Number(data.received) || 0;
        const total = data.total == null ? null : Number(data.total);
        updateStatus(id, {
          status: "downloading",
          received,
          total,
          progress: total ? Math.min(100, (received / total) * 100) : 0,
        });
      } else if (type === "done") {
        const filePath = typeof data.path === "string" ? data.path : null;
        const shaVerified = Boolean(data.sha256Verified);

        // Instalação automática: download concluído com hash verificado →
        // roda o instalador NSIS em modo silencioso e reescaneia ao final.
        if (autoInstallRef.current && filePath && shaVerified && API?.runInstaller) {
          updateStatus(id, { status: "installing", progress: 100, filePath, shaVerified });
          const res = await API.runInstaller(filePath, true);
          if (res?.ok) {
            const results = await API.scanApps?.(APPS.map((a) => ({ id: a.id, name: a.name })));
            const r = results?.[id];
            if (r?.installed) {
              updateStatus(id, {
                status: "installed",
                installedVersion: r.version ?? null,
                exePath: r.exe ?? null,
                uninstallerPath: r.uninstaller ?? null,
                received: 0,
                total: null,
                progress: 0,
              });
            } else {
              updateStatus(id, {
                status: "error",
                error: "Instalador executado, mas a instalação não foi detectada na varredura.",
              });
            }
          } else if (res?.openedWizard) {
            // UAC não confirmado: o assistente foi aberto — vigiamos até o
            // usuário concluir (ou erro após 5 min).
            startInstallWatchdog(id);
          } else {
            updateStatus(id, { status: "error", error: res?.error || "Falha na instalação automática." });
          }
          return;
        }

        updateStatus(id, {
          status: "downloaded",
          progress: 100,
          filePath,
          shaVerified,
        });
      } else if (type === "error") {
        updateStatus(id, { status: "error", error: String(data.message) });
      } else if (type === "cancelled") {
        updateStatus(id, { status: "available", received: 0, total: null, progress: 0 });
      } else if (type === "updater:state") {
        setUpdater(data.state as UpdaterSnapshot);
      }
    });
    return off;
    // Inscreve UMA única vez: reinscrever a cada mudança de estados perdia
    // eventos (ex.: "done") entre o unsubscribe e o re-subscribe.
  }, [updateStatus]);

  const download = (app: AppInfo) => {
    if (!API?.downloadStart) {
      window.alert("Executando no navegador: downloads exigem o app desktop.");
      return;
    }
    const fileName = `${app.name}-${app.version}.exe`;
    API.downloadStart({ id: app.id, url: app.downloadUrl, sha256: app.sha256, allowedHosts: app.allowedHosts, fileName });
    updateStatus(app.id, { status: "downloading", received: 0, total: null, progress: 0 });
  };

  const cancel = (app: AppInfo) => {
    API?.downloadCancel?.(app.id);
  };

  const requestInstall = (app: AppInfo, filePath: string | null, shaVerified: boolean) => {
    setConfirm({ app, filePath, shaVerified });
  };

  // Desinstala com o desinstalador oficial registrado no Windows
  // (silencioso; RunAs/UAC único quando o manifesto pedir; assistente
  // como fallback). No fim, re-infere o estado pela varredura.
  const uninstallApp = async (app: AppInfo) => {
    if (!API?.uninstallApp) {
      window.alert("Desinstalar exige o app desktop (Electron).");
      return;
    }
    const st = statesRef.current[app.id];
    const uninstaller = st?.uninstallerPath;
    if (!uninstaller) {
      window.alert(
        `Não foi possível localizar o desinstalador do ${app.name}.\nRemova pelo "Adicionar ou remover programas" do Windows.`
      );
      return;
    }
    if (!window.confirm(`Desinstalar o ${app.name} deste computador?\n\nO aplicativo será removido e voltará a aparecer como "Disponível".`)) {
      return;
    }
    updateStatus(app.id, { status: "uninstalling" });
    const res = await API.uninstallApp(uninstaller);
    if (res?.ok) {
      if (!res.openedWizard) {
        const results = await API.scanApps?.(APPS.map((a) => ({ id: a.id, name: a.name })));
        const r = results?.[app.id];
        updateStatus(app.id, {
          status: r?.installed ? "installed" : "available",
          installedVersion: r?.version ?? null,
          exePath: r?.exe ?? null,
          uninstallerPath: r?.uninstaller ?? null,
          received: 0,
          total: null,
          progress: 0,
        });
        if (r?.installed) {
          // NSIS copia o desinstalador para %TEMP% e o processo original
          // sai antes do fim: re-verificamos discretamente até o registro
          // limpar (sem janelas).
          const delays = [4000, 10000, 20000];
          for (const d of delays) {
            await new Promise((rl) => setTimeout(rl, d));
            const again = await API.scanApps?.(APPS.map((a) => ({ id: a.id, name: a.name })));
            const r2 = again?.[app.id];
            updateStatus(app.id, {
              status: r2?.installed ? "uninstalling" : "available",
              installedVersion: r2?.installed ? r2?.version ?? app.version : null,
              exePath: r2?.exe ?? null,
              uninstallerPath: r2?.uninstaller ?? null,
            });
            if (!r2?.installed) break;
          }
        }
      }
      // openedWizard=true: o assistente roda com o usuário; o estado será
      // recomputado na próxima varredura/abertura do app.
    } else {
      updateStatus(app.id, { status: "error", error: res?.error || "Falha na desinstalação." });
    }
  };

  // Enquanto o assistente interativo roda (fallback do UAC), vigiamos o
  // registro/disco a cada 10s para marcar "Instalado" assim que detectar.
  const startInstallWatchdog = (id: string) => {
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (!API?.scanApps) {
        clearInterval(timer);
        return;
      }
      const results = await API.scanApps(APPS.map((a) => ({ id: a.id, name: a.name })));
      const r = results?.[id];
      if (r?.installed) {
        clearInterval(timer);
        updateStatus(id, {
          status: "installed",
          installedVersion: r.version ?? null,
          exePath: r.exe ?? null,
                uninstallerPath: r.uninstaller ?? null,
          received: 0,
          total: null,
          progress: 0,
        });
      } else if (Date.now() - startedAt > 5 * 60_000) {
        clearInterval(timer);
        updateStatus(id, {
          status: "error",
          error: "Instalação não detectada automaticamente. Clique em Instalar e siga o assistente.",
        });
      }
    }, 10_000);
  };

  const openApp = async (app: AppInfo) => {    if (!API?.openApp) {
      window.alert("Abrir aplicativos exige o app desktop (Electron).");
      return;
    }
    let exe = statesRef.current[app.id]?.exePath || null;
    if (!exe) {
      const results = await API.scanApps(APPS.map((a) => ({ id: a.id, name: a.name })));
      exe = results[app.id]?.exe ?? null;
      setStates((prev) => ({
        ...prev,
        [app.id]: { ...baseState(), ...(prev[app.id] || {}), exePath: exe, uninstallerPath: results?.[app.id]?.uninstaller ?? prev[app.id]?.uninstallerPath ?? null },
      }));
    }
    if (!exe) {
      window.alert(
        `Não foi possível localizar o executável do ${app.name}. Ele aparece em "Meus Aplicativos" após a varredura de instalação.`
      );
      return;
    }
    const result = await API.openApp(exe);
    if (!result?.ok) window.alert(result?.error || "Não foi possível abrir o aplicativo.");
  };

  const updaterCheck = () => {
    window.electronAPI?.updaterCheck?.();
  };

  const updaterDownload = () => {
    window.electronAPI?.updaterDownload?.();
  };

  const updaterInstall = () => {
    window.electronAPI?.updaterInstall?.();
  };

  const defaultState = (app: AppInfo) => states[app.id] || baseState();

  const value = useMemo(
    () => ({
      states,
      defaultState,
      download,
      cancel,
      requestInstall,
      uninstallApp,
      openApp,
      scan,
      lastScan,
      confirm,
      setConfirm,
      updateStatus,
      autoInstall,
      setAutoInstall,
      updater,
      updaterCheck,
      updaterDownload,
      updaterInstall,
    }),
    [states, confirm, lastScan, updater]
  );

  return <LauncherContext.Provider value={value}>{children}</LauncherContext.Provider>;
}

export function useLauncher() {
  const ctx = useContext(LauncherContext);
  if (!ctx) throw new Error("useLauncher deve ser usado dentro de LauncherProvider");
  return ctx;
}
