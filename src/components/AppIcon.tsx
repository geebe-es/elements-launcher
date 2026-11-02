import { useState } from "react";
import type { AppInfo } from "../data/apps";

/**
 * Ícone do aplicativo do catálogo.
 * Usa o ícone real do projeto (public/icons/<id>.png, extraído dos
 * assets originais); o gradiente fica apenas como fundo/fallback.
 */
export default function AppIcon({ app, size = "md" }: { app: AppInfo; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const classNames = `app-icon-branded app-${app.id} icon-${size}`;

  if (failed) {
    // Fallback: gradiente + primeira letra, caso o ícone não carregue.
    return (
      <div className={`${classNames} app-icon-fallback`} aria-hidden="true">
        <span>{app.name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <div className={`${classNames} has-img`} aria-hidden="true">
      <img
        src={app.icon}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
