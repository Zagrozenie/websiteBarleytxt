import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useToast } from '../context/ToastContext';

export const PackDetailModal = ({ pack, onClose, onOpenConverter }) => {
  const { addToast } = useToast();
  const [views, setViews] = useState(0);
  const [downloads, setDownloads] = useState(0);

  useEffect(() => {
    if (!pack?.id) return;

    fetch(`/view/${pack.id}`, { method: 'POST' }).catch(() => {});
    fetch(`/stats/${pack.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setViews(data.views || 0);
          setDownloads(data.downloads || 0);
        }
      })
      .catch(() => {});
  }, [pack?.id]);

  if (!pack) return null;

  const handleDownload = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

    fetch(`/download/${pack.id}`, { method: 'POST' }).catch(() => {});
    setDownloads((prev) => prev + 1);

    if (pack.download) {
      addToast(`Pobieranie paczki "${pack.name}" rozpoczęte!`, 'success');
      setTimeout(() => {
        window.open(pack.download, '_blank');
      }, 500);
    } else {
      addToast('Brak bezpośredniego linku do pobrania.', 'info');
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?pack=${pack.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pack.name,
          text: `Sprawdź paczkę tekstur "${pack.name}" na BarleyTxT.pl!`,
          url
        });
      } catch (_) {}
    } else {
      navigator.clipboard.writeText(url);
      addToast('Skopiowano link do schowka!', 'success');
    }
  };

  return (
    <div className="download-container active" onClick={onClose}>
      <div
        className="download-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(90vw, 32rem)' }}
      >
        {/* Header with pack icon & title */}
        <div className="download-info">
          <div className="download-info-left">
            <img
              src={pack.icon || '/assets/img/favicon.png'}
              alt={pack.name}
              className="download-pack-icon"
              onError={(e) => { e.target.src = '/assets/img/favicon.png'; }}
            />
            <div>
              <div className="download-pack-title">{pack.name}</div>
              <div className="download-pack-author">by {pack.author}</div>
            </div>
          </div>
          <button
            type="button"
            className="download-close"
            onClick={onClose}
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        {/* Big Preview Image */}
        {pack.image && (
          <div
            style={{
              position: 'relative',
              borderRadius: '1rem',
              overflow: 'hidden',
              marginTop: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              maxHeight: '14rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            <img
              src={pack.image}
              alt={pack.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { e.target.src = '/assets/img/texturepack.png'; }}
            />
            {pack.version && (
              <span
                style={{
                  position: 'absolute',
                  top: '0.85rem',
                  left: '0.85rem',
                  background: 'rgba(10, 14, 24, 0.88)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(59, 130, 246, 0.45)',
                  color: '#93c5fd',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                }}
              >
                {pack.version}
              </span>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <div className="modal-stat-chip">
            <span className="modal-stat-val">{downloads.toLocaleString()}</span>
            <span className="modal-stat-label">Pobrań</span>
          </div>
          <div className="modal-stat-chip">
            <span className="modal-stat-val">{views.toLocaleString()}</span>
            <span className="modal-stat-label">Wyświetleń</span>
          </div>
          <div className="modal-stat-chip">
            <span className="modal-stat-val">{(pack.category || 'PVP').toUpperCase()}</span>
            <span className="modal-stat-label">Kategoria</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            type="button"
            className="download-pack-button unlocked"
            onClick={handleDownload}
          >
            <svg
              className="download-pack-button-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              style={{ width: '1.25rem', height: '1.25rem' }}
            >
              <path d="M12 16l4-5h-3V4h-2v7H8l4 5zm-8 4h16v-2H4v2z" />
            </svg>
            Pobierz {pack.name}
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="button-texturepacks"
              style={{
                flex: 1,
                padding: '0.8rem 1rem',
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px'
              }}
              onClick={() => {
                onClose();
                onOpenConverter?.(pack);
              }}
            >
              Konwertuj wersję
            </button>

            <button
              type="button"
              className="button-texturepacks"
              style={{
                flex: 1,
                padding: '0.8rem 1rem',
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px'
              }}
              onClick={handleShare}
            >
              Udostępnij paczkę
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
