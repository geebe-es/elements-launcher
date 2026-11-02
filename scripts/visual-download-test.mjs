// Teste visual/e2e: abre o launcher no Electron, inicia um download real,
// captura o estado "Baixando" (progresso/cancelar) e encerra.
import { _electron as electron } from "file:///D:/APPS/InstaSave/node_modules/@playwright/test/index.mjs";
import path from "node:path";
import os from "node:os";

const TMP = os.tmpdir();

const app = await electron.launch({
  args: ["."],
  cwd: "D:/APPS/Elements Launcher",
});

const win = await (async () => {
  // O splash fecha sozinho: esperamos a janela principal (index.html)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    for (const w of app.windows()) {
      if ((w.url() || "").includes("index.html")) return w;
    }
    if (app.isClosed?.()) break;
  }
  throw new Error("janela principal nao apareceu");
})();
win.on("console", (m) => {
  if (m.type() === "error") console.log("[renderer-error]", m.text());
});
await win.waitForTimeout(2500);

// Clica no primeiro botao "Baixar" (card em destaque na home)
const baixar = win.locator("button:has-text('Baixar')");
if ((await baixar.count()) === 0) {
  console.log("botao Baixar nao encontrado");
  await app.close();
  process.exit(1);
}
await baixar.first().click();

// Aguarda o download comecar e evoluir
await win.waitForTimeout(4000);
let bytes1 = null;
let bytes2 = null;
try {
  bytes1 = await win.locator(".download-progress-head .dl-line").first().textContent();
  console.log("progresso t0:", bytes1 && bytes1.trim());
  await win.screenshot({ path: path.join(TMP, "dl-state-anim.png") });
  await win.waitForTimeout(2500);
  bytes2 = await win.locator(".download-progress-head .dl-line").first().textContent();
  console.log("progresso t1:", bytes2 && bytes2.trim());
} catch (e) {
  console.log("barra de progresso nao encontrada:", String(e).slice(0, 120));
}

console.log("bytes evoluiram:", bytes1 !== bytes2, JSON.stringify(bytes1), "->", JSON.stringify(bytes2));

// Cancela (testa o botao Cancelar + evento cancelled)
try {
  await win.locator("button:has-text('Cancelar')").first().click({ timeout: 3000 });
  await win.waitForTimeout(800);
  console.log("cancelado ok");
} catch (e) {
  console.log("cancelar indisponivel");
}

await win.screenshot({ path: path.join(TMP, "dl-state-after.png") });
await app.close();
console.log("fim");
