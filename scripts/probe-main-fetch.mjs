// Sonda: executa fetch dentro do processo main do Electron e devolve os results.
import { _electron as electron } from "file:///D:/APPS/InstaSave/node_modules/@playwright/test/index.mjs";

const URL = "https://github.com/geebe-es/Instasave/releases/download/v1.0.0/InstaSave-Setup-1.0.0.exe";

const app = await electron.launch({ args: ["."], cwd: "D:/APPS/Elements Launcher" });

const hops = await app.evaluate(async () => {
  const out = [];
  let cur = new URL("https://github.com/geebe-es/Instasave/releases/download/v1.0.0/InstaSave-Setup-1.0.0.exe");
  for (let i = 0; i < 5; i++) {
    const r = await fetch(cur, { redirect: "manual" });
    out.push(i + ": " + r.status + " " + (r.headers.get("location") || "(final " + cur.hostname + ")"));
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      cur = new URL(r.headers.get("location"), cur);
      continue;
    }
    // tenta ler os primeiros bytes com timeout de 8s
    const first = await Promise.race([
      r.body.getReader().read().then((c) => "chunk ok, " + c.value.length + " bytes"),
      new Promise((r) => setTimeout(() => r("TIMEOUT lendo body (8s)"), 8000)),
    ]);
    out.push("body: " + first);
    try { await r.body.cancel(); } catch {}
    break;
  }
  return out;
});

console.log("HOPS NO MAIN DO ELECTRON:");
for (const h of hops) console.log("  " + h);

await app.close();
console.log("fim");
