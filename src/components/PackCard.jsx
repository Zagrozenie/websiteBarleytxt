import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const PackCard = ({ pack, onClick }) => {
  const { t } = useLanguage();

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
        {pack.version && <span>{pack.version}</span>}
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
      </div>
    </div>
  );
};
