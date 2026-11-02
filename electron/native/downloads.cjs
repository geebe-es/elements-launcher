// Gerenciador de downloads do processo principal.
// - Somente HTTPS
// - apenas hosts autorizados (na lista passada em payload.allowedHosts)
// - progresso real via eventos (sem valores fake)
// - cancelamento via AbortController
// - sha256 do arquivo baixado após conclusão
const { EventEmitter } = require("node:events");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const streamPromises = require("node:stream/promises");

const MAX_HOSTS = 20;
const MAX_FILE_NAME = 120;

function sanitizeFileName(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, MAX_FILE_NAME) || "instalador.exe";
}

function isHostAllowed(hostname, allowedHosts) {
  if (!hostname) return false;
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (allowedHosts || []).some((allowed) => {
    const a = String(allowed).toLowerCase();
    return host === a || host.endsWith("." + a);
  });
}

function createDownloadManager() {
  const events = new EventEmitter();
  const active = new Map(); // id -> { controller, received, total }

  async function sha256File(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  async function start(payload) {
    const { id, url, allowedHosts = [], dir, fileName } = payload || {};
    if (!id || !url || !dir) throw new Error("Parâmetros de download incompletos.");
    if (active.has(id)) throw new Error("Já existe um download em andamento para este aplicativo.");

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Endereço de download inválido.");
    }
    if (parsed.protocol !== "https:") throw new Error("Apenas downloads por HTTPS são permitidos.");
    if (!isHostAllowed(parsed.hostname, allowedHosts)) {
      throw new Error("Host de download não autorizado neste catálogo.");
    }

    const destDir = path.resolve(dir);
    await fs.promises.mkdir(destDir, { recursive: true });
    const destFile = path.join(destDir, sanitizeFileName(fileName || parsed.pathname.split("/").pop() || id + "-instalador.exe"));

    const controller = new AbortController();
    const record = { controller, received: 0, total: null };
    active.set(id, record);

    try {
      const response = await fetch(parsed, {
        signal: controller.signal,
        redirect: "follow",
      });

      if (!response.ok) throw new Error("Servidor respondeu com código HTTP " + response.status + ".");

      const lenHeader = response.headers.get("content-length");
      record.total = lenHeader ? Number(lenHeader) : null;

      const engine = require("node:stream").Readable.fromWeb(response.body);
      const fileStream = fs.createWriteStream(destFile);
      engine.on("data", (chunk) => {
        record.received += chunk.length;
        events.emit("event", {
          type: "progress",
          id,
          received: record.received,
          total: record.total,
        });
      });

      await streamPromises.pipeline(engine, fileStream);

      const actualSha256 = await sha256File(destFile);
      const expected = typeof payload.sha256 === "string" && /^[a-fA-F0-9]{64}$/.test(payload.sha256) ? payload.sha256.toLowerCase() : null;
      const sha256Ok = expected ? expected === actualSha256 : true;

      if (!sha256Ok) {
        await fs.promises.rm(destFile, { force: true }).catch(() => {});
        active.delete(id);
        events.emit("event", { type: "error", id, message: "Verificação de integridade (SHA-256) falhou. O arquivo foi descartado." });
        return;
      }

      active.delete(id);
      events.emit("event", {
        type: "done",
        id,
        path: destFile,
        size: record.received,
        sha256: actualSha256,
        sha256Verified: Boolean(expected),
      });
    } catch (err) {
      const aborted = controller.signal.aborted;
      const size = record.total || 0;
      const receivedAll = size > 0 && record.received >= size;
      // Arquivo incompleto → remove.
      if (!(receivedAll && !aborted)) {
        await fs.promises.rm(destFile, { force: true }).catch(() => {});
      }
      active.delete(id);
      if (aborted) {
        events.emit("event", { type: "cancelled", id });
      } else {
        events.emit("event", {
          type: "error",
          id,
          message: err && err.message ? err.message : "Falha no download.",
        });
      }
    }
  }

  function cancel(id) {
    const rec = active.get(id);
    if (rec) rec.controller.abort();
  }

  function isRunning(id) {
    return active.has(id);
  }

  return { events, start, cancel, isRunning };
}

module.exports = { createDownloadManager, sanitizeFileName, isHostAllowed };
