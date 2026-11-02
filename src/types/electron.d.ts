export {};

interface ScanResult {
  appId: string;
  installed: boolean;
  version?: string | null;
  location?: string | null;
  exe?: string | null;
}

export interface UpdaterState {
  status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "latest" | "error" | "unavailable-dev";
  version: string | null;
  progress: number | null;
  releaseNotes: string | null;
  error: string | null;
}

interface NativeDownloadEvent {
  type: "progress" | "done" | "error" | "cancelled";
  id: string;
  received?: number;
  total?: number | null;
  path?: string;
  size?: number;
  sha256?: string;
  sha256Verified?: boolean;
  message?: string;
}

declare global {
  interface Window {
    /** Ponte segura exposta por electron/preload.cjs (somente no app desktop). */
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;

      downloadStart: (payload: {
        id: string;
        url: string | null;
        sha256: string | null;
        allowedHosts: string[];
        dir?: string;
        fileName?: string;
      }) => Promise<{ ok: boolean }>;
      downloadCancel: (id: string) => Promise<void>;
      downloadIsRunning: (id: string) => Promise<boolean>;
      onNativeEvent: (callback: (event: NativeDownloadEvent) => void) => () => void;

      scanApps: (apps: { id: string; name: string }[]) => Promise<Record<string, ScanResult>>;
      runInstaller: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
      openApp: (exePath: string) => Promise<{ ok: boolean; error?: string }>;

      settingsGet: () => Promise<{ downloadDir: string } | null>;
      settingsChooseDownloadDir: () => Promise<{ ok: boolean; dir?: string }>;

      updaterState: () => Promise<UpdaterState>;
      appInfo: () => Promise<{ version: string }>;
      updaterCheck: () => Promise<{ ok: boolean }>;
      updaterDownload: () => Promise<{ ok: boolean }>;
      updaterInstall: () => Promise<{ ok: boolean }>;
    };
  }
}
