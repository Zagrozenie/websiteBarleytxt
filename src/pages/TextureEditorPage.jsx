import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PackScannerService } from '../services/PackScannerService';
import { initResourcePackAssets } from '../services/RenderService';
import { CategoryTabs } from '../components/admin/review/CategoryTabs';
import { AssetReviewCard } from '../components/admin/review/AssetReviewCard';
import { PixelArtEditorModal } from '../components/editor/PixelArtEditorModal';
import { PackExportModal } from '../components/editor/PackExportModal';
import {
  UploadCloud,
  Sparkles,
  Download,
  Search,
  Box,
  Layers,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderArchive,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/texture-editor.css';

export const TextureEditorPage = () => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [currentZipFile, setCurrentZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Inicjalizacja skanera...');
  const [error, setError] = useState(null);

  const [metadata, setMetadata] = useState(null);
  const [assets, setAssets] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [zipData, setZipData] = useState(null);
  const [modifiedAssetIds, setModifiedAssetIds] = useState(new Set());

  // Search & Filters
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAnimated, setOnlyAnimated] = useState(false);
  const [onlyCmd, setOnlyCmd] = useState(false);
  const [onlyModified, setOnlyModified] = useState(false);
  const [viewMode, setViewMode] = useState('3d');
  const [bgMode, setBgMode] = useState('checkerboard');

  // Modals
  const [editingAsset, setEditingAsset] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Skanowanie paczki zip i ladowanie modeli 3D WebGL
  useEffect(() => {
    if (!currentZipFile) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadAndScan() {
      try {
        setLoadingStep('Analizowanie struktury archiwum .zip i wykrywanie tekstur...');
        // PackScannerService przeszukuje cala strukture zipa w poszukiwaniu tekstur i jsonow modeli
        const scanResult = await PackScannerService.scanPack(currentZipFile);

        if (cancelled) return;

        setLoadingStep('Inicjalizacja silnika WebGL i ładowanie warstwy bazowej Vanilla...');
        // Ladujemy vanille i tekstury do silnika 3D zeby podglad modeli dzialal od razu
        await initResourcePackAssets(currentZipFile);

        if (cancelled) return;

        setMetadata(scanResult.metadata);
        setAssets(scanResult.assets);
        setCategoryCounts(scanResult.categoryCounts);
        setZipData(scanResult.zipData);
        setModifiedAssetIds(new Set());
        setLoading(false);

        addToast(`Wczytano paczkę: ${scanResult.metadata.filename}!`, 'success');
      } catch (err) {
        if (cancelled) return;
        console.error('Błąd wczytywania paczki w edytorze:', err);
        setError(err.message || 'Nie udało się przetworzyć paczki zasobów');
        setLoading(false);
      }
    }

    loadAndScan();

    return () => {
      cancelled = true;
    };
  }, [currentZipFile]);

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // 1. Only modified filter
      if (onlyModified && !modifiedAssetIds.has(asset.id)) {
        return false;
      }

      // 2. Category filter
      if (activeCategory !== 'All' && asset.category !== activeCategory) {
        return false;
      }

      // 3. Animated filter
      if (onlyAnimated && !asset.isAnimated) {
        return false;
      }

      // 4. CustomModelData filter
      if (onlyCmd && !asset.isCmdVariant) {
        return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (asset.name || '').toLowerCase().includes(q);
        const matchesId = (asset.id || '').toLowerCase().includes(q);
        const matchesShort = (asset.shortId || '').toLowerCase().includes(q);
        const matchesNs = (asset.namespace || '').toLowerCase().includes(q);
        const matchesPath = (asset.filePath || '').toLowerCase().includes(q);

        if (!matchesName && !matchesId && !matchesShort && !matchesNs && !matchesPath) {
          return false;
        }
      }

      return true;
    });
  }, [assets, activeCategory, onlyAnimated, onlyCmd, onlyModified, searchQuery, modifiedAssetIds]);

  // Load sample demo pack
  const handleLoadSamplePack = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingStep('Pobieranie przykładowej paczki z serwera (sample-review-pack.zip)...');
      const res = await fetch('/sample-review-pack.zip');
      if (!res.ok) throw new Error('Nie udało się pobrać paczki testowej');
      const blob = await res.blob();
      const file = new File([blob], 'sample-review-pack.zip', { type: 'application/zip' });
      setCurrentZipFile(file);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Błąd ładowania paczki testowej');
      setLoading(false);
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setCurrentZipFile(file);
      } else {
        addToast('Wybierz plik z rozszerzeniem .zip', 'error');
      }
    }
  };

  // Zapis edytowanej tekstury z modala do stanu pamieci strony
  const handleSaveEditedTexture = (savedAsset, newDataUrl) => {
    // 1. Oznaczamy asset jako edytowany w Secie zeby dzialal filtr "Tylko edytowane"
    setModifiedAssetIds((prev) => new Set([...prev, savedAsset.id]));

    // 2. Aktualizujemy obiekt w tablicy z nowym customDataUrl
    setAssets((prevAssets) =>
      prevAssets.map((item) => {
        if (item.id === savedAsset.id) {
          return {
            ...item,
            customDataUrl: newDataUrl,
            isEdited: true
          };
        }
        return item;
      })
    );
  };

  const backgrounds = [
    { id: 'checkerboard', label: 'Szachownica' },
    { id: 'dark', label: 'Ciemne' },
    { id: 'light', label: 'Jasne' },
    { id: 'slot', label: 'Slot Minecraft' }
  ];

  return (
    <div className="texture-editor-page">
      {/* 1. Initial State: Dropzone & Pack Selection */}
      {!currentZipFile && (
        <div className="container">
          <div className="editor-hero-section">
            <div className="section-badge">
              <Palette size={14} />
              <span>Edytor Tekstur Minecraft</span>
            </div>
            <h1 className="section-title">
              Edytor Tekstur Pixel Art
            </h1>
            <p className="section-subtitle">
              Wgraj dowolną paczkę tekstur Minecraft, wybierz przedmioty i twórz unikalny pixel art bezpośrednio w przeglądarce. Pobieraj gotowe paczki pod dowolną wersję Minecrafta!
            </p>

            <div
              className={`editor-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".zip"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setCurrentZipFile(e.target.files[0]);
                  }
                }}
              />
              <div className="editor-dropzone-icon">
                <UploadCloud size={54} />
              </div>
              <h3 className="editor-dropzone-title">
                Wybierz lub upuść swoją paczkę zasobów (.zip)
              </h3>
              <p className="editor-dropzone-desc">
                Obsługujemy paczki dla każdej wersji Minecraft (1.8.9, 1.12.2, 1.16.5, 1.20, 1.21+)
              </p>

              <div className="editor-dropzone-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-primary editor-cta-btn"
                  onClick={handleLoadSamplePack}
                >
                  <Sparkles size={16} />
                  <span>Załaduj przykładową paczkę testową (Demo)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderArchive size={16} />
                  <span>Wybierz plik z dysku</span>
                </button>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="editor-features-grid">
              <div className="editor-feature-card">
                <div className="editor-feature-icon">
                  <Palette size={22} color="#38bdf8" />
                </div>
                <h4>Zaawansowany Pixel Art</h4>
                <p>Ołówek, wypełnienie, próbniki kolorów Minecraft, cieniowanie Dodge/Burn i siatka pikseli.</p>
              </div>

              <div className="editor-feature-card">
                <div className="editor-feature-icon">
                  <Box size={22} color="#a855f7" />
                </div>
                <h4>Podgląd na żywo 2D i 3D</h4>
                <p>Natychmiastowy podgląd tekstury 1:1, powiększenia oraz widok w slocie ekwipunku gry.</p>
              </div>

              <div className="editor-feature-card">
                <div className="editor-feature-icon">
                  <Download size={22} color="#10b981" />
                </div>
                <h4>Eksport do dowolnej wersji</h4>
                <p>Wybierz wersję od 1.8.9 aż po 1.21+ — strona sama złoży poprawną strukturę i pack.mcmeta!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Loading State */}
      {loading && currentZipFile && (
        <div className="editor-loading-view">
          <Loader2 size={48} className="editor-loading-spinner spin-animate" />
          <h3 className="editor-loading-title">Przygotowywanie Edytora Tekstur</h3>
          <p className="editor-loading-step">{loadingStep}</p>
        </div>
      )}

      {/* 3. Error State */}
      {error && !loading && currentZipFile && (
        <div className="editor-error-view">
          <div className="editor-error-card">
            <AlertCircle size={44} color="#f85149" />
            <h3>Wystąpił błąd podczas wczytywania</h3>
            <p>{error}</p>
            <div className="editor-error-buttons">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { setCurrentZipFile(null); setError(null); }}
              >
                Wybierz inny plik .zip
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleLoadSamplePack}
              >
                Załaduj paczkę Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Editor Workspace (Review Layout) */}
      {!loading && !error && currentZipFile && metadata && (
        <div className="editor-workspace-view">
          {/* Header Bar */}
          <div className="editor-workspace-header">
            <div className="container">
              <div className="editor-header-main">
                {/* Pack Info */}
                <div className="editor-pack-info">
                  <div className="editor-pack-icon-frame">
                    <img
                      src={metadata.iconUrl || '/assets/img/favicon.png'}
                      alt="Pack Icon"
                      className="editor-pack-icon-img"
                      onError={(e) => { e.target.src = '/assets/img/favicon.png'; }}
                    />
                  </div>

                  <div className="editor-pack-meta">
                    <div className="editor-badges-row">
                      <span className="editor-badge-ver">{metadata.versionBadge}</span>
                      <span className="editor-badge-count">
                        <Box size={13} />
                        <strong>{metadata.totalAssets}</strong> zasobów
                      </span>
                      {modifiedAssetIds.size > 0 && (
                        <span className="editor-badge-modified">
                          <Sparkles size={12} />
                          Zmodyfikowano: <strong>{modifiedAssetIds.size}</strong>
                        </span>
                      )}
                    </div>

                    <h2 className="editor-pack-title">{metadata.filename}</h2>
                    {metadata.description && (
                      <p className="editor-pack-desc">{metadata.description}</p>
                    )}
                  </div>
                </div>

                {/* Primary Export & Change Pack Actions */}
                <div className="editor-header-actions">
                  <button
                    type="button"
                    className="btn btn-primary editor-export-pack-btn"
                    onClick={() => setShowExportModal(true)}
                  >
                    <Download size={18} />
                    <span>Pobierz paczkę (Eksport)</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline editor-change-pack-btn"
                    onClick={() => {
                      if (modifiedAssetIds.size > 0) {
                        if (!window.confirm('Wczytanie innej paczki zresetuje niezapisane zmiany. Kontynuować?')) return;
                      }
                      setCurrentZipFile(null);
                    }}
                  >
                    <RefreshCw size={15} />
                    <span>Zmień paczkę</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Control Bar */}
              <div className="editor-controls-bar">
                {/* Search Box */}
                <div className="editor-search-box">
                  <Search size={16} className="editor-search-icon" />
                  <input
                    type="search"
                    className="editor-search-input"
                    placeholder="Szukaj przedmiotu (np. diamond_sword, apple)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="editor-search-clear"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Toggles */}
                <div className="editor-toggles-row">
                  {modifiedAssetIds.size > 0 && (
                    <button
                      type="button"
                      className={`editor-toggle-btn ${onlyModified ? 'active' : ''}`}
                      onClick={() => setOnlyModified(!onlyModified)}
                    >
                      <Sparkles size={14} />
                      <span>Tylko zmodyfikowane ({modifiedAssetIds.size})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`editor-toggle-btn ${onlyAnimated ? 'active' : ''}`}
                    onClick={() => setOnlyAnimated(!onlyAnimated)}
                  >
                    <Sparkles size={14} />
                    <span>Animowane (.mcmeta)</span>
                  </button>

                  <button
                    type="button"
                    className={`editor-toggle-btn ${onlyCmd ? 'active' : ''}`}
                    onClick={() => setOnlyCmd(!onlyCmd)}
                  >
                    <Layers size={14} />
                    <span>CustomModelData</span>
                  </button>

                  {/* Background Mode Switcher */}
                  <div className="editor-bg-switcher">
                    {backgrounds.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        className={`editor-bg-btn ${bgMode === bg.id ? 'active' : ''}`}
                        onClick={() => setBgMode(bg.id)}
                        title={`Tło: ${bg.label}`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="editor-category-tabs-container">
            <div className="container">
              <CategoryTabs
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                categoryCounts={categoryCounts}
              />
            </div>
          </div>

          {/* Asset Grid (Clicking card opens Pixel Art Editor!) */}
          <div className="editor-grid-container">
            <div className="container">
              {filteredAssets.length === 0 ? (
                <div className="editor-empty-state">
                  <Box size={44} color="#64748b" />
                  <h3>Brak elementów spełniających kryteria</h3>
                  <p>Spróbuj zmienić kategorię lub wyczyścić pole wyszukiwania.</p>
                </div>
              ) : (
                <div className="editor-assets-grid">
                  {filteredAssets.map((asset) => {
                    const isModified = modifiedAssetIds.has(asset.id);
                    return (
                      <div
                        key={asset.id}
                        className={`editor-card-wrapper ${isModified ? 'is-modified-card' : ''}`}
                        onClick={() => setEditingAsset(asset)}
                      >
                        {isModified && (
                          <div className="editor-modified-ribbon">
                            <Sparkles size={11} />
                            <span>EDYTOWANO</span>
                          </div>
                        )}
                        <AssetReviewCard
                          asset={asset}
                          bgMode={bgMode}
                          viewMode={viewMode}
                          onClick={() => setEditingAsset(asset)}
                        />
                        <div className="editor-card-overlay-btn">
                          <Palette size={15} />
                          <span>Edytuj Teksturę</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Pixel Art Editor Studio Modal */}
      {editingAsset && (
        <PixelArtEditorModal
          asset={editingAsset}
          zipData={zipData}
          onSaveToPack={handleSaveEditedTexture}
          onClose={() => setEditingAsset(null)}
        />
      )}

      {/* 6. Multi-Version Pack Export Modal */}
      {showExportModal && (
        <PackExportModal
          zipData={zipData}
          defaultPackName={metadata?.filename || 'Barley_Custom_Pack'}
          defaultDescription={metadata?.description || 'Custom pack created with BarleyTxT Texture Editor'}
          defaultIcon={metadata?.iconUrl}
          modifiedCount={modifiedAssetIds.size}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
