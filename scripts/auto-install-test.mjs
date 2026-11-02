// Teste e2e do fluxo automatico: Baixar -> download -> instalacao silenciosa -> Instalado.
import { _electron as electron } from "file:///D:/APPS/InstaSave/node_modules/@playwright/test/index.mjs";
import path from "node:path";
import os from "node:os";

const TMP = os.tmpdir();

const app = await electron.launch({ args: ["."], cwd: "D:/APPS/Elements Launcher" });

const win = await (async () => {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    for (const w of app.windows()) {
      if ((w.url() || "").includes("index.html")) return w;
    }
  }
  throw new Error("janela principal nao apareceu");
})();

await win.waitForTimeout(2500);

const baixar = win.locator("button:has-text('Baixar')");
if ((await baixar.count()) === 0) {
  console.log("botao Baixar nao encontrado");
  await app.close();
  process.exit(1);
}
await baixar.first().click();
console.log("clicado Baixar");

const t0 = Date.now();
let last = "";
while (Date.now() - t0 < 240000) {
  await win.waitForTimeout(1500);
  let badge = "";
  try {
    const b = win.locator(".app-card-footer .status-badge").first();
    badge = ((await b.textContent()) || "").trim();
  } catch {}
  if (badge && badge !== last) {
    last = badge;
    console.log("t=" + Math.round((Date.now() - t0) / 1000) + "s:", badge);
  }
  if (/Instalado$|Erro$/.test(badge)) {
    await win.screenshot({ path: path.join(TMP, "auto-install-end.png") });
    console.log("estado final:", badge);
    break;
  }
}

if (!/Instalado$|Erro$/.test(last)) console.log("timeout sem estado final:", last);
await app.close();
console.log("fim");
