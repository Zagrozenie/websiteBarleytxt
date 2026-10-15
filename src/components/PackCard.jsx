import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePacks } from '../context/PacksContext';

export const PackCard = ({ pack, onClick, rank }) => {
  const { t } = useLanguage();
  const { formatStatNumber } = usePacks();

  const handleImageError = (e) => {
    e.target.src = '/assets/img/texturepack.png';
  };

  const handleIconError = (e) => {
    e.target.src = '/assets/img/favicon.png';
  };

  return (
    <div className="texturepacks-single show" onClick={onClick}>
      <div className="texturepacks-image">
        <img
          src={pack.image || '/assets/img/texturepack.png'}
          alt={pack.name}
          loading="lazy"
          onError={handleImageError}
        />
        {rank !== undefined && <span>#{rank}</span>}
      </div>

      <div className="texturepacks-content">
        <div className="author">
          <img
            src={pack.icon || '/assets/img/favicon.png'}
            alt={pack.author}
            onError={handleIconError}
          />
          <div className="author-description">
            <h3>{pack.name}</h3>
            <p>
              {t.catalog.by} <strong>{pack.author}</strong>
            </p>
          </div>
        </div>

        <div className="texturepacks-statistics">
          <div className="texturepack-download">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth="2"
                stroke="currentColor"
                d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12"
              />
            </svg>
            <span className="download-count">
              {formatStatNumber ? formatStatNumber(pack.downloads || 0) : (pack.downloads || 0)}
            </span>
          </div>

          {pack.version && (
            <div className="texturepack-version">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 640 640">
                <path d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z" />
              </svg>
              <span>{pack.version}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
