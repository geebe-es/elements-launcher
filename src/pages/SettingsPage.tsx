import { useEffect, useState } from "react";
import { useLauncher } from "../context/LauncherContext";

export default function SettingsPage() {
  const { scan, updater, updaterCheck } = useLauncher();
  const [downloadDir, setDownloadDir] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI?.settingsGet?.().then((s?: { downloadDir?: string } | null) => setDownloadDir(s?.downloadDir ?? null));
  }, []);

  const chooseDownloadDir = async () => {
    if (!window.electronAPI?.settingsChooseDownloadDir) {
      window.alert("Alterar o diretório exige o app desktop (Electron).");
      return;
    }
    const result = await window.electronAPI.settingsChooseDownloadDir();
    if (result?.ok && result.dir) {
      setDownloadDir(result.dir);
      window.alert(`Diretório de downloads alterado para:\n${result.dir}`);
    }
  };

  return (
    <section className="page-section">
      <div className="section-header">
        <h2>⚙️ Configurações</h2>
      </div>

      <div className="settings-list">
        <div className="settings-card">
          <div className="setting-row">
            <div>
              <h4>Diretório de downloads</h4>
              <p id="download-dir-hint" title={downloadDir ?? ""}>
                {downloadDir ?? "Os instaladores baixados pelo launcher são salvos aqui"}
              </p>
            </div>
            <button className="btn-outline" onClick={chooseDownloadDir}>
              Alterar
            </button>
          </div>

          <div className="setting-row">
            <div>
              <h4>Verificar aplicativos instalados</h4>
              <p>Procura ConvertMp3 e InstaSave neste computador via registro do Windows</p>
            </div>
            <button className="btn-outline" onClick={scan}>
              Executar
            </button>
          </div>

          <div className="setting-row">
            <div>
              <h4>Auto-update do launcher</h4>
              <p>
                Atualiza o Elements Launcher via GitHub Releases. Última verificação:{" "}
                {updater.status === "latest"
                  ? "você está em dia"
                  : updater.status === "available"
                    ? `nova versão v${updater.version} disponível`
                    : updater.status === "unavailable-dev"
                      ? "disponível na versão instalada"
                      : updater.status === "error"
                        ? updater.error
                        : "nunca"}
              </p>
            </div>
            <button className="btn-outline" onClick={updaterCheck}>
              Verificar
            </button>
          </div>

          <div className="setting-row">
            <div>
              <h4>Diagnóstico</h4>
              <p>Electron {navigator.userAgent.includes("Electron") ? navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] ?? "" : "n/d (navegador)"} · React · Windows {navigator.platform}</p>
            </div>
            <span className="version-tag">v1.0.0</span>
          </div>
        </div>
      </div>
    </section>
  );
}
