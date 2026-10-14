import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { API_BASE, SOCKET_URL } from '../config';

const PacksContext = createContext();

export const PacksProvider = ({ children }) => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [activePack, setActivePack] = useState(null);
  
  // Real dynamic stats initialized to 0 (no static hardcoded values)
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [websiteOnline, setWebsiteOnline] = useState(0);
  const [discordOnline, setDiscordOnline] = useState(0);
  
  const { addToast } = useToast();
  const { adminToken } = useAuth();

  // Helper from legacy for formatting numbers: 14.5K, 1.2M, etc.
  const formatStatNumber = (num) => {
    if (!num || isNaN(num) || num <= 0) return '0';
    if (num >= 999500) return (num / 1e6).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace('.0', '') + 'K';
    return num.toString();
  };

  useEffect(() => {
    let isMounted = true;
    let socket = null;

    async function loadData() {
      setLoading(true);
      try {
        let packsData = null;

        // Try API first
        try {
          const res = await fetch(`${API_BASE}/api/packs`);
          if (res.ok) {
            packsData = await res.json();
          }
        } catch (_) {}

        if (!packsData) {
          try {
            const res = await fetch('/api/packs');
            if (res.ok) packsData = await res.json();
          } catch (_) {}
        }

        // Fallback to static JSON
        if (!packsData || !Array.isArray(packsData)) {
          const res = await fetch('/texturepacks.json');
          if (res.ok) {
            packsData = await res.json();
          }
        }

        if (isMounted && Array.isArray(packsData)) {
          // Check local overrides if admin added packs in local mode
          const localStored = localStorage.getItem('barley_custom_packs');
          if (localStored) {
            try {
              const custom = JSON.parse(localStored);
              if (Array.isArray(custom)) {
                const existingIds = new Set(packsData.map(p => p.id));
                const additions = custom.filter(p => !existingIds.has(p.id));
                packsData = [...additions, ...packsData];
              }
            } catch (_) {}
          }
          setPacks(packsData);
        }
      } catch (err) {
        console.error('Error loading texturepacks:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    // 1. User ID matching legacy main.js
    let userId = null;
    try {
      userId = localStorage.getItem('userId');
      if (!userId) {
        userId =
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
                (char ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (char / 4)))).toString(16),
              );
        localStorage.setItem('userId', userId);
      }
    } catch (_) {}

    // 2. Real-time website online counter via Socket.io matching legacy
    try {
      const ioFunc = window.io;
      if (typeof ioFunc === 'function') {
        socket = ioFunc(SOCKET_URL, {
          query: { userId: userId || 'visitor' },
          transports: ['websocket', 'polling']
        });
        socket.on('online-users', (count) => {
          if (isMounted && typeof count === 'number') {
            setWebsiteOnline(count);
          }
        });
      }
    } catch (_) {}

    // 3. Discord online counter from official widget (fallback to API) matching legacy main.js
    async function updateDiscordOnline() {
      try {
        const response = await fetch(
          'https://discord.com/api/guilds/1193548424847568938/widget.json',
          { cache: 'no-store' }
        );
        if (response.ok) {
          const data = await response.json();
          if (isMounted && typeof data.presence_count === 'number') {
            setDiscordOnline(data.presence_count);
            return;
          }
        }
      } catch (_) {}

      try {
        const response = await fetch(`${API_BASE}/online`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted && typeof data.online === 'number') {
            setDiscordOnline(data.online);
            return;
          }
        }
      } catch (_) {}

      try {
        const response = await fetch('/online');
        if (response.ok) {
          const data = await response.json();
          if (isMounted && typeof data.online === 'number') {
            setDiscordOnline(data.online);
          }
        }
      } catch (_) {}
    }

    // 4. Total downloads counter from live API matching legacy main.js
    async function loadTotalDownloads() {
      try {
        const res = await fetch(`${API_BASE}/total-downloads`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.totalDownloads === 'number') {
            setTotalDownloads(data.totalDownloads);
            return;
          }
        }
      } catch (_) {}

      try {
        const res = await fetch('/total-downloads');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.totalDownloads === 'number') {
            setTotalDownloads(data.totalDownloads);
          }
        }
      } catch (_) {}
    }

    loadData();
    updateDiscordOnline();
    loadTotalDownloads();

    const interval = setInterval(() => {
      updateDiscordOnline();
      loadTotalDownloads();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (socket && typeof socket.disconnect === 'function') {
        socket.disconnect();
      }
    };
  }, []);

  // Filter and sort packs
  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const packCat = (pack.category || '').toLowerCase();
        if (selectedCategory === 'boxpvp' && packCat !== 'boxpvp') return false;
        if (selectedCategory === 'pvp' && packCat !== 'pvp') return false;
        if (selectedCategory === 'overlay' && packCat !== 'overlay') return false;
      }

      // Version filter
      if (selectedVersion !== 'all') {
        const packVer = (pack.version || '').toLowerCase();
        if (!packVer.includes(selectedVersion.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = (pack.name || '').toLowerCase().includes(query);
        const authorMatch = (pack.author || '').toLowerCase().includes(query);
        const catMatch = (pack.category || '').toLowerCase().includes(query);
        if (!nameMatch && !authorMatch && !catMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'newest') {
        // Newer packs are at the beginning of the array or by index
        return 0;
      }
      // 'popular' default - default JSON order or downloads
      return 0;
    });
  }, [packs, selectedCategory, selectedVersion, searchQuery, sortBy]);

  // Admin: Add Pack
  const addPack = async (packData) => {
    try {
      let createdPack = null;
      if (adminToken) {
        try {
          const res = await fetch('/api/admin/packs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-key': adminToken
            },
            body: JSON.stringify(packData)
          });
          if (res.ok) {
            const data = await res.json();
            createdPack = data.pack;
          }
        } catch (_) {}
      }

      if (!createdPack) {
        // Standalone fallback
        const id = packData.id || packData.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim() || `pack_${Date.now()}`;
        createdPack = {
          ...packData,
          id,
          image: packData.image || '/assets/img/texturepack.png',
          icon: packData.icon || '/assets/img/favicon.png'
        };
      }

      setPacks((prev) => [createdPack, ...prev]);

      // Save custom packs to localStorage as backup
      const localStored = localStorage.getItem('barley_custom_packs');
      let custom = [];
      try { custom = localStored ? JSON.parse(localStored) : []; } catch (_) {}
      custom.unshift(createdPack);
      localStorage.setItem('barley_custom_packs', JSON.stringify(custom));

      addToast(`Paczka "${createdPack.name}" została pomyślnie dodana!`, 'success');
      return { success: true, pack: createdPack };
    } catch (err) {
      addToast('Błąd podczas dodawania paczki: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // Admin: Update Pack
  const updatePack = async (id, updatedFields) => {
    try {
      if (adminToken) {
        try {
          await fetch(`/api/admin/packs/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-key': adminToken
            },
            body: JSON.stringify(updatedFields)
          });
        } catch (_) {}
      }

      setPacks((prev) => prev.map((p) => p.id === id ? { ...p, ...updatedFields } : p));
      addToast('Paczka została zaktualizowana!', 'success');
      return { success: true };
    } catch (err) {
      addToast('Błąd aktualizacji: ' + err.message, 'error');
      return { success: false };
    }
  };

  // Admin: Delete Pack
  const deletePack = async (id) => {
    try {
      if (adminToken) {
        try {
          await fetch(`/api/admin/packs/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': adminToken }
          });
        } catch (_) {}
      }

      setPacks((prev) => prev.filter((p) => p.id !== id));
      addToast('Paczka została usunięta!', 'info');
      return { success: true };
    } catch (err) {
      addToast('Błąd usuwania paczki: ' + err.message, 'error');
      return { success: false };
    }
  };

  // Admin: Export texturepacks.json
  const exportPacks = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(packs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "texturepacks.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Pobrano plik texturepacks.json!', 'success');
  };

  // Admin: Import texturepacks.json
  const importPacks = (newPacks) => {
    if (Array.isArray(newPacks) && newPacks.length > 0) {
      setPacks(newPacks);
      localStorage.setItem('barley_custom_packs', JSON.stringify(newPacks));
      addToast(`Zaimportowano ${newPacks.length} paczek!`, 'success');
    }
  };

  const onlineUsers = (websiteOnline || 0) + (discordOnline || 0);

  return (
    <PacksContext.Provider value={{
      packs,
      filteredPacks,
      loading,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      selectedVersion,
      setSelectedVersion,
      sortBy,
      setSortBy,
      activePack,
      setActivePack,
      totalDownloads,
      onlineUsers,
      onlineDiscord: discordOnline,
      websiteOnline,
      discordOnline,
      formatStatNumber,
      addPack,
      updatePack,
      deletePack,
      exportPacks,
      importPacks
    }}>
      {children}
    </PacksContext.Provider>
  );
};

export const usePacks = () => useContext(PacksContext);
