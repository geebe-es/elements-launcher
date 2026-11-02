import { useEffect, useState } from "react";
import AppIcon from "./AppIcon";
import { APPS } from "../data/apps";
import { useLauncher } from "../context/LauncherContext";

interface NewsItem {
  repo: string;
  appName: string;
  version: string;
  title: string;
  date: Date | null;
  url: string;
}

const NEWS_REPOS = [
  { repo: "geebe-es/ConvertMp3", appName: "ConvertMp3" },
  { repo: "geebe-es/Instasave", appName: "InstaSave" },
  { repo: "geebe-es/elements-launcher", appName: "Elements Launcher" },
];

// Novidades reais: últimos releases dos projetos do catálogo (API pública do GitHub).
export function useNews() {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");

  useEffect(() => {
    let alive = true;
    Promise.allSettled(
      NEWS_REPOS.map((r) =>
        fetch(`https://api.github.com/repos/${r.repo}/releases?per_page=1`)
          .then((res) => res.json().then((items) => ({ ...r, items })))
      )
    ).then((settled) => {
      if (!alive) return;
      const items: NewsItem[] = [];
      let anyOk = false;
      for (const s of settled) {
        if (s.status !== "fulfilled" || !Array.isArray(s.value?.items)) continue;
        anyOk = true;
        for (const rel of s.value.items) {
          if (!rel?.tag_name) continue;
          items.push({
            repo: s.value.repo,
            appName: s.value.appName,
            version: String(rel.tag_name).replace(/^v/, ""),
            title: rel.name || rel.tag_name,
            date: rel.published_at ? new Date(rel.published_at) : null,
            url: rel.html_url,
          });
        }
      }
      items.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
      setNews(items);
      setState(anyOk ? "ok" : "offline");
    });
    return () => {
      alive = false;
    };
  }, []);

  return { news, state };
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function RightSidebar() {
  const { states, lastScan, scan, openApp } = useLauncher();
  const { news, state: newsState } = useNews();

  // Painel de Atualizações — dados reais do contexto (nada fixo/inventado)
  const installedApps = APPS.filter((a) => {
    const st = states[a.id];
    return st?.status === "installed" || st?.status === "updateAvailable";
  });

  const lastScanLabel = lastScan
    ? `Hoje, ${lastScan.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "Nunca";

  return (
    <aside className="right-sidebar">
      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Aplicativos instalados
          </h3>
          <span className="badge-count">{installedApps.length}</span>
        </div>
        {installedApps.length > 0 ? (
          installedApps.map((app) => (
            <div className="update-item-card" key={app.id}>
              <AppIcon app={app} size="sm" />
              <div className="update-info">
                <h4>{app.name}</h4>
                <p className="version-change">
                  {states[app.id]?.installedVersion ? `v${states[app.id]?.installedVersion}` : "versão não identificada"}
                </p>
                <button className="text-mini-btn" onClick={() => openApp(app)}>
                  Abrir
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="update-item-card empty-widget">
            <div className="update-info">
              <p className="update-desc">
                Nada detectado ainda. Realize a varredura ou instale um aplicativo.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="last-check">
        <div className="check-time-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Última verificação
        </div>
        <span>{lastScanLabel}</span>
        <button className="btn-verify" onClick={scan}>
          Verificar atualizações
        </button>
      </div>

      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
            Novidades
          </h3>
        </div>
        {newsState === "loading" ? (
          <div className="update-item-card empty-widget">
            <div className="update-info">
              <p className="update-desc">Buscando novidades…</p>
            </div>
          </div>
        ) : newsState === "offline" || !news || news.length === 0 ? (
          <div className="update-item-card empty-widget">
            <div className="update-info">
              <p className="update-desc">
                {newsState === "offline"
                  ? "Sem conexão com o GitHub — novidades indisponíveis agora."
                  : "Nenhum release publicado ainda."}
              </p>
            </div>
          </div>
        ) : (
          <div className="news-card real">
            <div className="news-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="news-content">
              <h4>{news[0].appName} v{news[0].version}</h4>
              <p>{news[0].title}</p>
              <a
                className="news-date"
                href={news[0].url}
                target="_blank"
                rel="noreferrer"
                title={news[0].url}
              >
                {fmtDate(news[0].date)} · Ver anúncio →
              </a>
            </div>
          </div>
        )}
        {newsState === "ok" && news && news.length > 1 && (
          <div className="news-more">
            {news.slice(1, 3).map((n) => (
              <a key={n.url} href={n.url} target="_blank" rel="noreferrer" className="news-mini">
                <strong>{n.appName}</strong> v{n.version} · {fmtDate(n.date)}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
            Dicas
          </h3>
        </div>
        <div className="tip-content">
          <div className="tip-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p>
              Use a barra de pesquisa para encontrar rapidamente seus aplicativos
              favoritos.
            </p>
          </div>
          <div className="carousel-dots">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      </div>
    </aside>
  );
}
