import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PackScannerService } from '../../../services/PackScannerService';
import { initResourcePackAssets } from '../../../services/RenderService';
import { PackHeader } from './PackHeader';
import { CategoryTabs } from './CategoryTabs';
import { AssetGrid } from './AssetGrid';
import { InspectorDrawer } from './InspectorDrawer';
import { Loader2, AlertCircle, Box, UploadCloud, X, Sparkles, Download } from 'lucide-react';
import '../../../styles/review-module.css';

export const ReviewModule = ({ zipFile, onClose }) => {
  const [currentZipFile, setCurrentZipFile] = useState(zipFile || null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Inicjalizacja skanera...');
  const [error, setError] = useState(null);

  const [metadata, setMetadata] = useState(null);
  const [assets, setAssets] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [zipData, setZipData] = useState(null);

  // Controls & Filters
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAnimated, setOnlyAnimated] = useState(false);
  const [onlyCmd, setOnlyCmd] = useState(false);
  const [viewMode, setViewMode] = useState('3d');
  const [bgMode, setBgMode] = useState('checkerboard');

  // Selected asset for Inspector Drawer
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Sync prop changes
  useEffect(() => {
    if (zipFile) {
      setCurrentZipFile(zipFile);
    }
  }, [zipFile]);

  // Hide site navbar, prevent body scroll leakage, and scroll to top
  useEffect(() => {
    document.body.classList.add('review-modal-open');
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    return () => {
      document.body.classList.remove('review-modal-open');
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

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
        setLoadingStep('Analizowanie struktury archiwum .zip i wykrywanie zmian...');
        const scanResult = await PackScannerService.scanPack(currentZipFile);

        if (cancelled) return;

        setLoadingStep('Inicjalizacja silnika WebGL i ładowanie warstwy bazowej Vanilla...');
        await initResourcePackAssets(currentZipFile);

        if (cancelled) return;

        setMetadata(scanResult.metadata);
        setAssets(scanResult.assets);
        setCategoryCounts(scanResult.categoryCounts);
        setZipData(scanResult.zipData);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Błąd modułu Review:', err);
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
      // 1. Category filter
      if (activeCategory !== 'All' && asset.category !== activeCategory) {
        return false;
      }

      // 2. Animated filter
      if (onlyAnimated && !asset.isAnimated) {
        return false;
      }

      // 3. CustomModelData filter
      if (onlyCmd && !asset.isCmdVariant) {
        return false;
      }

      // 4. Search query
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
  }, [assets, activeCategory, onlyAnimated, onlyCmd, searchQuery]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setCurrentZipFile(file);
      } else {
        setError('Wybierz poprawny plik .zip paczki zasobów Minecraft');
      }
    }
  };

  const loadSamplePack = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingStep('Pobieranie przygotowanej paczki testowej (sample-review-pack.zip)...');
      const res = await fetch('/sample-review-pack.zip');
      if (!res.ok) throw new Error('Nie udało się pobrać przykładowej paczki z serwera');
      const blob = await res.blob();
      const file = new File([blob], 'sample-review-pack.zip', { type: 'application/zip' });
      setCurrentZipFile(file);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Błąd ładowania paczki testowej');
      setLoading(false);
    }
  };

  return (
    <div
      className="review-module-overlay"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="review-module-container">
        {/* If no zip file provided yet, show a dropzone */}
        {!currentZipFile && (
          <div className="review-dropzone-view">
            <button className="review-close-btn" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }} onClick={onClose}>
              <X size={20} />
            </button>
            <div
              className={`review-dropzone-box ${dragActive ? 'drag-active' : ''}`}
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
              <div className="review-dropzone-icon">
                <UploadCloud size={48} />
              </div>
              <h3 className="review-dropzone-title">Wybierz paczkę zasobów do inspekcji</h3>
              <p className="review-dropzone-desc">
                Przeciągnij i upuść plik .zip paczki zasobów lub kliknij, aby otworzyć podgląd 3D WebGL
              </p>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    color: '#ffffff',
                    fontWeight: 600,
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={loadSamplePack}
                >
                  <Sparkles size={16} />
                  <span>Załaduj przykładową paczkę testową (Demo)</span>
                </button>

                <a
                  href="/sample-review-pack.zip"
                  download="sample-review-pack.zip"
                  className="btn btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    fontSize: '0.82rem'
                  }}
                >
                  <Download size={15} />
                  <span>Pobierz .zip</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Loading Screen */}
        {loading && currentZipFile && (
          <div className="review-loading-view">
            <Loader2 size={46} className="review-loading-spinner spin-animate" />
            <h3 className="review-loading-title">Przygotowywanie modułu Review</h3>
            <p className="review-loading-step">{loadingStep}</p>
            <p className="review-loading-sub">Ładowanie kaskadowego stosu zasobów Vanilla i delty paczki...</p>
          </div>
        )}

        {/* Error Screen */}
        {error && !loading && currentZipFile && (
          <div className="review-error-view">
            <div className="review-error-box">
              <AlertCircle size={44} color="#f85149" />
              <h3 className="review-error-title">Błąd modułu Review</h3>
              <p className="review-error-msg">{error}</p>
              <div className="review-error-actions">
                <button
                  type="button"
                  className="review-btn-secondary"
                  onClick={() => {
                    setCurrentZipFile(null);
                    setError(null);
                  }}
                >
                  Wybierz inny plik .zip
                </button>
                <button
                  type="button"
                  className="review-btn-secondary"
                  style={{ marginLeft: '0.6rem' }}
                  onClick={onClose}
                >
                  Zamknij moduł
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && currentZipFile && metadata && (
          <div className="review-module-body">
            <PackHeader
              metadata={metadata}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onlyAnimated={onlyAnimated}
              setOnlyAnimated={setOnlyAnimated}
              onlyCmd={onlyCmd}
              setOnlyCmd={setOnlyCmd}
              viewMode={viewMode}
              setViewMode={setViewMode}
              bgMode={bgMode}
              setBgMode={setBgMode}
              onClose={onClose}
            />

            <CategoryTabs
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              categoryCounts={categoryCounts}
            />

            <AssetGrid
              assets={filteredAssets}
              bgMode={bgMode}
              viewMode={viewMode}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Inspector Drawer / Modal */}
        {selectedAsset && (
          <InspectorDrawer
            asset={selectedAsset}
            zipData={zipData}
            bgMode={bgMode}
            onClose={() => setSelectedAsset(null)}
          />
        )}
      </div>
    </div>
  );
};
