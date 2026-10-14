import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePacks } from '../context/PacksContext';

export const Navbar = ({ currentView, setCurrentView }) => {
  const { lang, setLang, t } = useLanguage();
  const { setSelectedCategory } = usePacks();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentView('catalog');
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (view, e) => {
    if (e) e.preventDefault();
    if (view === 'faq') {
      if (currentView !== 'home') {
        setCurrentView('home');
        setTimeout(() => {
          document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setCurrentView(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const languages = [
    { code: 'pl', short: 'POL', label: 'Polski', flag: '/assets/img/poland.svg' },
    { code: 'en', short: 'ENG', label: 'English', flag: '/assets/img/united-kingdom.svg' },
    { code: 'de', short: 'DEU', label: 'Deutsch', flag: '/assets/img/germany.svg' }
  ];

  const currentLangObj = languages.find((l) => l.code === lang) || languages[0];

  const arrowSvg = (
    <svg fill="currentColor" viewBox="0 0 320 512" height="1rem" width="1rem" xmlns="http://www.w3.org/2000/svg">
      <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
    </svg>
  );

  return (
    <>
      <div className="information-banner">
        <p>
          <span className="banner-tag">BETA</span> Strona jest w wersji testowej! Zauważyłeś błąd lub masz sugestię? Daj nam znać na Discordzie!
        </p>
      </div>

      <header className="header">
        <nav className="navbar-container">
          <div className="navbar-logo">
            <a href="/" onClick={(e) => handleNavClick('home', e)}>
              <img src="/assets/img/favicon.png" alt="Logo witryny" />
            </a>
          </div>

          <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <ul>
              <li>
                <a
                  href="/"
                  className={`nav-link ${currentView === 'home' ? 'link-active' : ''}`}
                  onClick={(e) => handleNavClick('home', e)}
                >
                  Strona Główna
                </a>
              </li>

              <li className="navbar-dropdown-link" ref={dropdownRef}>
                <button
                  type="button"
                  className={`nav-link navbar-dropdown-select ${currentView === 'catalog' ? 'link-active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  Texturepacki
                  <span className={`navbar-dropdown-arrow ${dropdownOpen ? 'navbar-dropdown-arrow-rotate' : ''}`}>
                    {arrowSvg}
                  </span>
                </button>
                <ul className={`navbar-dropdown-menu ${dropdownOpen ? 'navbar-dropdown-menu-open' : ''}`}>
                  <li>
                    <a
                      href="#"
                      className="nav-link"
                      onClick={(e) => { e.preventDefault(); handleCategorySelect('all'); }}
                    >
                      <img src="/assets/img/1133628501166149662.png" alt="Wszystkie" className="navbar-link-icon" /> Wszystkie
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="nav-link"
                      onClick={(e) => { e.preventDefault(); handleCategorySelect('boxpvp'); }}
                    >
                      <img src="/assets/img/1371060064596787221.png" alt="BoxPvP" className="navbar-link-icon" /> BoxPvP
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="nav-link"
                      onClick={(e) => { e.preventDefault(); handleCategorySelect('pvp'); }}
                    >
                      <img src="/assets/img/1168210759063449620.png" alt="PvP" className="navbar-link-icon" /> PvP
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="nav-link"
                      onClick={(e) => { e.preventDefault(); handleCategorySelect('overlay'); }}
                    >
                      <img src="/assets/img/1035911957598973993.png" alt="Overlaye" className="navbar-link-icon" /> Overlaye
                    </a>
                  </li>
                </ul>
              </li>

              <li>
                <a
                  href="/create"
                  className={`nav-link ${currentView === 'create' ? 'link-active' : ''}`}
                  onClick={(e) => handleNavClick('create', e)}
                >
                  Stwórz Link
                </a>
              </li>

              <li>
                <a
                  href="/editor"
                  className={`nav-link ${currentView === 'editor' ? 'link-active' : ''}`}
                  onClick={(e) => handleNavClick('editor', e)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {t.nav.editor || 'Edytor Tekstur'}
                    <span style={{
                      fontSize: '0.62rem',
                      background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      letterSpacing: '0.03em'
                    }}>NOWOŚĆ</span>
                  </span>
                </a>
              </li>

              <li>
                <a
                  href="/converter"
                  className={`nav-link ${currentView === 'converter' ? 'link-active' : ''}`}
                  onClick={(e) => handleNavClick('converter', e)}
                >
                  Konwerter
                </a>
              </li>

              <li>
                <a
                  href="#faq"
                  className="nav-link"
                  onClick={(e) => handleNavClick('faq', e)}
                >
                  FAQ
                </a>
              </li>

              <li className="mobile-lang-switcher">
                <span className="nav-link">Wybierz język</span>
                <div className="mobile-lang-options">
                  {languages.map((l) => (
                    <a
                      key={l.code}
                      href="#"
                      className={`mobile-lang-option ${lang === l.code ? 'active' : ''}`}
                      title={l.label}
                      onClick={(e) => {
                        e.preventDefault();
                        setLang(l.code);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <img
                        src={l.flag}
                        alt={l.code}
                        className="mobile-lang-flag"
                        style={{ width: '1.4rem', height: '1.4rem', maxWidth: '1.4rem', maxHeight: '1.4rem', borderRadius: '50%', objectFit: 'cover', display: 'inline-block' }}
                      />
                      <span className="mobile-lang-code" style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                        {l.short}
                      </span>
                    </a>
                  ))}
                </div>
              </li>
            </ul>
          </div>

          <div className="navbar-dropdown" ref={langRef}>
            <button
              type="button"
              className="dropdown-select"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              title={currentLangObj.label}
              aria-label={currentLangObj.label}
            >
              <img src={currentLangObj.flag} alt={currentLangObj.label} className="dropdown-flag selected-flag" />
              <span className="lang-select-code" style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                {currentLangObj.short}
              </span>
              <div className={`dropdown-arrow ${langMenuOpen ? 'dropdown-arrow-rotate' : ''}`}>
                {arrowSvg}
              </div>
            </button>
            <ul className={`dropdown-menu ${langMenuOpen ? 'dropdown-menu-open' : ''}`}>
              {languages.map((l) => (
                <li
                  key={l.code}
                  className={lang === l.code ? 'dropdown-active' : ''}
                  title={l.label}
                  onClick={() => {
                    setLang(l.code);
                    setLangMenuOpen(false);
                  }}
                >
                  <img src={l.flag} alt={l.label} className="dropdown-flag" />
                  <span className="lang-menu-code" style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                    {l.short}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`navbar-hamburger ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </nav>
      </header>
    </>
  );
};
