// Banner de boas-vindas — fiel ao visual de referência do programa.
const FEATURES = [
  {
    label: "Aplicativos oficiais",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    label: "Atualizações automáticas",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
    ),
  },
  {
    label: "Downloads seguros",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Interface moderna",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M9 3v18" />
      </svg>
    ),
  },
];

export default function HeroBanner() {
  return (
    <div className="hero-banner">
      {/* Auroras decorativas (CSS puro, sem blur pesado) */}
      <span className="hero-aurora a1" aria-hidden="true" />
      <span className="hero-aurora a2" aria-hidden="true" />
      <span className="hero-grid" aria-hidden="true" />

      <div className="hero-text">
        <span className="hero-eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          BEM-VINDO AO
        </span>
        <h1>
          Elements <span>Launcher</span>
        </h1>
        <p>
          Baixe, instale e gerencie todos os seus aplicativos em um só lugar.
          Simples, rápido e seguro.
        </p>

        <div className="hero-features">
          {FEATURES.map((f) => (
            <div className="feature-tag" key={f.label}>
              <span className="feature-icon">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </div>

      <div className="hero-graphic">
        <span className="orbit orbit-1" aria-hidden="true" />
        <span className="orbit orbit-2" aria-hidden="true" />
        <div className="cube-icon">
          <img src="./logo.png" alt="Logo Elements Launcher" />
        </div>
        <div className="graphic-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
          </svg>
          Mais aplicativos em breve!
        </div>
      </div>
    </div>
  );
}
