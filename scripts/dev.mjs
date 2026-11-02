// Script de desenvolvimento — inicia o Vite (React) e o Electron juntos.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const DEV_URL = "http://localhost:5173";

async function main() {
  const vite = await import("vite");
  const server = await vite.createServer({
    server: { port: 5173, strictPort: true },
  });
  await server.listen();
  console.log("Vite pronto em:", DEV_URL);

  const electronBin = require("electron"); // caminho do executável do Electron
  const child = spawn(electronBin, ["."], {
    stdio: "inherit",
    env: { ...process.env, VITE_DEV_SERVER_URL: DEV_URL },
  });

  child.on("close", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar o modo dev:", err);
  process.exit(1);
});
