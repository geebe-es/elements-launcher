// Suite de testes e2e (modo dev): deteccao -> desinstalar InstaSave ->
// reinstalar InstaSave -> verificacoes reais no registro/disco.
import { _electron as electron } from "file:///D:/APPS/InstaSave/node_modules/@playwright/test/index.mjs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";

const run = promisify(exec);
const TMP = os.tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? " | " + extra : ""}`);
  if (cond) pass++;
  else fail++;
}

// Chanheca real via registro + pasta (fora do app!)
async function realStateInstalled() {
  try {
    const { stdout } = await run(
      'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /v DisplayName /f InstaSave 2>nul',
      { shell: "cmd.exe" }
    );
    const hasEntry = /InstaSave/i.test(stdout);
    const { stdout: dirOut } = await run(
      'cmd /c if exist "C:\\Users\\gabri\\AppData\\Local\\Programs\\InstaSave\\InstaSave.exe" (echo SIM) else (echo NAO)',
      { shell: "cmd.exe" }
    );
    const folder = /SIM/.test(dirOut);
    return { hasEntry, folder, any: hasEntry || folder };
  } catch (e) {
    return { hasEntry: false, folder: false, any: false, err: String(e).slice(0, 80) };
  }
}

const app = await electron.launch({ args: ["."], cwd: "D:/APPS/Elements Launcher" });
const win = await (async () => {
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    for (const w of app.windows()) if ((w.url() || "").includes("index.html")) return w;
  }
  throw new Error("janela principal nao apareceu");
})();

// Confirma dialogs automaticamente (window.confirm do Desinstalar)
win.on("dialog", (d) => d.accept().catch(() => {}));

await sleep(3000);

const cardOf = (name) => win.locator(`.app-card:has-text("${name}")`).first();
async function badgeOf(name) {
  try {
    const t = await cardOf(name).locator(".status-badge").textContent();
    return (t || "").trim();
  } catch {
    return "(sem card)";
  }
}

// ---------------------------------------------------------------
// TESTE 1 — Detecção da varredura (app já instalado anteriormente)
// ---------------------------------------------------------------
console.log("\n========== TESTE 1: deteccao inicial (checagem) ==========");
const badgeC1 = await badgeOf("ConvertMp3");
const badgeI1 = await badgeOf("IntaSave");
console.log("t1 badges:", badgeC1, "|", badgeI1);
check("TESTE1 ConvertMp3 = Disponível (não instalado)", /Dispon interracial|Dispone|Dispon/.test(badgeC1) || badgeC1.includes("Dispon"), badgeC1);
check("TESTE1 InstaSave = Instalado (instalado anteriormente)", badgeI1.includes("Instalado") && !badgeI1.includes("Desinstalando"), badgeI1);

const beforeReal = await realStateInstalled();
check("TESTE1 InstaSave presente no registro/disco", beforeReal.any, JSON.stringify(beforeReal));
await win.screenshot({ path: path.join(TMP, "t1-detection.png") });

// ---------------------------------------------------------------
// TESTE 2 — Desinstalar via UI (botão na home) + verificação real
// ---------------------------------------------------------------
console.log("\n========== TESTE 2: desinstalar InstaSave via UI ==========");
await cardOf("IntaSave").locator("button:has-text('Desinstalar')").click({ timeout: 5000 });
console.log("clicado Desinstalar (confirm auto-aceito)");

let badge2 = "";
const t2 = Date.now();
let sawUninstalling = false;
while (Date.now() - t2 < 120000) {
  await sleep(2000);
  badge2 = await badgeOf("IntaSave");
  if (!sawUninstalling && badge2.includes("Desinstalando")) {
    sawUninstalling = true;
    console.log("estado intermediário:", badge2);
  }
  if (badge2.includes("Dispon") || badge2.includes("Erro")) break;
}
console.log("badge final t2:", badge2);
check("TESTE2 badge = Disponível após desinstalar", badge2.includes("Dispon"), badge2);

// Dá 8s para a limpeza do NSIS terminar (cópia para TEMP sai antes)
await sleep(8000);
const afterRealU = await realStateInstalled();
check("TESTE2 InstaSave removido do registro", !afterRealU.hasEntry, JSON.stringify(afterRealU));
check("TESTE2 pasta do InstaSave removida", !afterRealU.folder, JSON.stringify(afterRealU));
await win.screenshot({ path: path.join(TMP, "t2-uninstalled.png") });

// ---------------------------------------------------------------
// TESTE 3 — Reinstalar via UI (Baixar -> auto-install silencioso)
// ---------------------------------------------------------------
console.log("\n========== TESTE 3: reinstalar InstaSave via UI (1 clique) ==========");
await cardOf("IntaSave").locator("button:has-text('Baixar')").click({ timeout: 5000 });
console.log("clicado Baixar");

let badge3 = "";
const phases = [];
const t3 = Date.now();
let last3 = "";
while (Date.now() - t3 < 300000) {
  await sleep(2000);
  badge3 = await badgeOf("IntaSave");
  if (badge3 && badge3 !== last3) {
    phases.push(`t=${Math.round((Date.now() - t3) / 1000)}s ${badge3}`);
    last3 = badge3;
  }
  if (/^Instalado$/.test(badge3) || /Erro/.test(badge3)) break;
}
console.log("fases t3:", phases.join(" -> "));
check("TESTE3 badge final = Instalado", /^Instalado$/.test(badge3.trim()), badge3);

const afterRealI = await realStateInstalled();
check("TESTE3 InstaSave registrada novamente no sistema", afterRealI.hasEntry, JSON.stringify(afterRealI));
check("TESTE3 pasta/exe restaurados", afterRealI.folder, JSON.stringify(afterRealI));
await win.screenshot({ path: path.join(TMP, "t3-reinstalled.png") });

// ---------------------------------------------------------------
// TESTE 4 — Detecção depois de reinstalar (checagem contínua)
// ---------------------------------------------------------------
console.log("\n========== TESTE 4: checagem pos-reinstalacao ==========");
const badgeI4 = await badgeOf("IntaSave");
check("TESTE4 InstaSave segue Instalado", badgeI4.includes("Instalado"), badgeI4);

await app.close();
console.log(`\nRESUMO: ${pass} passou, ${fail} falhou`);
process.exit(fail > 0 ? 1 : 0);
