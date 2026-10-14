import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PacksProvider, usePacks } from './context/PacksContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { PackDetailModal } from './components/PackDetailModal';

import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ConverterPage } from './pages/ConverterPage';
import { CreateLinkPage } from './pages/CreateLinkPage';
import { UnlockPage } from './pages/UnlockPage';
import { AdminPage } from './pages/AdminPage';
import { ChangelogPage } from './pages/ChangelogPage';
import { LegalPage } from './pages/LegalPage';
import { TextureEditorPage } from './pages/TextureEditorPage';

import './styles/index.css';

// Tajny link dostępu do panelu administratora (ukryty przed zwykłymi użytkownikami)
export const ADMIN_SECRET_PATH = '/panel-barley-9482';
export const ADMIN_SECRET_KEY = 'barley9482';

export const isSecretAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  const matchesPath = path.includes(ADMIN_SECRET_PATH);
  const matchesQuery =
    searchParams.get('admin') === ADMIN_SECRET_KEY ||
    searchParams.get('panel') === ADMIN_SECRET_KEY ||
    searchParams.get('secret') === ADMIN_SECRET_KEY;

  return Boolean(matchesPath || matchesQuery);
};

const AppContent = () => {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    if (isSecretAdminRoute()) return 'admin';
    const path = window.location.pathname;
    if (path.includes('/editor') || path.includes('/edytor')) return 'editor';
    if (path.includes('/converter')) return 'converter';
    if (path.includes('/create')) return 'create';
    if (path.includes('/changelog')) return 'changelog';
    return 'home';
  });
  const [unlockSlug, setUnlockSlug] = useState(null);

  const { activePack, setActivePack, packs } = usePacks();

  // Support URL parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    const unlockParam = params.get('unlock') || params.get('slug');
    const packParam = params.get('pack') || params.get('id');

    if (unlockParam) {
      setUnlockSlug(unlockParam);
      setCurrentView('unlock');
    } else if (packParam && packs.length > 0) {
      const match = packs.find((p) => p.id === packParam);
      if (match) setActivePack(match);
    } else if (isSecretAdminRoute()) {
      setCurrentView('admin');
    } else if (pathname.includes('/admin')) {
      // Zablokuj stary adres /admin i przekieruj na stronę główną, by nikt nie mógł wpisać hasła
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
      setCurrentView('home');
    } else if (pathname.includes('/editor') || pathname.includes('/edytor')) {
      setCurrentView('editor');
    } else if (pathname.includes('/converter')) {
      setCurrentView('converter');
    } else if (pathname.includes('/create')) {
      setCurrentView('create');
    } else if (pathname.includes('/changelog')) {
      setCurrentView('changelog');
    }
  }, [packs]);

  const handleOpenConverterWithPack = (pack) => {
    setCurrentView('converter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-wrapper">
      {/* Background ambient lighting */}
      <div className="ambient-glow" />

      {/* Navigation */}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content Area */}
      <main className="main-content">
        {currentView === 'home' && <HomePage setCurrentView={setCurrentView} />}
        {currentView === 'catalog' && <CatalogPage />}
        {currentView === 'editor' && <TextureEditorPage />}
        {currentView === 'converter' && <ConverterPage />}
        {currentView === 'create' && <CreateLinkPage />}
        {currentView === 'unlock' && (
          <UnlockPage slug={unlockSlug} setCurrentView={setCurrentView} />
        )}
        {currentView === 'admin' && <AdminPage setCurrentView={setCurrentView} />}
        {currentView === 'changelog' && <ChangelogPage />}
        {currentView === 'privacy' && <LegalPage type="privacy" />}
        {currentView === 'terms' && <LegalPage type="terms" />}
      </main>

      {/* Footer */}
      <Footer setCurrentView={setCurrentView} />

      {/* Pack Details Modal */}
      {activePack && (
        <PackDetailModal
          pack={activePack}
          onClose={() => setActivePack(null)}
          onOpenConverter={handleOpenConverterWithPack}
        />
      )}

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <PacksProvider>
            <AppContent />
          </PacksProvider>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
