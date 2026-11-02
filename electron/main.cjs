// Electron main process — Elements Launcher
// Responsável pela janela, controles nativos e IPC seguro.
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Ícone do programa (janela/Barra de Tarefas). Na build empacotada,
// o .ico já está embutido no executável pelo electron-builder.
const iconPath = path.join(__dirname, "..", "build", "logo.png");

const { createDownloadManager } = require("./native/downloads.cjs");
const { scanInstalledApps } = require("./native/installs.cjs");
const downloadManager = createDownloadManager();

// --- Auto-update do launcher (electron-updater) ---
// Estado base: nada foi verificado ainda. Nada é exibido/inventado na UI
// antes de uma verificação real acontecer.
let updaterState = {
  status: "idle", // idle | checking | available | downloading | downloaded | latest | error
  version: null, // versão nova disponível (quando known)
  progress: null, // 0..100 durante download
  releaseNotes: null,
  error: null,
};

function setUpdaterState(patch) {
  updaterState = { ...updaterState, ...patch };
  sendToAllWindows({ type: "updater:state", state: updaterState });
}

function initAutoUpdater() {
  // electron-updater só consegue checar em app empacotado; em dev, reporta
  // um estado honesto de indisponível em vez de erro enigmático.
  const isPackaged = app.isPackaged;
  if (!isPackaged) {
    setUpdaterState({
      status: "unavailable-dev",
      error: null,
    });
    return;
  }
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = false; // o usuário decide na interface
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("checking-for-update", () => setUpdaterState({ status: "checking", version: null, error: null }));
    autoUpdater.on("update-available", (info) =>
      setUpdaterState({
        status: "available",
        version: info?.version || null,
        releaseNotes: typeof info?.releaseNotes === "string" ? info.releaseNotes : null,
        error: null,
      })
    );
    autoUpdater.on("update-not-available", () => setUpdaterState({ status: "latest", version: null }));
    autoUpdater.on("download-progress", (progress) =>
      setUpdaterState({
        status: "downloading",
        progress: typeof progress?.percent === "number" ? Math.min(100, Math.round(progress.percent)) : null,
      })
    );
    autoUpdater.on("update-downloaded", (info) =>
      setUpdaterState({
        status: "downloaded",
        version: info?.version || updaterState.version,
        progress: 100,
      })
    );
    autoUpdater.on("error", (err) =>
      setUpdaterState({ status: "error", error: err?.message || "Falha na verificação de atualizações." })
    );
  } catch (err) {
    setUpdaterState({ status: "error", error: err?.message || "electron-updater indisponível." });
  }
}

function checkForUpdates() {
  if (updaterState.status === "unavailable-dev") return;
  try {
    autoUpdater()?.checkForUpdates();
  } catch (err) {
    setUpdaterState({ status: "error", error: err?.message || "Falha ao iniciar a verificação." });
  }
}

function autoUpdater() {
  // helper para pegar a instância já configurada
  return require("electron-updater").autoUpdater;
}

// --- Configurações persistidas (userData) ---
function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf-8");
  return next;
}

function getDownloadDir() {
  return readSettings().downloadDir || path.join(app.getPath("downloads"), "Elements Launcher");
}

function sendToAllWindows(event) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("native:event", event);
  }
}

app.disableHardwareAcceleration = app.disableHardwareAcceleration; // manter aceleração por padrão

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    show: false,
    frame: false, // sem moldura nativa: usamos a TopBar customizada do design
    resizable: true,
    backgroundColor: "#0b0914",
    title: "Elements Launcher",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, // isola o renderer do Node (segurança)
      nodeIntegration: false, // renderer não tem acesso direto ao Node
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
}

// --- IPC: controles de janela ---
ipcMain.on("win:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on("win:maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on("win:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("win:isMaximized", (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

// --- IPC: downloads ---
ipcMain.handle("download:start", (_event, payload) => {
  downloadManager
    .start({
      id: payload?.id,
      url: payload?.url,
      sha256: payload?.sha256,
      allowedHosts: payload?.allowedHosts,
      dir: payload?.dir || getDownloadDir(),
      fileName: payload?.fileName,
    })
    .catch((err) => {
      sendToAllWindows({ type: "error", id: payload?.id, message: err.message });
    });
  return { ok: true }; // o progresso/conclusão chegam via eventos
});

ipcMain.handle("download:cancel", (_event, id) => downloadManager.cancel(id));
ipcMain.handle("download:isRunning", (_event, id) => downloadManager.isRunning(id));

// --- IPC: instalações / apps ---
ipcMain.handle("apps:scan", (_event, apps) => {
  return scanInstalledApps(Array.isArray(apps) ? apps : []);
});

// Executa o instalador baixado (após confirmação do usuário na interface).
ipcMain.handle("installer:run", async (_event, filePath) => {
  if (typeof filePath !== "string" || !filePath.toLowerCase().endsWith(".exe")) {
    return { ok: false, error: "Arquivo de instalador inválido." };
  }
  const exists = await fs.promises
    .access(filePath)
    .then(() => true)
    .catch(() => false);
  if (!exists) return { ok: false, error: "O instalador não existe mais no disco." };
  try {
    const result = await shell.openPath(filePath);
    return { ok: result === "" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Abre o executável do aplicativo instalado.
ipcMain.handle("app:open", async (_event, exePath) => {
  if (typeof exePath !== "string" || !exePath.toLowerCase().endsWith(".exe")) {
    return { ok: false, error: "Caminho de executável inválido." };
  }
  try {
    const result = await shell.openPath(exePath);
    return { ok: result === "" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// --- IPC: configurações ---
ipcMain.handle("settings:get", () => ({
  downloadDir: getDownloadDir(),
}));

// --- IPC: auto-update do launcher ---
ipcMain.handle("updater:state", () => updaterState);
ipcMain.handle("updater:check", () => {
  checkForUpdates();
  return { ok: true };
});
ipcMain.handle("updater:download", () => {
  if (updaterState.status !== "available") return { ok: false };
  autoUpdater().downloadUpdate().catch((err) => {
    setUpdaterState({ status: "error", error: err?.message || "Falha ao baixar a atualização." });
  });
  return { ok: true };
});
ipcMain.handle("updater:install", () => {
  if (updaterState.status !== "downloaded") return { ok: false };
  setImmediate(() => {
    try {
      autoUpdater().quitAndInstall(false, true);
    } catch (err) {
      setUpdaterState({ status: "error", error: err?.message || "Falha ao instalar a atualização." });
    }
  });
  return { ok: true };
});

ipcMain.handle("settings:chooseDownloadDir", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: "Escolher diretório de downloads",
    defaultPath: getDownloadDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const dir = result.filePaths[0];
  writeSettings({ downloadDir: dir });
  return { ok: true, dir };
});

app.whenReady().then(() => {
  initAutoUpdater();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
