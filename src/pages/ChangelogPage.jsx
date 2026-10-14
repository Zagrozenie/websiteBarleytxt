import React from 'react';
import { History, Sparkles, CheckCircle2 } from 'lucide-react';

export const ChangelogPage = () => {
  const changelog = [
    {
      version: 'v2.0.0 (React Migration & Admin Uploader)',
      date: 'Październik 2026',
      changes: [
        'Przebudowa całej platformy do nowoczesnej architektury React SPA',
        'Dodano zaawansowany panel administratora z uploaderem paczek Minecraft',
        'Automatyczna analiza plików .zip: parsowanie pack.mcmeta i ekstrakcja pack.png',
        'Zintegrowano wielojęzyczność w czasie rzeczywistym (Polski, English, Deutsch)',
        'Nowy, responsywny interfejs z dynamicznymi animacjami i szklanymi komponentami',
        'Dodano natywne wyszukiwanie i sortowanie katalogu z natychmiastowym filtrowaniem'
      ]
    },
    {
      version: 'v1.4.0',
      date: 'Sierpień 2026',
      changes: [
        'Dodano konwerter wersji texturepacków z obsługą formatów 1.8 do 1.21',
        'Dodano system odblokowywania paczek (Gated social unlock)',
        'Optymalizacja ładowania miniatur i formatu WebP'
      ]
    },
    {
      version: 'v1.0.0',
      date: 'Styczeń 2026',
      changes: [
        'Oficjalny start platformy BarleyTxT.pl',
        'Udostępnienie ponad 200 autorskich paczek tekstur PvP, BoxPvP i Overlay'
      ]
    }
  ];

  return (
    <div className="container" style={{ padding: '4rem 1.5rem 6rem', maxWidth: 760 }}>
      <div className="section-header">
        <div className="section-badge">
          <History size={14} />
          <span>Historia</span>
        </div>
        <h1 className="section-title">
          Changelog <span>Aktualizacji</span>
        </h1>
        <p className="section-subtitle">
          Zobacz historię zmian, nowych funkcji i ulepszeń platformy BarleyTxT
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {changelog.map((entry, idx) => (
          <div
            key={idx}
            className="glass-card"
            style={{ padding: '2rem', borderLeft: '4px solid #3b82f6' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: '#ffffff', fontSize: '1.25rem', fontWeight: 800 }}>
                {entry.version}
              </h3>
              <span style={{ fontSize: '0.8125rem', color: '#60a5fa', fontWeight: 600 }}>
                {entry.date}
              </span>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {entry.changes.map((change, cIdx) => (
                <li
                  key={cIdx}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--text-muted)' }}
                >
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 3 }} />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
