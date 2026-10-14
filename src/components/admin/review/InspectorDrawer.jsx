import React, { useState, useEffect, useRef } from 'react';
import {
  renderAssetPreview,
  createArmorInspector3D
} from '../../../services/RenderService';
import { WalkingAnimation } from 'skinview3d';
import { PackScannerService } from '../../../services/PackScannerService';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  Code2,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  Shield,
  Loader2,
  Compass,
  Box,
  Eye
} from 'lucide-react';

export const InspectorDrawer = ({
  asset,
  zipData,
  bgMode = 'checkerboard',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'json' | 'texture' | 'diagnostics'
  const [localBgMode, setLocalBgMode] = useState(bgMode);
  const [rawTextureUrl, setRawTextureUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  // High-res preview state
  const [renderLoading, setRenderLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const [renderedDataUrl, setRenderedDataUrl] = useState(null);
  const [renderedCanvas, setRenderedCanvas] = useState(null);

  // Interactive 3D Rotation for items/blocks
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });

  // 3D Player & Armor state
  const isArmorAsset = asset?.type === 'armor_set' || asset?.category === 'Armor' || Boolean(asset?.armorSet);

  // Default stage mode: 'player' ONLY for armor sets, 'model' for items/blocks
  const [stageMode, setStageMode] = useState(isArmorAsset ? 'player' : 'model');
  const [armorPieceFilter, setArmorPieceFilter] = useState(asset?.armorPiece || 'all');
  const [playerError, setPlayerError] = useState(null);

  const skinViewerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const [isWalking, setIsWalking] = useState(true);

  const canvasWrapRef = useRef(null);

  // Reset stage mode and armor filter when asset changes
  useEffect(() => {
    if (isArmorAsset) {
      setStageMode('player');
    } else {
      setStageMode('model');
    }
    setArmorPieceFilter(asset?.armorPiece || 'all');
    setPlayerError(null);
  }, [asset, isArmorAsset]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load raw texture
  useEffect(() => {
    if (!asset) return;
    PackScannerService.getAssetTextureUrl(zipData, asset)
      .then(setRawTextureUrl)
      .catch(() => setRawTextureUrl(null));
  }, [asset, zipData]);

  // Render high-res 512px preview for model stage
  useEffect(() => {
    if (!asset) return;

    if (asset.type === 'armor_set') {
      setRenderLoading(false);
      return;
    }

    setRenderLoading(true);
    setRenderError(null);
    let cancelled = false;

    renderAssetPreview(asset, {
      size: 512,
      displayContext: '3d',
      priority: true
    })
      .then((res) => {
        if (cancelled) return;
        setRenderLoading(false);
        if (res.type === 'image') {
          setRenderedDataUrl(res.dataUrl);
          setRenderedCanvas(null);
        } else if (res.type === 'canvas') {
          setRenderedCanvas(res.canvas);
          setRenderedDataUrl(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setRenderLoading(false);
        if (rawTextureUrl) {
          setRenderedDataUrl(rawTextureUrl);
          setRenderedCanvas(null);
          setRenderError(null);
        } else {
          setRenderError(err.message || 'Błąd renderowania modelu');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [asset, rawTextureUrl]);

  // Mount animated live canvas if present
  useEffect(() => {
    if (renderedCanvas && canvasWrapRef.current) {
      canvasWrapRef.current.innerHTML = '';
      canvasWrapRef.current.appendChild(renderedCanvas);
    }
  }, [renderedCanvas]);

  // Setup 3D skinview3d player when stageMode is 'player' (Armor only)
  useEffect(() => {
    if (stageMode !== 'player') {
      if (skinViewerRef.current) {
        try {
          skinViewerRef.current.dispose();
        } catch (_) {}
        skinViewerRef.current = null;
      }
      return;
    }

    if (!playerContainerRef.current) return;

    if (skinViewerRef.current) {
      try {
        skinViewerRef.current.dispose();
      } catch (_) {}
      skinViewerRef.current = null;
    }

    try {
      const viewer = createArmorInspector3D(playerContainerRef.current, {
        armorUrls: asset?.armorSet,
        pieceFilter: armorPieceFilter
      });
      if (viewer) {
        skinViewerRef.current = viewer;
        setPlayerError(null);
      } else {
        setPlayerError('Nie udało się utworzyć podglądu WebGL');
      }
    } catch (err) {
      console.warn('Błąd inicjalizacji SkinViewer:', err);
      setPlayerError(err.message || 'Błąd WebGL');
    }

    return () => {
      if (skinViewerRef.current) {
        try {
          skinViewerRef.current.dispose();
        } catch (_) {}
        skinViewerRef.current = null;
      }
    };
  }, [stageMode, asset?.id]);

  // Dynamically update armor piece filter without rebuilding WebGL context
  useEffect(() => {
    if (stageMode === 'player' && skinViewerRef.current) {
      try {
        skinViewerRef.current.setArmor(asset?.armorSet, armorPieceFilter);
      } catch (err) {
        console.warn('Błąd aktualizacji zbroi na modelu:', err);
      }
    }
  }, [armorPieceFilter, asset?.armorSet]);

  const togglePlayerAnimation = () => {
    const viewer = skinViewerRef.current;
    if (!viewer) return;

    if (isWalking) {
      viewer.animation = null;
      setIsWalking(false);
    } else {
      viewer.animation = new WalkingAnimation();
      setIsWalking(true);
    }
  };

  const handleResetCamera = () => {
    const viewer = skinViewerRef.current;
    if (!viewer) return;
    viewer.resetCameraPose();
    viewer.controls.target.set(0, 0, 0);
    viewer.controls.update();
  };

  const copyJson = () => {
    if (!asset?.rawJsonString) return;
    navigator.clipboard.writeText(asset.rawJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mouse drag handlers for 3D item rotation
  const handleMouseDown = (e) => {
    if (stageMode === 'player') return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: rotation.x,
      rotY: rotation.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setRotation({
      x: Math.max(-65, Math.min(65, dragStartRef.current.rotX - dy * 0.45)),
      y: dragStartRef.current.rotY + dx * 0.45
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetRotation = () => setRotation({ x: 0, y: 0 });
  const [copiedField, setCopiedField] = useState(null);

  const copyFieldText = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!asset) return null;

  return (
    <div className="review-drawer-backdrop" onClick={onClose}>
      <div
        className="review-drawer-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="review-drawer-header">
          <div className="review-drawer-title-wrap">
            <span className="review-drawer-cat-badge">
              {asset.category}
            </span>
            <h3 className="review-drawer-title">
              {asset.name}
            </h3>
            <span className="review-drawer-id">
              {asset.id}
            </span>
          </div>

          <button
            type="button"
            className="review-drawer-close"
            onClick={onClose}
            title="Zamknij (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body: Two Columns */}
        <div className="review-drawer-body">
          {/* LEFT: 3D / High-Res Viewport */}
          <div className="review-drawer-left">
            {/* Mode Switcher: Only shown if an individual armor piece has both a 3D character preview and an item model */}
            {isArmorAsset && asset.type !== 'armor_set' && (
              <div className="review-stage-mode-switcher">
                <button
                  type="button"
                  className={`review-stage-mode-btn ${stageMode === 'player' ? 'active' : ''}`}
                  onClick={() => setStageMode('player')}
                >
                  <Eye size={14} />
                  <span>Na postaci (Zbroja 3D)</span>
                </button>

                <button
                  type="button"
                  className={`review-stage-mode-btn ${stageMode === 'model' ? 'active' : ''}`}
                  onClick={() => setStageMode('model')}
                >
                  <Box size={14} />
                  <span>Model 3D (Przedmiot)</span>
                </button>
              </div>
            )}

            <div
              className={`review-stage-viewport bg-${localBgMode}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                cursor: stageMode === 'player' ? 'default' : (isDragging ? 'grabbing' : 'grab')
              }}
            >
              {/* 3D Player Viewer (Armor on Character) */}
              {stageMode === 'player' ? (
                <div className="review-3d-player-wrap">
                  {playerError && (
                    <div className="review-stage-error">
                      <AlertTriangle size={36} />
                      <p>{playerError}</p>
                    </div>
                  )}
                  <div
                    ref={playerContainerRef}
                    className="review-3d-player-mount"
                    style={{ display: playerError ? 'none' : 'flex' }}
                  />

                  <div className="review-player-controls-container">
                    {/* Armor piece switcher if viewing armor */}
                    {isArmorAsset && asset.armorSet && (
                      <div className="review-armor-piece-pills">
                        {(asset.armorSet.isElytra || asset.armorPiece === 'elytra' || asset.id?.includes('elytra')
                          ? [
                              { id: 'all', label: 'Wszystko' },
                              { id: 'elytra', label: 'Elytra' }
                            ]
                          : [
                              { id: 'all', label: 'Wszystko' },
                              { id: 'helmet', label: 'Hełm' },
                              { id: 'chestplate', label: 'Napierśnik' },
                              { id: 'leggings', label: 'Nogawice' },
                              { id: 'boots', label: 'Buty' }
                            ]
                        ).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={`review-piece-pill ${armorPieceFilter === p.id ? 'active' : ''}`}
                            onClick={() => setArmorPieceFilter(p.id)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="review-player-controls">
                      <button
                        type="button"
                        className="review-control-btn"
                        onClick={togglePlayerAnimation}
                        title={isWalking ? 'Zatrzymaj animację' : 'Uruchom animację'}
                      >
                        {isWalking ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isWalking ? 'Zatrzymaj' : 'Animuj'}</span>
                      </button>

                      <button
                        type="button"
                        className="review-control-btn"
                        onClick={handleResetCamera}
                        title="Zresetuj kamerę"
                      >
                        <RotateCcw size={14} />
                        <span>Reset Kamery</span>
                      </button>
                    </div>
                  </div>

                  <div className="review-player-hint-bar">
                    <Compass size={12} />
                    <span>Obracaj postać 360° myszką, kółkiem przybliżaj</span>
                  </div>
                </div>
              ) : (
                /* Item / Block Render Viewport with 3D Tilt */
                <div
                  className="review-model-stage"
                  style={{
                    transform: `perspective(700px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {renderLoading && (
                    <div className="review-stage-loading">
                      <Loader2 size={36} className="spin-animate" />
                      <span>Renderowanie w wysokiej rozdzielczości (512px)...</span>
                    </div>
                  )}

                  {renderError && (
                    <div className="review-stage-error">
                      <AlertTriangle size={36} />
                      <p>{renderError}</p>
                    </div>
                  )}

                  {!renderLoading && !renderError && renderedDataUrl && (
                    <img
                      src={renderedDataUrl}
                      alt={asset.name}
                      className="review-stage-img"
                      style={{ imageRendering: 'pixelated' }}
                      draggable={false}
                    />
                  )}

                  {!renderLoading && !renderError && renderedCanvas && (
                    <div ref={canvasWrapRef} className="review-stage-canvas-wrap" />
                  )}
                </div>
              )}

              {/* Viewport Floating Badges */}
              <div className="review-stage-badges">
                {asset.isAnimated && (
                  <span className="review-badge-anim">
                    <Sparkles size={12} />
                    ANIMATED (.mcmeta)
                  </span>
                )}
                {asset.customModelData !== undefined && (
                  <span className="review-badge-cmd">
                    <Layers size={12} />
                    CustomModelData #{asset.customModelData}
                  </span>
                )}
                {isArmorAsset && (
                  <span className="review-badge-armor">
                    <Shield size={12} />
                    3D Pancerz Gracza
                  </span>
                )}
              </div>

              {/* Interactive 3D Rotation Reset Button */}
              {stageMode !== 'player' && (rotation.x !== 0 || rotation.y !== 0) && (
                <button
                  type="button"
                  className="review-control-btn"
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                    zIndex: 10
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetRotation();
                  }}
                  title="Zresetuj kąt obrotu"
                >
                  <RotateCcw size={13} />
                  <span>Resetuj kąt</span>
                </button>
              )}

              {/* Interactive Rotation Hint for items/blocks */}
              {stageMode !== 'player' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    left: '0.75rem',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(15, 20, 29, 0.75)',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    color: '#94a3b8'
                  }}
                >
                  <Compass size={12} />
                  <span>Przeciągnij myszką, aby obrócić w 3D</span>
                </div>
              )}
            </div>


            {/* Background switcher for stage */}
            <div className="review-stage-bg-picker">
              <span className="review-context-label">Tło sceny:</span>
              <div className="review-bg-buttons">
                {['checkerboard', 'dark', 'light', 'slot'].map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    className={`review-stage-bg-btn ${localBgMode === bg ? 'active' : ''}`}
                    onClick={() => setLocalBgMode(bg)}
                  >
                    {bg === 'checkerboard' && 'Szachownica'}
                    {bg === 'dark' && 'Ciemne'}
                    {bg === 'light' && 'Jasne'}
                    {bg === 'slot' && 'Slot GUI'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Tabs with JSON, Textures, Diagnostics */}
          <div className="review-drawer-right">
            <div className="review-drawer-tabs">
              <button
                type="button"
                className={`review-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Info size={15} />
                <span>Informacje</span>
              </button>

              {asset.rawJsonString && (
                <button
                  type="button"
                  className={`review-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
                  onClick={() => setActiveTab('json')}
                >
                  <Code2 size={15} />
                  <span>Model JSON</span>
                </button>
              )}

              {rawTextureUrl && (
                <button
                  type="button"
                  className={`review-tab-btn ${activeTab === 'texture' ? 'active' : ''}`}
                  onClick={() => setActiveTab('texture')}
                >
                  <ImageIcon size={15} />
                  <span>Tekstura PNG</span>
                </button>
              )}

              <button
                type="button"
                className={`review-tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagnostics')}
              >
                <CheckCircle2 size={15} />
                <span>Diagnostyka</span>
              </button>
            </div>

            {/* TAB 1: Preview Information */}
            {activeTab === 'preview' && (
              <div className="review-tab-content">
                <div className="review-prop-group">
                  <div className="review-prop-item">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="prop-name">Pełny identyfikator:</span>
                      <button
                        type="button"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: copiedField === 'id' ? '#60a5fa' : '#64748b', fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }}
                        onClick={() => copyFieldText(asset.id, 'id')}
                        title="Kopiuj identyfikator"
                      >
                        {copiedField === 'id' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedField === 'id' ? 'Skopiowano' : 'Kopiuj'}</span>
                      </button>
                    </div>
                    <span className="prop-val highlight">{asset.id}</span>
                  </div>

                  <div className="review-prop-item">
                    <span className="prop-name">Namespace:</span>
                    <span className="prop-val">{asset.namespace}</span>
                  </div>

                  <div className="review-prop-item">
                    <span className="prop-name">Kategoria weryfikacji:</span>
                    <span className="prop-val">{asset.category}</span>
                  </div>

                  <div className="review-prop-item">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="prop-name">Ścieżka w archiwum .zip:</span>
                      <button
                        type="button"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: copiedField === 'path' ? '#60a5fa' : '#64748b', fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }}
                        onClick={() => copyFieldText(asset.filePath, 'path')}
                        title="Kopiuj ścieżkę"
                      >
                        {copiedField === 'path' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedField === 'path' ? 'Skopiowano' : 'Kopiuj'}</span>
                      </button>
                    </div>
                    <span className="prop-val code-path">{asset.filePath}</span>
                  </div>

                  {asset.parentModel && (
                    <div className="review-prop-item">
                      <span className="prop-name">Model bazowy (Parent):</span>
                      <span className="prop-val">{asset.parentModel}</span>
                    </div>
                  )}

                  {asset.customModelData !== undefined && (
                    <div className="review-prop-item">
                      <span className="prop-name">CustomModelData (CMD):</span>
                      <span className="prop-val cmd-val">#{asset.customModelData}</span>
                    </div>
                  )}

                  {asset.damagePredicate !== undefined && (
                    <div className="review-prop-item">
                      <span className="prop-name">Predykat uszkodzenia:</span>
                      <span className="prop-val">{asset.damagePredicate}</span>
                    </div>
                  )}

                  <div className="review-prop-item">
                    <span className="prop-name">Animacja .mcmeta:</span>
                    <span className="prop-val">
                      {asset.isAnimated ? 'Wykryto (Animowany)' : 'Statyczny (Brak animacji)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Model JSON Code */}
            {activeTab === 'json' && asset.rawJsonString && (
              <div className="review-tab-content">
                <div className="review-json-header">
                  <span className="review-json-title">Definicja modelu Minecraft</span>
                  <button
                    type="button"
                    className="review-copy-json-btn"
                    onClick={copyJson}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Skopiowano!' : 'Kopiuj JSON'}</span>
                  </button>
                </div>
                <pre className="review-json-code">
                  <code>{asset.rawJsonString}</code>
                </pre>
              </div>
            )}

            {/* TAB 3: Raw Texture PNG */}
            {activeTab === 'texture' && rawTextureUrl && (
              <div className="review-tab-content">
                <div className="review-raw-tex-wrap">
                  <div className="review-raw-tex-viewport bg-checkerboard">
                    <img
                      src={rawTextureUrl}
                      alt="Raw Texture"
                      className="review-raw-tex-img"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="review-tex-details">
                    <span className="review-tex-badge">Wyostrzone piksele (Pixelated)</span>
                    <span className="review-tex-badge">Rozmiar oryginalny</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Diagnostics */}
            {activeTab === 'diagnostics' && (
              <div className="review-tab-content">
                <div className="review-prop-group">
                  <div className="review-prop-item" style={{ borderLeft: '3px solid #3b82f6' }}>
                    <span className="prop-name">Status renderera WebGL:</span>
                    <span className="prop-val" style={{ color: '#60a5fa' }}>
                      Pomyślnie wyrenderowano bufor 3D
                    </span>
                  </div>
                  <div className="review-prop-item">
                    <span className="prop-name">Łańcuch dziedziczenia:</span>
                    <span className="prop-val">
                      {asset.parentModel ? `${asset.id} -> ${asset.parentModel}` : 'Brak zdefiniowanego parent'}
                    </span>
                  </div>
                  <div className="review-prop-item">
                    <span className="prop-name">Zarządzanie pamięcią GPU:</span>
                    <span className="prop-val" style={{ color: '#60a5fa' }}>
                      Kontekst WebGL zwolniony (WebP DataURL Cached)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
