// Detecção de aplicativos instalados no Windows.
// Consulta chaves de desinstalação (HKLM / HKLM Wow6432Node / HKCU) e
// pastas padrão de instalação por usuário, sem inventar resultados:
// se nada for encontrado, o app é reportado como não instalado.
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const UNINSTALL_KEYS = [
  "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
];

function regQuery(args) {
  return new Promise((resolve) => {
    execFile("reg", ["query", ...args], { windowsHide: true, timeout: 10000 }, (err, stdout) => {
      resolve(err ? null : stdout || "");
    });
  });
}

function runRegQueryPromise(args) {
  return new Promise((resolve) => {
    execFile("reg", ["query", args.key, ...(["/v", args.value])], { windowsHide: true, timeout: 8000 }, (err, stdout) => {
      resolve({ err, stdout: stdout || "" });
    });
  });
}

async function getEntryValue(keyPath, value) {
  const { err, stdout } = await runRegQueryPromise({ key: keyPath, value });
  if (err) return null;
  const regex = new RegExp("^\\s*" + value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+REG_(SZ|EXPAND_SZ)\\s+(.*)$", "i");
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(regex);
    if (match) return match[2].trim();
  }
  return null;
}

async function regListKeys(baseKey) {
  const output = await regQuery([baseKey]);
  if (!output) return [];
  const keys = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^(HKEY_[A-Z0-9\\_]+)$/i);
    if (match) keys.push(match[1]);
  }
  return keys;
}

// Procura o executável principal do aplicativo na pasta de instalação.
async function findMainExe(installLocation, productName) {
  if (!installLocation || !fs.existsSync(installLocation)) return null;
  try {
    const entries = await fs.promises.readdir(installLocation, { withFileTypes: true });
    const target = productName.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    // 1ª passada: nome esperado
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) {
        if (entry.name.replace(/[^A-Za-z0-9]/g, "").toLowerCase() === target) {
          return path.join(installLocation, entry.name);
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function matchRegistryForName(appId, displayName) {
  for (const base of UNINSTALL_KEYS) {
    const keys = await regListKeys(base);
    for (const keyPath of keys) {
      const name = await getEntryValue(keyPath, "DisplayName");
      if (!name) continue;
      const nameClean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetClean = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!targetClean || !nameClean.includes(targetClean)) continue;
      const [version, location] = await Promise.all([
        getEntryValue(keyPath, "DisplayVersion"),
        getEntryValue(keyPath, "InstallLocation"),
      ]);
      const exe = await findMainExe(location || "", displayName);
      return {
        appId,
        installed: true,
        version: version || null,
        location: location || null,
        exe,
        source: "registry",
      };
    }
  }
  return { appId, installed: false };
}

// Varredura principal: recebe [{id, name}] e devolve o mapa id -> resultado.
async function scanInstalledApps(apps) {
  const results = {};
  for (const app of apps) {
    const { id, name } = app;
    if (!id || !name) return;
    let result;
    try {
      result = await matchRegistryForName(id, name);
    } catch {
      result = { appId: id, installed: false };
    }
    // Fallback: pasta instalada por usuário do NSIS padrão.
    if (!result.installed) {
      const localPrograms = path.join(process.env["LOCALAPPDATA"] || "", "Programs");
      const candidate = path.join(localPrograms, name);
      if (fs.existsSync(candidate)) {
        const exe = await findMainExe(candidate, app.name);
        if (exe) {
          result = { appId: id, installed: true, version: null, location: candidate, exe, source: "filesystem" };
        }
      }
    }
    results[id] = result;
  }
  return results;
}

module.exports = { scanInstalledApps };
