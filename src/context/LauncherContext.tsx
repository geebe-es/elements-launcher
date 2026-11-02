import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { APPS, type AppInfo } from "../data/apps";

export type AppStatus =
  | "available" // Disponível para baixar
  | "downloading" // Baixando
  | "downloaded" // Download concluído (aguardando instalação)
  | "installing" // Instalador em execução
  | "installed" // Detectado como instalado
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
  openApp: (app: AppInfo) => void;
  scan: () => void;
  lastScan: Date | null;
  confirm: ConfirmRequest | null;
  setConfirm: (value: ConfirmRequest | null) => void;
  updateStatus: (id: string, patch: Partial<AppRuntimeState>) => void;
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
              before && (before.status === "downloading" || before.status === "installing")
                ? before.status
                : result?.installed
                  ? "installed"
                  : before?.status === "downloaded" || before?.status === "error" || before?.status === "updateAvailable"
                    ? before.status
                    : "available",
            installedVersion: result?.version ?? null,
            exePath: result?.exe ?? null,
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
    const off = API.onNativeEvent((event: unknown) => {
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
        updateStatus(id, {
          status: "downloaded",
          progress: 100,
          filePath: (data.path as string) || null,
          shaVerified: Boolean(data.sha256Verified),
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

  const openApp = async (app: AppInfo) => {
    if (!API?.openApp) {
      window.alert("Abrir aplicativos exige o app desktop (Electron).");
      return;
    }
    let exe = statesRef.current[app.id]?.exePath || null;
    if (!exe) {
      const results = await API.scanApps(APPS.map((a) => ({ id: a.id, name: a.name })));
      exe = results[app.id]?.exe ?? null;
      setStates((prev) => ({
        ...prev,
        [app.id]: { ...baseState(), ...(prev[app.id] || {}), exePath: exe },
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
      openApp,
      scan,
      lastScan,
      confirm,
      setConfirm,
      updateStatus,
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
