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
    // Aceita qualquer formato de nome de chave (GUID, espaços, hífen) —
    // instaladores usam todo tipo de sufixo (_is1, chaves com GUID...).
    const match = line.trim().match(/^(HKEY_.+)$/i);
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
    const targetClean = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!targetClean) continue;
    const candidates = [];
    for (const keyPath of keys) {
      const name = await getEntryValue(keyPath, "DisplayName");
      if (!name) continue;
      const nameClean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!nameClean.includes(targetClean)) continue;
      // Preferência: correspondência exata e nome mais curto ("InstaSave"
      // vence "InstaSave Admin" quando ambos existirem).
      const exact = nameClean === targetClean || nameClean.startsWith(targetClean);
      candidates.push({ keyPath, exact, len: nameClean.length });
    }
    candidates.sort((a, b) => Number(b.exact) - Number(a.exact) || a.len - b.len);
    for (const { keyPath } of candidates) {
      const [displayIcon, displayVersion, location, uninstallString, quietUninstallString] = await Promise.all([
        getEntryValue(keyPath, "DisplayIcon"),
        getEntryValue(keyPath, "DisplayVersion"),
        getEntryValue(keyPath, "InstallLocation"),
        getEntryValue(keyPath, "UninstallString"),
        getEntryValue(keyPath, "QuietUninstallString"),
      ]);

      let exe = await findMainExe(location || "", displayName);

      // Fallback: DisplayIcon geralmente aponta para o exe principal
      // ("C:\...\app.exe,0" ou o caminho de um .ico ao lado dele).
      if (!exe && displayIcon) {
        const stripped = displayIcon.split(",")[0].trim().replace(/^"|"$/g, "");
        if (stripped.toLowerCase().endsWith(".exe") && fs.existsSync(stripped)) {
          exe = stripped;
        } else if (fs.existsSync(stripped)) {
          const sibling = path.join(path.dirname(stripped), displayName.replace(/[^A-Za-z0-9]/g, "") + ".exe");
          if (fs.existsSync(sibling)) exe = sibling;
        }
      }

      // Desinstalador oficial (preferência pelo modo silencioso).
      const rawUninstaller = quietUninstallString || uninstallString || null;
      let uninstaller = null;
      if (rawUninstaller) {
        // "C:\...\Uninstall X.exe" /S → extrai só o caminho do exe.
        const exeMatch = rawUninstaller.match(/"([^"]+\.exe)"/i) || rawUninstaller.match(/^(\S+\.exe)/i);
        if (exeMatch && fs.existsSync(exeMatch[1])) uninstaller = exeMatch[1];
      }
      if (!uninstaller && exe) {
        // Instaladores NSIS padrão (electron-builder) deixam "Uninstall <App>.exe" ao lado.
        const nsisUn = path.join(path.dirname(exe), "Uninstall " + displayName + ".exe");
        if (fs.existsSync(nsisUn)) uninstaller = nsisUn;
      }

      return {
        appId,
        installed: true,
        version: displayVersion || null,
        location: location || null,
        exe: exe || null,
        uninstaller,
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
    if (!id || !name) continue;
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
          const nsisUn = path.join(candidate, "Uninstall " + name + ".exe");
          const genericUn = path.join(candidate, "uninstall.exe");
          const uninstaller = fs.existsSync(nsisUn) ? nsisUn : fs.existsSync(genericUn) ? genericUn : null;
          result = { appId: id, installed: true, version: null, location: candidate, exe, uninstaller, source: "filesystem" };
        }
      }
    }
    results[id] = result;
  }
  return results;
}

module.exports = { scanInstalledApps };
