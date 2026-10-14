import React from 'react';
import { AssetReviewCard } from './AssetReviewCard';
import { SearchX } from 'lucide-react';

export const AssetGrid = ({
  assets = [],
  bgMode = 'checkerboard',
  viewMode = '3d',
  onSelectAsset
}) => {
  if (assets.length === 0) {
    return (
      <div className="review-empty-grid">
        <SearchX size={48} className="review-empty-icon" />
        <h3 className="review-empty-title">
          Brak pasujących elementów w tej kategorii
        </h3>
        <p className="review-empty-desc">
          Zmień wybraną kategorię lub zresetuj wpisaną frazę w wyszukiwarce.
        </p>
      </div>
    );
  }

  return (
    <div className="review-asset-grid">
      {assets.map((asset) => (
        <AssetReviewCard
          key={asset.id}
          asset={asset}
          bgMode={bgMode}
          viewMode={viewMode}
          onClick={onSelectAsset}
        />
      ))}
    </div>
  );
};
