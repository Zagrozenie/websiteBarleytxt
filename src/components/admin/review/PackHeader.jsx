import React from 'react';
import { Search, Sparkles, Layers, Box, Cuboid, LayoutGrid, X } from 'lucide-react';

export const PackHeader = ({
  metadata,
  searchQuery,
  setSearchQuery,
  onlyAnimated,
  setOnlyAnimated,
  onlyCmd,
  setOnlyCmd,
  viewMode = '3d',
  setViewMode,
  bgMode,
  setBgMode,
  onClose
}) => {
  const backgrounds = [
    { id: 'checkerboard', label: 'Szachownica' },
    { id: 'dark', label: 'Ciemne' },
    { id: 'light', label: 'Jasne' },
    { id: 'slot', label: 'Slot Minecraft' }
  ];

  return (
    <div className="review-pack-header">
      <div className="review-header-top">
        {/* Pack Info & Icon */}
        <div className="review-header-main-info">
          <div className="review-pack-icon-wrap">
            <img
              src={metadata.iconUrl || '/assets/img/favicon.png'}
              alt="Pack Icon"
              className="review-pack-icon"
              onError={(e) => { e.target.src = '/assets/img/favicon.png'; }}
            />
          </div>

          <div className="review-pack-titles">
            <div className="review-pack-badges">
              <span className="review-badge-version">
                {metadata.versionBadge}
              </span>
              <span className="review-badge-count">
                <Box size={13} />
                <strong>{metadata.totalAssets}</strong> zmodyfikowanych zasobów
              </span>
              {metadata.sizeMb && (
                <span className="review-badge-size">
                  {metadata.sizeMb} MB
                </span>
              )}
            </div>

            <h2 className="review-pack-name">
              {metadata.filename || 'Paczka Zasobów'}
            </h2>

            {metadata.descriptionHtml ? (
              <div
                className="review-pack-desc"
                dangerouslySetInnerHTML={{ __html: metadata.descriptionHtml }}
              />
            ) : metadata.description ? (
              <p className="review-pack-desc">
                {metadata.description}
              </p>
            ) : null}
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          className="review-close-btn"
          onClick={onClose}
          title="Zamknij podgląd i wróć do panelu"
        >
          <X size={16} />
          <span>Zamknij Review</span>
        </button>
      </div>

      {/* Control Bar: Search & Toggles */}
      <div className="review-controls-bar">
        {/* Search Input */}
        <div className="review-search-wrap">
          <Search size={16} className="review-search-icon" />
          <input
            type="search"
            className="review-search-input"
            placeholder="Szukaj po nazwie, ID (np. diamond_sword)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="review-search-clear"
              onClick={() => setSearchQuery('')}
              title="Wyczyść szukanie"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* View Mode Toggle (3D vs 2D GUI) */}
        {setViewMode && (
          <div className="review-viewmode-group">
            <button
              type="button"
              className={`review-toggle-chip ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
              title="Renderuj przedmioty z trójwymiarową perspektywą i grubością"
            >
              <Cuboid size={14} />
              <span>Widok 3D</span>
            </button>
            <button
              type="button"
              className={`review-toggle-chip ${viewMode === 'gui' ? 'active' : ''}`}
              onClick={() => setViewMode('gui')}
              title="Renderuj przedmioty w płaskim widoku slotu GUI"
            >
              <LayoutGrid size={14} />
              <span>Widok GUI 2D</span>
            </button>
          </div>
        )}

        {/* Filter Chips */}
        <div className="review-toggles-group">
          <button
            type="button"
            className={`review-toggle-chip ${onlyAnimated ? 'active' : ''}`}
            onClick={() => setOnlyAnimated(!onlyAnimated)}
          >
            <Sparkles size={14} />
            <span>Tylko animowane (.mcmeta)</span>
          </button>

          <button
            type="button"
            className={`review-toggle-chip ${onlyCmd ? 'active' : ''}`}
            onClick={() => setOnlyCmd(!onlyCmd)}
          >
            <Layers size={14} />
            <span>Tylko CustomModelData</span>
          </button>
        </div>

        {/* Background Selector */}
        <div className="review-bg-selector">
          <span className="review-bg-label">Tło podglądu:</span>
          <div className="review-bg-btn-group">
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                type="button"
                className={`review-bg-btn ${bgMode === bg.id ? 'active' : ''}`}
                onClick={() => setBgMode(bg.id)}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
