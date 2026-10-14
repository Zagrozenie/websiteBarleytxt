import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const PacksContext = createContext();

export const PacksProvider = ({ children }) => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [activePack, setActivePack] = useState(null);
  
  const [totalDownloads, setTotalDownloads] = useState(148500);
  const [onlineDiscord, setOnlineDiscord] = useState(420);
  
  const { addToast } = useToast();
  const { adminToken } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        let packsData = null;

        // Try API first
        try {
          const res = await fetch('/api/packs');
          if (res.ok) {
            packsData = await res.json();
          }
        } catch (_) {}

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
                // Merge unique custom packs
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

      // Fetch downloads
      try {
        const res = await fetch('/total-downloads');
        if (res.ok) {
          const data = await res.json();
          if (data.totalDownloads && isMounted) setTotalDownloads(data.totalDownloads);
        }
      } catch (_) {}

      // Fetch online users
      try {
        const res = await fetch('/online');
        if (res.ok) {
          const data = await res.json();
          if (data.online && isMounted) setOnlineDiscord(data.online);
        }
      } catch (_) {}
    }

    loadData();
    return () => { isMounted = false; };
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
      onlineDiscord,
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
