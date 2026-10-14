import React, { useState, useEffect, useRef } from 'react';
import { renderAssetPreview } from '../../../services/RenderService';
import { Sparkles, Layers, Shield, Image, Loader2, AlertCircle } from 'lucide-react';

export const AssetReviewCard = ({ asset, bgMode = 'checkerboard', viewMode = '3d', onClick }) => {
  const [renderState, setRenderState] = useState({
    loading: true,
    error: null,
    type: null,
    dataUrl: null,
    canvas: null,
    renderedMode: null
  });

  const [inView, setInView] = useState(false);
  const cardRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // IntersectionObserver for lazy on-demand rendering
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setInView(true);
        } else if (asset.isAnimated) {
          // If animated, pause or detach when out of view to save GPU cycles
          setInView(false);
        }
      },
      { rootMargin: '250px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [asset.isAnimated]);

  // Trigger render when inView becomes true or viewMode changes
  useEffect(() => {
    if (!inView) return;
    if (renderState.renderedMode === viewMode && (renderState.dataUrl || renderState.canvas)) return;

    let cancelled = false;


    setRenderState(prev => ({ ...prev, loading: true }));

    renderAssetPreview(asset, { size: 160, displayContext: viewMode })
      .then((res) => {
        if (cancelled) return;
        if (res.type === 'image' || res.type === 'armor_set') {
          setRenderState({
            loading: false,
            error: null,
            type: 'image',
            dataUrl: res.dataUrl,
            renderedMode: viewMode
          });
        } else if (res.type === 'canvas') {
          setRenderState({
            loading: false,
            error: null,
            type: 'canvas',
            canvas: res.canvas,
            renderedMode: viewMode
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(`Card render error for ${asset.id}:`, err);
        setRenderState({
          loading: false,
          error: err.message || 'Błąd renderowania',
          type: 'error'
        });
      });

    return () => {
      cancelled = true;
    };
  }, [inView, asset, viewMode]);

  // Attach live canvas if animated
  useEffect(() => {
    if (renderState.type === 'canvas' && renderState.canvas && canvasContainerRef.current) {
      canvasContainerRef.current.innerHTML = '';
      canvasContainerRef.current.appendChild(renderState.canvas);
    }
  }, [renderState]);

  return (
    <div
      ref={cardRef}
      className={`review-asset-card ${asset.type === 'armor_set' ? 'armor-card' : ''}`}
      onClick={() => onClick?.(asset)}
    >
      {/* Thumbnail Viewport with selectable background */}
      <div className={`review-card-viewport bg-${bgMode}`}>
        {renderState.loading && (
          <div className="review-card-spinner">
            <Loader2 size={24} className="spin-animate" />
          </div>
        )}

        {renderState.error && (
          <div className="review-card-error">
            <AlertCircle size={22} />
            <span>Podgląd niedostępny</span>
          </div>
        )}

        {renderState.type === 'image' && renderState.dataUrl && (
          <img
            src={renderState.dataUrl}
            alt={asset.name}
            className="review-card-img"
            style={{ imageRendering: 'pixelated' }}
            loading="lazy"
          />
        )}

        {renderState.type === 'canvas' && (
          <div
            ref={canvasContainerRef}
            className="review-card-canvas-wrap"
          />
        )}

        {renderState.type === 'armor_set' && (
          <div className="review-card-armor-preview">
            {renderState.dataUrl ? (
              <img
                src={renderState.dataUrl}
                alt="Armor Texture"
                className="review-card-armor-tex"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <Shield size={36} className="armor-placeholder-icon" />
            )}
            <span className="armor-3d-hint">Podgląd 3D na graczu</span>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="review-card-badges">
          {asset.isAnimated && (
            <span className="review-badge-anim" title="Animowana tekstura .mcmeta">
              <Sparkles size={11} />
              ANIMATED
            </span>
          )}

          {asset.customModelData !== undefined && (
            <span className="review-badge-cmd" title={`CustomModelData #${asset.customModelData}`}>
              <Layers size={11} />
              CMD #{asset.customModelData}
            </span>
          )}

          {asset.type === 'armor_set' && (
            <span className="review-badge-armor" title="Interaktywny model zbroi 3D">
              <Shield size={11} />
              3D SET
            </span>
          )}

          {asset.textureOnly && (
            <span className="review-badge-tex" title="Podmieniona tekstura PNG">
              <Image size={11} />
              TEX
            </span>
          )}
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="review-card-meta">
        <div className="review-card-title-row">
          <h4 className="review-card-title" title={asset.name}>
            {asset.name}
          </h4>
        </div>

        <div className="review-card-id-row">
          <span className="review-card-id" title={asset.id}>
            {asset.id}
          </span>
          <span className="review-card-cat-pill">
            {asset.category}
          </span>
        </div>
      </div>
    </div>
  );
};
