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

// Encaminha progresso/conclusão/erro/cancelamento dos downloads nativos
// para todas as janelas (o renderer escuta o canal "native:event").
downloadManager.events.on("event", (event) => {
  logLine("download:" + event.type, { id: event.id, message: event.message, received: event.received, total: event.total });
  sendToAllWindows(event);
});

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

// Log rotativo simples em userData/logs para diagnóstico de downloads/instalação.
function logLine(kind, data) {
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(
      path.join(dir, "launcher.log"),
      new Date().toISOString() + " [" + kind + "] " + JSON.stringify(data).slice(0, 900) + "\n",
      "utf-8"
    );
  } catch {}
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

  win.once("ready-to-show", () => {
    win.__readyAt = Date.now();
    if (win.__splash) revealMainWindow(win.__splash, win);
  });

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
}

// Splash screen: HTML/CSS puro, abre quase instantâneo antes do React subir.
function createSplash() {
  const splash = new BrowserWindow({
    width: 400,
    height: 480,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#0b0914",
  });
  splash.loadFile(path.join(__dirname, "splash.html"));
  return splash;
}

// Fecha a splash mostrando a janela principal; tempo mínimo evita "piscada".
function revealMainWindow(splash, win) {
  const MIN_SPLASH_MS = 900;
  if (!splash || splash.isDestroyed() || splash.__closed) return;
  splash.__closed = true;
  const reveal = () => {
    if (win && !win.isDestroyed()) win.show();
    if (!splash.isDestroyed()) splash.close();
  };
  const elapsed = Date.now() - (splash.__startedAt || 0);
  setTimeout(reveal, Math.max(0, MIN_SPLASH_MS - elapsed));
  // Redundância: nunca deixar a splash presa se algo falhar no renderer.
  setTimeout(() => {
    if (!splash.isDestroyed()) splash.close();
  }, 20000);
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

// Executa um exe silenciosamente (/S); se o manifesto exigir elevação,
// relança com RunAs (UAC único) e cai para o assistente se o usuário
// não confirmar. Retorna { code, openedWizard }.
async function runSilentExe(filePath) {
  const direct = await new Promise((resolve) => {
    try {
      const child = require("node:child_process").spawn(filePath, ["/S"], {
        windowsHide: true,
      });
      child.on("exit", (code) => resolve({ code }));
      child.on("error", (err) => resolve({ err }));
    } catch (err) {
      resolve({ err });
    }
  });
  if (direct && direct.code === 0) return { code: 0, openedWizard: false };

  // Spawn nem iniciou (erro de início = provável exigência de elevação)
  // → tenta RunAs com UAC único. Código de saída != 0 de um spawn normal
  // NÃO deve pedir elevação sem necessidade.
  if (direct && direct.err) {
    logLine("exe:silent", { via: "spawn", error: String(direct.err.message || direct.err) });
    try {
      const args = [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$p = Start-Process -FilePath "${filePath}" -ArgumentList "/S" -Verb RunAs -Wait -PassThru; exit $p.ExitCode`,
      ];
      const code = await new Promise((resolve, reject) => {
        const child = require("node:child_process").spawn("powershell.exe", args, { windowsHide: true });
        child.on("exit", (code) => resolve(code));
        child.on("error", reject);
      });
      if (code === 0) return { code: 0, openedWizard: false };
      // UAC cancelado/timeout → fallback: abre o assistente interativo.
      await shell.openPath(filePath);
      logLine("exe:silent", { via: "runas", code, fallback: "wizard" });
      return { code, openedWizard: true };
    } catch (err) {
      return { code: -1, error: err && err.message ? err.message : "Falha ao executar." };
    }
  }

  if (direct) {
    logLine("exe:silent", { via: "spawn", code: direct.code });
  }
  return { code: direct ? direct.code : -1, openedWizard: false };
}

// Executa o instalador baixado (após confirmação do usuário na interface).
// silent=true → roda o NSIS em modo silencioso (/S) e espera a conclusão.
ipcMain.handle("installer:run", async (_event, filePath, silent) => {
  logLine("installer:run", { filePath, silent });
  if (typeof filePath !== "string" || !filePath.toLowerCase().endsWith(".exe")) {
    return { ok: false, error: "Arquivo de instalador inválido." };
  }
  const exists = await fs.promises
    .access(filePath)
    .then(() => true)
    .catch(() => false);
  if (!exists) return { ok: false, error: "O instalador não existe mais no disco." };

  if (silent === true) {
    const res = await runSilentExe(filePath);
    if (res.code === 0) { logLine("installer:silent", { ok: true }); return { ok: true }; }
    await shell.openPath(filePath).catch(() => {});
    logLine("installer:silent", { ok: false, openedWizard: true });
    return {
      ok: false,
      openedWizard: true,
      error: "Instalador aberto no modo assistente (instalação silenciosa não confirmada).",
    };
  }

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

// Desinstala um aplicativo usando o desinstalador oficial registrado
// no Windows (modo silencioso; RunAs/UAC quando necessário, com
// fallback para o assistente).
ipcMain.handle("app:uninstall", async (_event, uninstallerPath) => {
  logLine("app:uninstall", { uninstallerPath });
  if (typeof uninstallerPath !== "string" || !uninstallerPath.toLowerCase().endsWith(".exe")) {
    return { ok: false, error: "Desinstalador inválido." };
  }
  const exists = await fs.promises
    .access(uninstallerPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) return { ok: false, error: "O desinstalador não foi encontrado no disco." };

  const res = await runSilentExe(uninstallerPath);
  if (res.error) return { ok: false, error: res.error };
  if (res.code === 0) return { ok: true, openedWizard: false };
  if (res.openedWizard) {
    // Assistente aberto: o usuário conclui manualmente.
    return { ok: true, openedWizard: true };
  }
  return { ok: false, error: "O desinstalador saiu com o código " + res.code + "." };
});

// --- IPC: configurações ---
ipcMain.handle("settings:get", () => ({
  downloadDir: getDownloadDir(),
  // Padrão: instalar automaticamente após o download (opta-se por 1 clique).
  autoInstall: readSettings().autoInstall !== false,
}));

ipcMain.handle("settings:set", (_event, patch) => {
  if (!patch || typeof patch !== "object") return { ok: false };
  const next = writeSettings(patch);
  return { ok: true, settings: { downloadDir: getDownloadDir(), autoInstall: next.autoInstall !== false } };
});

// --- IPC: auto-update do launcher ---
ipcMain.handle("app:info", () => ({ version: app.getVersion() }));
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
  const splash = createSplash();
  splash.__startedAt = Date.now();
  const win = createWindow();
  win.__splash = splash;

  // Verificação automática no abertura (empacotado): ~12s depois de abrir,
  // o usuário aceita (ou não) a atualização pela interface.
  setTimeout(() => checkForUpdates(), 12000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
