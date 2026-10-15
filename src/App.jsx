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

// Helper functions to support Discord links (/texturepacks/:slug) and query params (?pack=:slug)
export const extractCategoryFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const match = pathname.match(/(?:\/(?:en|de))?\/(?:texturepacks|texturepack)(?:\/([^\/?#]+))?/i);
  if (match) {
    const raw = match[1] ? decodeURIComponent(match[1]).trim().toLowerCase().replace(/\.html$/i, '') : 'all';
    if (['all', 'pvp', 'boxpvp', 'overlay'].includes(raw)) return raw;
    if (raw === 'wszystkie') return 'all';
    if (raw === 'nakladki') return 'overlay';
  }
  return null;
};

export const extractPackSlugFromUrl = () => {
  if (typeof window === 'undefined') return null;

  // 1. Check query parameters: ?pack=slug or ?id=slug
  const searchParams = new URLSearchParams(window.location.search);
  const querySlug = searchParams.get('pack') || searchParams.get('id');
  if (querySlug && querySlug.trim()) {
    return querySlug.trim().replace(/\.html$/i, '');
  }

  // 2. Check path: /texturepacks/:slug, /en/texturepacks/:slug, /de/texturepacks/:slug, /texturepack/:slug
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const match = pathname.match(/(?:\/(?:en|de))?\/(?:texturepacks|texturepack)\/([^\/?#]+)/i);
  if (match && match[1]) {
    const raw = decodeURIComponent(match[1]).trim().replace(/\.html$/i, '');
    const lower = raw.toLowerCase();
    // Exclude category names and generic pages
    if (!['all', 'pvp', 'boxpvp', 'overlay', 'nakladki', 'wszystkie', 'pack'].includes(lower)) {
      return raw;
    }
  }

  // 3. Hash fallback: #pack=slug or #/texturepacks/slug
  const hash = window.location.hash;
  if (hash) {
    const hashMatch = hash.match(/(?:texturepacks|pack)[=/]([^\/?#&]+)/i);
    if (hashMatch && hashMatch[1]) {
      return decodeURIComponent(hashMatch[1]).trim().replace(/\.html$/i, '');
    }
  }

  return null;
};

export const findPackBySlug = (slug, packList) => {
  if (!slug || !packList || !packList.length) return null;
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  const clean = decoded.replace(/[-_ ]/g, '');

  return (
    packList.find((p) => p.id === slug) ||
    packList.find((p) => p.id?.toLowerCase() === decoded) ||
    packList.find((p) => p.id?.toLowerCase().replace(/[-_ ]/g, '') === clean) ||
    packList.find((p) => p.name?.toLowerCase() === decoded) ||
    packList.find((p) => p.name?.toLowerCase().replace(/[-_ ]/g, '') === clean)
  );
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
    if (extractCategoryFromUrl()) return 'catalog';
    return 'home';
  });
  const [unlockSlug, setUnlockSlug] = useState(null);

  const { activePack, setActivePack, packs, setSelectedCategory } = usePacks();

  // Support Discord links and URL parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    const unlockParam = params.get('unlock') || params.get('slug');
    if (unlockParam) {
      setUnlockSlug(unlockParam);
      setCurrentView('unlock');
      return;
    }

    const catFromUrl = extractCategoryFromUrl();
    if (catFromUrl) {
      if (setSelectedCategory) setSelectedCategory(catFromUrl);
      setCurrentView('catalog');
    }

    const targetPackSlug = extractPackSlugFromUrl();
    if (targetPackSlug && packs.length > 0) {
      const match = findPackBySlug(targetPackSlug, packs);
      if (match) {
        setActivePack(match);
      }
    }

    if (isSecretAdminRoute()) {
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
  }, [packs, setSelectedCategory]);

  // Synchronize browser address bar with active pack URL (/texturepacks/:id)
  useEffect(() => {
    if (!activePack) return;
    if (typeof window === 'undefined' || !window.history) return;

    const currentPath = window.location.pathname.replace(/\/+$/, '');
    const targetPath = `/texturepacks/${activePack.id}`;
    const searchParams = new URLSearchParams(window.location.search);

    // If URL already points to this pack, don't create duplicate history entries
    if (currentPath === targetPath || searchParams.get('pack') === activePack.id) {
      return;
    }

    window.history.pushState({ packId: activePack.id }, '', targetPath);
  }, [activePack]);

  // Handle browser Back / Forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const slug = extractPackSlugFromUrl();
      if (slug && packs.length > 0) {
        const match = findPackBySlug(slug, packs);
        if (match) {
          setActivePack(match);
          return;
        }
      }
      setActivePack(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [packs]);

  const handleClosePack = () => {
    setActivePack(null);
    if (typeof window !== 'undefined' && window.history) {
      const pathname = window.location.pathname;
      const search = window.location.search;

      if (pathname.includes('/texturepacks/') || pathname.includes('/texturepack/')) {
        const fallback = currentView === 'catalog' ? '/texturepacks/all' : '/';
        window.history.replaceState({}, '', fallback);
      } else if (search.includes('pack=') || search.includes('id=')) {
        window.history.replaceState({}, '', pathname || '/');
      }
    }
  };

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
          onClose={handleClosePack}
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
