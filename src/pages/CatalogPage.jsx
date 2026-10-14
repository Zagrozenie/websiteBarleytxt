import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePacks } from '../context/PacksContext';
import { PackCard } from '../components/PackCard';

export const CatalogPage = () => {
  const { t } = useLanguage();
  const {
    filteredPacks,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    setActivePack
  } = usePacks();

  const categories = [
    { id: 'all', label: 'Wszystkie', icon: '/assets/img/1133628501166149662.png' },
    { id: 'boxpvp', label: 'BoxPvP', icon: '/assets/img/1371060064596787221.png' },
    { id: 'pvp', label: 'PvP', icon: '/assets/img/1168210759063449620.png' },
    { id: 'overlay', label: 'Overlaye', icon: '/assets/img/1035911957598973993.png' }
  ];

  return (
    <>
      <div className="glow">
        <div className="glow-top"></div>
        <div className="glow-bottom"></div>
      </div>

      <section className="texturepacks subpage">
        {/* Search bar */}
        <div className="search-item">
          <div className="search-wrapper">
            <svg viewBox="0 0 20 20" className="search-icon">
              <path d="M16.72 17.78a.75.75 0 1 0 1.06-1.06l-1.06 1.06ZM9 14.5A5.5 5.5 0 0 1 3.5 9H2a7 7 0 0 0 7 7v-1.5ZM3.5 9A5.5 5.5 0 0 1 9 3.5V2a7 7 0 0 0-7 7h1.5ZM9 3.5A5.5 5.5 0 0 1 14.5 9H16a7 7 0 0 0-7-7v1.5Zm3.89 10.45 3.83 3.83 1.06-1.06-3.83-3.83-1.06 1.06ZM14.5 9a5.48 5.48 0 0 1-1.61 3.89l1.06 1.06A6.98 6.98 0 0 0 16 9h-1.5Zm-1.61 3.89A5.48 5.48 0 0 1 9 14.5V16a6.98 6.98 0 0 0 4.95-2.05l-1.06-1.06Z" />
            </svg>
            <input
              type="search"
              className="search"
              placeholder="Wyszukaj paczkę tekstur po nazwie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="button" className="button-search">
              Szukaj
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="catalog-categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`catalog-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              <img src={cat.icon} alt="" />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>


        {/* Texturepacks Grid */}
        <div className="texturepacks-card">
          <div className="texturepacks-grid" id="texturepacks-container" style={{ opacity: 1 }}>
            {filteredPacks.length > 0 ? (
              filteredPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onClick={() => setActivePack(pack)}
                />
              ))
            ) : (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '4rem 1rem',
                  color: 'var(--foreground)'
                }}
              >
                <p style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                  Nie znaleziono paczek tekstur spełniających podane kryteria.
                </p>
                <button
                  type="button"
                  className="button-search"
                  style={{ position: 'static', transform: 'none', marginTop: '1rem' }}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  Wyczyść filtry i pokaż wszystkie
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};
