// Pipeline de release do Elements Launcher.
// Uso: npm run release [-- --notes "texto"]   (roda dist + publicação)
// 1. Garante o build (se o Setup ainda não existe)
// 2. Valida/Regenera release/latest.yml na versão do package.json
//    (o electron-builder às vezes deixa o yml defasado — aqui nunca)
// 3. Cria o release no GitHub (ou reutiliza) e sobe os assets
// 4. Confirma: não-draft + todos os assets
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// const here = <projeto>/scripts ; root = sobe um nível
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
const version = pkg.version;
const tag = `v${version}`;
const repo = "geebe-es/elements-launcher";

const setup = path.join(root, "release", "Elements-Launcher-Setup.exe");
const blockmap = setup + ".blockmap";
const portable = path.join(root, "release", "Elements-Launcher-Portable.exe");
const yml = path.join(root, "release", "latest.yml");
const assets = [setup, blockmap, portable, yml];

// 1. build
if (!existsSync(setup)) {
  console.log("→ Setup não existe; executando `npm run dist`...");
  run("npm", ["run", "dist"]);
}
if (!existsSync(setup)) fail("Elements-Launcher-Setup.exe não foi gerado.");
console.log("✓ Setup presente (" + mb(statSize(setup)) + ").");

// 2. latest.yml — sempre regenerado a partir do arquivo real
const bytes = readFileSync(setup);
const sha512 = createHash("sha512").update(bytes).digest("base64");
writeFileSync(
  yml,
  [
    `version: ${version}`,
    `files:`,
    `  - url: Elements-Launcher-Setup.exe`,
    `    sha512: ${sha512}`,
    `    size: ${bytes.length}`,
    `path: Elements-Launcher-Setup.exe`,
    `sha512: ${sha512}`,
    `releaseDate: '${new Date().toISOString()}'`,
    ``,
  ].join("\n")
);
console.log(`✓ latest.yml regenerado (v${version}, ${mb(bytes.length)}).`);

// notas
const idx = process.argv.indexOf("--notes");
const userNotes = idx > -1 ? process.argv[idx + 1] : "";
const notes = userNotes || "Elements Launcher v" + version + " — instalador Windows.";

// 3. cria/reaproveita o release
let exists = true;
try {
  gh(["release", "view", tag, "--repo", repo], { allowFail: true });
} catch {
  exists = false;
}

if (!exists) {
  gh(["release", "create", tag,
    "--repo", repo,
    "--title", `Elements Launcher v${version}`,
    "--notes", notes,
    setup, blockmap, portable, yml]);
} else {
  console.log(`→ release ${tag} já existia; recarregando assets...`);
  gh(["release", "upload", tag, "--repo", repo, "--clobber", setup, blockmap, portable, yml]);
  gh(["release", "edit", tag, "--repo", repo, "--draft=false", "--title", `Elements Launcher v${version}`]);
}

// 4. confirma
const state = JSON.parse(gh(["release", "view", tag, "--repo", repo, "--json", "assets,isDraft"]));
const bad = state.assets.filter((a) => a.state !== "uploaded");
if (state.isDraft) fail("release ficou em draft.");
if (bad.length) fail("assets pendentes: " + bad.map((a) => a.name).join(", "));
console.log(`✓ Release ${tag} publicado com ${state.assets.length} assets:`);
console.log(`  https://github.com/${repo}/releases/tag/${tag}`);

function gh(args, opts = {}) {
  try {
    // sem shell: node passa os argumentos devidamente quotados (resolvo .exe pelo PATH)
    return execFileSync("gh", args, { encoding: "utf-8", stdio: opts.allowFail ? "pipe" : ["pipe", "pipe", "inherit"], windowsHide: true });
  } catch (err) {
    if (opts.allowFail) throw err;
    fail("`gh` falhou: " + (err.stderr || err.message));
  }
}
function run(cmd, args) {
  execFileSync(cmd, args, { encoding: "utf-8", shell: true, stdio: ["pipe", "pipe", "inherit"] });
}
function statSize(file) {
  return readFileSync(file).length;
}
function mb(n) {
  return (n / 1024 / 1024).toFixed(1) + " MB";
}
function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}
