import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const Footer = ({ setCurrentView }) => {
  const { t } = useLanguage();

  const handleNav = (view, e) => {
    e.preventDefault();
    if (view === 'faq') {
      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setCurrentView(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer">
      <div className="footer-header">
        <div className="footer-main">
          {/* Column 1: Brand Info & Social Icons */}
          <div className="footer-column footer-brand-column">
            <div className="footer-logo">
              <img src="/assets/img/logo.png" alt="Logo BarleyTxT" />
              <p>BarleyTxT.pl</p>
            </div>
            <div className="footer-text">
              <p>
                BarleyTxT to nowoczesna platforma z darmowymi paczkami tekstur do Minecrafta. Znajdziesz u nas zoptymalizowane tekstury PvP, BoxPvP i survival, dopracowane w najdrobniejszych szczegółach.
              </p>
            </div>
            <div className="footer-icons">
              <div className="youtube-icon">
                <a href="https://www.youtube.com/@Barley69" target="_blank" rel="noreferrer" aria-label="YouTube" title="Oficjalny kanał YouTube">
                  <svg className="icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z" />
                  </svg>
                </a>
              </div>
              <div className="discord-icon">
                <a href="https://discord.gg/Wa9u6bVBgz" target="_blank" rel="noreferrer" aria-label="Discord" title="Serwer Discord społeczności">
                  <svg className="icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5ZM416.5 401.5C387.5 401.5 363.7 374.9 363.7 342.3C363.7 309.7 387.1 283.1 416.5 283.1C446.2 283.1 469.8 309.9 469.3 342.3C469.3 375 445.9 401.5 416.5 401.5Z" />
                  </svg>
                </a>
              </div>
              <div className="tiktok-icon">
                <a href="https://www.tiktok.com/@barley.47" target="_blank" rel="noreferrer" aria-label="TikTok" title="Oficjalny TikTok">
                  <svg className="icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M544.5 273.9C500.5 274 457.5 260.3 421.7 234.7L421.7 413.4C421.7 446.5 411.6 478.8 392.7 506C373.8 533.2 347.1 554 316.1 565.6C285.1 577.2 251.3 579.1 219.2 570.9C187.1 562.7 158.3 545 136.5 520.1C114.7 495.2 101.2 464.1 97.5 431.2C93.8 398.3 100.4 365.1 116.1 336C131.8 306.9 156.1 283.3 185.7 268.3C215.3 253.3 248.6 247.8 281.4 252.3L281.4 342.2C266.4 337.5 250.3 337.6 235.4 342.6C220.5 347.6 207.5 357.2 198.4 369.9C189.3 382.6 184.4 398 184.5 413.8C184.6 429.6 189.7 444.8 199 457.5C208.3 470.2 221.4 479.6 236.4 484.4C251.4 489.2 267.5 489.2 282.4 484.3C297.3 479.4 310.4 469.9 319.6 457.2C328.8 444.5 333.8 429.1 333.8 413.4L333.8 64L421.8 64C421.7 71.4 422.4 78.9 423.7 86.2C426.8 102.5 433.1 118.1 442.4 131.9C451.7 145.7 463.7 157.5 477.6 166.5C497.5 179.6 520.8 186.6 544.6 186.6L544.6 274z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="footer-column">
            <h2 className="footer-title">Nawigacja</h2>
            <ul className="footer-menu">
              <li><a href="/" className="footer-link" onClick={(e) => handleNav('home', e)}>Strona Główna</a></li>
              <li><a href="/texturepacks" className="footer-link" onClick={(e) => handleNav('catalog', e)}>Katalog Paczek</a></li>
              <li><a href="/converter" className="footer-link" onClick={(e) => handleNav('converter', e)}>Konwerter Wersji</a></li>
              <li><a href="/create" className="footer-link" onClick={(e) => handleNav('create', e)}>Kreator Linków</a></li>
              <li><a href="#faq" className="footer-link" onClick={(e) => handleNav('faq', e)}>Częste Pytania (FAQ)</a></li>
            </ul>
          </div>

          {/* Column 3: Resources & Legal */}
          <div className="footer-column">
            <h2 className="footer-title">Informacje</h2>
            <ul className="footer-menu">
              <li><a href="/privacy-policy" className="footer-link" onClick={(e) => handleNav('privacy', e)}>Polityka Prywatności</a></li>
              <li><a href="/terms-of-service" className="footer-link" onClick={(e) => handleNav('terms', e)}>Regulamin Serwisu</a></li>
              <li><a href="/changelog" className="footer-link" onClick={(e) => handleNav('changelog', e)}>Dziennik Zmian (Changelog)</a></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-left">
            <p className="footer-copyright">© {new Date().getFullYear()} BarleyTxT.pl. Wszelkie prawa zastrzeżone.</p>
            <p className="minecraft-info">Minecraft jest znakiem towarowym Mojang AB / Microsoft. Strona nie jest w żaden sposób z nimi powiązana.</p>
          </div>
          <div className="footer-right">
            <p className="website-author">
              Stworzone z pasją dla społeczności graczy Minecraft.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
