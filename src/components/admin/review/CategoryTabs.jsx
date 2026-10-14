import React from 'react';
import { Shield, Swords, Apple, Wrench, Box, Sparkles, LayoutGrid } from 'lucide-react';
import { REVIEW_CATEGORIES } from '../../../services/PackScannerService';

export const CategoryTabs = ({
  activeCategory,
  onSelectCategory,
  categoryCounts = {}
}) => {
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'All':
        return <LayoutGrid size={15} />;
      case 'Armor':
        return <Shield size={15} />;
      case 'Weapons':
        return <Swords size={15} />;
      case 'Food':
        return <Apple size={15} />;
      case 'Tools':
        return <Wrench size={15} />;
      case 'Blocks':
        return <Box size={15} />;
      case 'Cosmetics & Other':
      default:
        return <Sparkles size={15} />;
    }
  };

  const getPolishLabel = (cat) => {
    switch (cat) {
      case 'All':
        return 'Wszystkie';
      case 'Armor':
        return 'Zbroje & Pancerze';
      case 'Weapons':
        return 'Broń';
      case 'Food':
        return 'Jedzenie & Mikstury';
      case 'Tools':
        return 'Narzędzia';
      case 'Blocks':
        return 'Bloki';
      case 'Cosmetics & Other':
      default:
        return 'Kosmetyki & Inne';
    }
  };

  return (
    <div className="review-category-tabs-wrap">
      <div className="review-category-tabs">
        {REVIEW_CATEGORIES.map((cat) => {
          const count = categoryCounts[cat] || 0;
          const isActive = activeCategory === cat;

          return (
            <button
              key={cat}
              type="button"
              className={`review-category-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat)}
            >
              <span className="review-category-icon">
                {getCategoryIcon(cat)}
              </span>
              <span className="review-category-label">
                {getPolishLabel(cat)}
              </span>
              <span className={`review-category-counter ${count > 0 ? 'has-items' : ''}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
