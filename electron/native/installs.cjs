// ============================================================================
//  Detecção de aplicativos instalados no Windows.
//  - Uma única execução de `reg query <Hive>\...\Uninstall /s` por seção do
//    registro (HKLM, HKLM\Wow6432Node, HKCU) — em vez de dezenas de chamadas
//    — e um parser que extrai DisplayName/Version/Location/Icon/Uninstall.
//  - Se nada for encontrado, o app é reportado como não instalado (honesto).
//  - Também devolve o `uninstaller` oficial para o botão Desinstalar.
// ============================================================================
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const UNINSTALL_KEYS = [
  "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
];

function executeCommand(args) {
  return new Promise((resolve) => {
    execFile("reg", ["query", ...args], { windowsHide: true, timeout: 20000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? null : stdout || "");
    });
  });
}

// Executa `reg query <base> /s` e devolve um mapa: caminho completo da chave -> valores.
async function readUninstallEntries(base) {
  const out = await executeCommand([base, "/s"]);
  const map = new Map();
  if (!out) return map;
  let currentKey = null;
  let currentVals = null;
  const valueLine = /^\s*([^!]+?)\s+REG_(?:SZ|EXPAND_SZ|MULTI_SZ)\s+(.*)$/i;
  for (const rawLine of out.split(/\r?\n/)) {
    const line = rawLine.replace(/\0/g, "").trimEnd();
    if (!line.trim()) {
      currentKey = null;
      currentVals = null;
      continue;
    }
    if (/^[Hh][Kk][Ee][Yy]_/.test(line.trim())) {
      currentKey = line.trim();
      currentVals = {};
      map.set(currentKey, currentVals);
      continue;
    }
    if (currentKey && currentVals) {
      const m = line.match(valueLine);
      if (m) currentVals[m[1].trim()] = m[2].trim();
    }
  }
  return map;
}

let entriesCache = null;
let entriesCacheAt = 0;

// Cache curto para a varredura em sequência (re-instalação chama a varredura 2×).
async function getEntries() {
  const now = Date.now();
  if (entriesCache && now - entriesCacheAt < 3000) return entriesCache;
  const combined = [];
  for (const base of UNINSTALL_KEYS) {
    combined.push(await readUninstallEntries(base));
  }
  entriesCache = combined;
  entriesCacheAt = now;
  return combined;
}

// Procura o executável principal do aplicativo na pasta de instalação.
async function findMainExe(installLocation, productName) {
  if (!installLocation || !fs.existsSync(installLocation)) return null;
  try {
    const entries = await fs.promises.readdir(installLocation, { withFileTypes: true });
    const target = productName.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
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

function extractExePath(value) {
  if (!value) return null;
  const exeMatch = value.match(/"([^"]+\.exe[^"]*)"/i) || value.match(/^(\S+?\.exe)/i);
  return exeMatch ? exeMatch[1] : null;
}

async function matchRegistryForName(appId, displayName) {
  const hives = await getEntries();
  const targetClean = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!targetClean) return { appId, installed: false };

  const candidates = [];
  for (const hive of hives) {
    for (const [keyPath, vals] of hive) {
      const name = vals.DisplayName;
      if (!name) continue;
      const nameClean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!nameClean.includes(targetClean)) continue;
      // Preferência: nome exato/menos sufixo ("IntaSave" vence "IntaSave Admin").
      const exact = nameClean === targetClean;
      candidates.push({ keyPath, vals, nameClean, exact, len: nameClean.length });
    }
  }
  candidates.sort((a, b) => Number(b.exact) - Number(a.exact) || a.len - b.len);

  for (const cand of candidates) {
    const { keyPath, vals } = cand;
    const location = vals.InstallLocation || null;
    const displayIcon = vals.DisplayIcon || null;

    let exe = await findMainExe(location || "", displayName);

    // Fallback: DisplayIcon aponta para o exe principal ("C:\...\app.exe,0").
    if (!exe && displayIcon) {
      const stripped = displayIcon.split(",")[0].trim().replace(/^"|"$/g, "");
      if (fs.existsSync(stripped)) {
        if (stripped.toLowerCase().endsWith(".exe")) exe = stripped;
        else {
          const sibling = path.join(path.dirname(stripped), displayName.replace(/[^A-Za-z0-9]/g, "") + ".exe");
          if (fs.existsSync(sibling)) exe = sibling;
        }
      }
    }

    // Desinstalador oficial: QuietUninstallString > UninstallString > NSIS padrão.
    let uninstaller = extractExePath(vals.QuietUninstallString) || extractExePath(vals.UninstallString) || null;
    if (!uninstaller && exe) {
      const nsisUn = path.join(path.dirname(exe), "Uninstall " + displayName + ".exe");
      if (fs.existsSync(nsisUn)) uninstaller = nsisUn;
    }

    return {
      appId,
      installed: true,
      version: vals.DisplayVersion || null,
      location: location || null,
      exe: exe || null,
      uninstaller,
      source: "registry",
    };
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
    // Fallback: pasta por usuário do NSIS padrão (registro pode não ter chave).
    if (!result.installed) {
      const localPrograms = path.join(process.env["LOCALAPPDATA"] || "", "Programs");
      const candidate = path.join(localPrograms, name);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        const exe = await findMainExe(candidate, name);
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
