import { useLauncher } from "../context/LauncherContext";

/** Modal de confirmação antes de executar um instalador baixado. */
export default function ConfirmInstallerModal() {
  const { confirm, setConfirm, updateStatus } = useLauncher();

  if (!confirm) return null;

  const run = async () => {
    const { app, filePath } = confirm;
    setConfirm(null);
    if (!filePath) return;
    updateStatus(app.id, { status: "installing" });
    if (window.electronAPI?.runInstaller) {
      const result = await window.electronAPI.runInstaller(filePath);
      if (result?.ok) {
        window.alert(
          `Instalador do ${app.name} em execução.\n\nAo concluir (ou cancelar) a instalação, clique em "Verificar atualizações" em Meus Aplicativos para o launcher confirmar a detecção.`
        );
        updateStatus(app.id, { status: "available", received: 0, total: null, progress: 0 });
      } else {
        updateStatus(app.id, { status: "error", error: result?.error || "Falha ao executar o instalador." });
      }
    }
  };

  const skip = () => {
    setConfirm(null);
    // Mantém o arquivo baixado: o usuário pode instalar depois.
    updateStatus(confirm.app.id, { status: "downloaded" });
  };

  return (
    <div className="modal-backdrop" onClick={skip}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Executar instalador</h3>
        <p>
          Instalador baixado: <strong>{confirm.app.name}</strong> v{confirm.app.version}
        </p>
        <p className="modal-path" title={confirm.filePath ?? ""}>
          {confirm.filePath ?? "Arquivo não disponível"}
        </p>
        <p className={`modal-hash ${confirm.shaVerified ? "ok" : "warn"}`}>
          {confirm.shaVerified
            ? "✓ Integridade verificada com SHA-256"
            : "⚠ Integridade NÃO verificada — hash SHA-256 ainda não publicado no catálogo"}
        </p>
        <p className="modal-note">Confirme que deseja executar este instalador neste computador.</p>
        <div className="modal-actions">
          <button className="btn-outline" onClick={skip}>
            Instalar depois
          </button>
          <button className="btn-action" onClick={run} disabled={!confirm.filePath}>
            Executar instalador
          </button>
        </div>
      </div>
    </div>
  );
}
