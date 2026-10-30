interface AppInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  size: string;
}

class ElementsLauncherUI {
  private apps: AppInfo[] = [
    {
      id: 'convertmp3',
      name: 'ConvertMp3',
      description: 'Baixe músicas do YouTube e SoundCloud em alta qualidade, de forma rápida e simples.',
      category: 'Áudio',
      version: '1.2.0',
      size: '52.4 MB'
    },
    {
      id: 'intasave',
      name: 'IntaSave',
      description: 'Baixe fotos, vídeos e stories do Instagram com apenas alguns cliques.',
      category: 'Imagens e Vídeos',
      version: '1.0.5',
      size: '15.8 MB'
    }
  ];

  constructor() {
    this.render();
    this.setupEvents();
  }

  private render() {
    // Render Featured
    const featuredContainer = document.getElementById('featured-container');
    if (featuredContainer) {
      featuredContainer.innerHTML = this.apps.map(app => `
        <div class="app-card">
          <div class="app-card-top">
            <div class="app-card-icon">${app.id === 'convertmp3' ? '🎵' : '📸'}</div>
            <div class="app-card-meta">
              <h3>${app.name}</h3>
              <span class="app-version">v${app.version}</span>
            </div>
            <span class="category-tag">${app.category}</span>
          </div>
          <p class="app-card-desc">${app.description}</p>
          <div class="app-card-footer">
            <div class="status-badge">
              <span class="status-dot"></span> Instalado
            </div>
            <button class="btn-action" data-action="open" data-id="${app.id}">Abrir</button>
          </div>
        </div>
      `).join('');
    }

    // Render All Apps list
    const allAppsContainer = document.getElementById('all-apps-container');
    if (allAppsContainer) {
      allAppsContainer.innerHTML = this.apps.map(app => `
        <div class="app-list-row">
          <div class="row-icon">${app.id === 'convertmp3' ? '🎵' : '📸'}</div>
          <div class="row-info">
            <h4>${app.name}</h4>
            <p>${app.description}</p>
          </div>
          <span class="row-category">${app.category}</span>
          <span class="row-version">v${app.version}</span>
          <div class="row-status">
            <span class="status-dot"></span> Instalado
          </div>
          <div class="row-action">
            <button class="btn-sm" data-action="open" data-id="${app.id}">Abrir</button>
          </div>
          <button class="row-menu">⋮</button>
        </div>
      `).join('');
    }
  }

  private setupEvents() {
    document.querySelectorAll('[data-action="open"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        alert(`Iniciando o aplicativo ${id}...`);
      });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
      });
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ElementsLauncherUI();
});
