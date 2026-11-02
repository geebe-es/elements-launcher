# Elements Launcher

<p align="center">
  <img src="public/logo.png" width="120" alt="Elements Launcher" />
</p>

**Central de aplicativos do Elements** — desktop app (Electron + React) para distribuir, baixar, instalar e atualizar os programas da suíte: [ConvertMp3](https://github.com/geebe-es/ConvertMp3) e [InstaSave](https://github.com/geebe-es/Instasave).

## Recursos

- **Catálogo real** — URLs e hashes SHA-256 publicados no GitHub Releases dos apps; nada fictício
- **Downloads nativos** — somente HTTPS, hosts autorizados, progresso real em MB, cancelamento, verificação SHA-256 antes de liberar instalação
- **Confirmação antes de instalar** — modal mostra caminho do arquivo e status de integridade do hash
- **Detecção de instalação** — Windows Registry (`HKLM`/`HKCU` Uninstall) + fallback em `%LOCALAPPDATA%\Programs`
- **Auto-update do launcher** — `electron-updater` + GitHub Releases (canal `latest.yml`)
- **Splash screen** com a logo animada na abertura
- Janela frameless com tema dark premium (violeta Índigo) e layout responsivo

## Desenvolvimento

```bash
npm install
npm run dev      # Vite + Electron (hot reload)
npm run build    # typecheck + build do renderer
npm run start    # electron . (usa dist/ já construído)
```

## Empacotamento

```bash
npm run dist     # build + electron-builder NSIS + Portable (release/)
npm run release  # dist + publica release no GitHub (tag = package.json version)
```

`npm run release` publica em https://github.com/geebe-es/elements-launcher/releases
(Setup + blockmap + Portable + `latest.yml` — o canal do auto-update). Regênere com uma
nova versão no `package.json` para distribuir atualização.

## Estrutura

```
electron/            processo principal (main.cjs) + preload (contextBridge)
  native/            downloads.cjs (fetch+sha256) e installs.cjs (registro Windows)
  splash.html        tela de loading
src/                 React (Vite + TypeScript)
  data/apps.ts       catálogo de aplicativos
  context/           LauncherContext — estados por app (baixando/baixado/instalado…)
  components/        UI (cards, barras de progresso, modal de instalação…)
scripts/             dev.mjs (Vite+Electron) e release.mjs (pipeline de publicação)
```

## Segurança

- `contextIsolation` + `sandbox` ativados; renderer sem acesso direto ao Node
- Downloads limitados a hosts autorizados e HTTPS
- Instalador só é executado após confirmação explícita do usuário
- Sem assinatura de código: o Windows SmartScreen pode avisar na primeira execução
