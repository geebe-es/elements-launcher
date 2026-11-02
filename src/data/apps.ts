// Catálogo de aplicativos — dados REAIS publicados no GitHub Releases.
// URLs e hashes verificados: GitHub registra o digest SHA-256 do asset,
// e o download nativo recalcula o hash após baixar (dilate == Publicado).
export interface AppInfo {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  version: string;
  size: string;
  /** Ícone real do aplicativo (copiado do projeto original). */
  icon: string;
  downloadUrl: string | null;
  sha256: string | null;
  allowedHosts: string[];
  changelog: string[];
}

export const APPS: AppInfo[] = [
  {
    id: "convertmp3",
    name: "ConvertMp3",
    description:
      "Baixe músicas do YouTube e SoundCloud em alta qualidade, de forma rápida e simples.",
    longDescription:
      "Conversor e gerenciador de áudio desktop com interface moderna, suporte a múltiplos formatos e extração de áudio de vídeos.",
    category: "Áudio",
    version: "1.0.4",
    size: "235.5 MB",
    icon: "icons/convertmp3.png",
    downloadUrl: "https://github.com/geebe-es/ConvertMp3/releases/download/v1.0.4/ConvertMp3-Setup.exe",
    sha256: "1b46b7f55ec259dae180917f86b8d11674dcd8b91d671fc145d6beeb4c5e5f74",
    allowedHosts: ["github.com", "objects.githubusercontent.com"],
    changelog: [
      "v1.0.4 — Versão atual publicada no GitHub Releases",
    ],
  },
  {
    id: "intasave",
    name: "IntaSave",
    description:
      "Baixe fotos, vídeos e stories do Instagram com apenas alguns cliques.",
    longDescription:
      "Preserve seus momentos favoritos do Instagram em qualidade original. Cole o link da publicação e baixe em segundos, com segurança e simplicidade.",
    category: "Imagens e Vídeos",
    version: "1.0.0",
    size: "134.4 MB",
    icon: "icons/instasave.ico", // .ico original (já recortado, 16→256px)
    downloadUrl: "https://github.com/geebe-es/Instasave/releases/download/v1.0.0/InstaSave-Setup-1.0.0.exe",
    sha256: "6a1fbe913a905b5024dde3d1984a88718100f1805c22fe715b6ebab8767b785c",
    allowedHosts: ["github.com", "objects.githubusercontent.com"],
    changelog: [
      "v1.0.0 — Lançamento inicial publicado no GitHub Releases",
    ],
  },
];

export const CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "Áudio", label: "Áudio" },
  { key: "Imagens e Vídeos", label: "Imagens e Vídeos" },
  { key: "Ferramentas", label: "Ferramentas" },
  { key: "Outros", label: "Outros" },
];
