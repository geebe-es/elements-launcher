// Preload — ponte mínima e segura entre o renderer (React) e o Electron.
// Expõe apenas chamadas específicas. Nenhum acesso direto ao Node.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Janela
  minimize: () => ipcRenderer.send("win:minimize"),
  maximize: () => ipcRenderer.send("win:maximize"),
  close: () => ipcRenderer.send("win:close"),
  isMaximized: () => ipcRenderer.invoke("win:isMaximized"),

  // Downloads (evento unificado de progresso/conclusão/erro)
  downloadStart: (payload) => ipcRenderer.invoke("download:start", payload),
  downloadCancel: (id) => ipcRenderer.invoke("download:cancel", id),
  downloadIsRunning: (id) => ipcRenderer.invoke("download:isRunning", id),
  onNativeEvent: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("native:event", listener);
    return () => ipcRenderer.removeListener("native:event", listener);
  },

  // Instalações / execução (silent=true → NSIS /S e espera a conclusão)
  scanApps: (apps) => ipcRenderer.invoke("apps:scan", apps),
  runInstaller: (filePath, silent) => ipcRenderer.invoke("installer:run", filePath, silent === true),
  openApp: (exePath) => ipcRenderer.invoke("app:open", exePath),
  uninstallApp: (uninstallerPath) => ipcRenderer.invoke("app:uninstall", uninstallerPath),

  // Configurações
  settingsGet: () => ipcRenderer.invoke("settings:get"),
  settingsSet: (patch) => ipcRenderer.invoke("settings:set", patch),
  settingsChooseDownloadDir: () => ipcRenderer.invoke("settings:chooseDownloadDir"),

  // Auto-update do launcher
  appInfo: () => ipcRenderer.invoke("app:info"),
  updaterState: () => ipcRenderer.invoke("updater:state"),
  updaterCheck: () => ipcRenderer.invoke("updater:check"),
  updaterDownload: () => ipcRenderer.invoke("updater:download"),
  updaterInstall: () => ipcRenderer.invoke("updater:install"),
});
