import { useState, type ReactNode } from "react";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import LibraryPage from "./pages/LibraryPage";
import UpdatesPage from "./pages/UpdatesPage";
import SettingsPage from "./pages/SettingsPage";
import RightSidebar from "./components/RightSidebar";
import ConfirmInstallerModal from "./components/ConfirmInstallerModal";
import { LauncherProvider } from "./context/LauncherContext";

export type PageKey = "home" | "library" | "updates" | "settings";

export default function App() {
  const [page, setPage] = useState<PageKey>("home");
  const [search, setSearch] = useState("");

  const pages: Record<PageKey, ReactNode> = {
    home: <HomePage search={search} />,
    library: <LibraryPage />,
    updates: <UpdatesPage />,
    settings: <SettingsPage />,
  };

  return (
    <LauncherProvider>
      <div className="app-shell">
        <TopBar search={search} onSearch={setSearch} />
        <div className="workspace">
          <Sidebar page={page} onNavigate={setPage} />
          <main className="content-area" id="main-scroll">
            {pages[page]}
          </main>
          {page === "home" && <RightSidebar />}
        </div>
        <ConfirmInstallerModal />
      </div>
    </LauncherProvider>
  );
}
