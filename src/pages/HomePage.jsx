import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePacks } from '../context/PacksContext';
import { PackCard } from '../components/PackCard';
import { FAQSection } from '../components/FAQSection';
import { PartnersSection } from '../components/PartnersSection';

export const HomePage = ({ setCurrentView }) => {
  const { lang, t } = useLanguage();
  const { packs, totalDownloads, onlineDiscord, setActivePack } = usePacks();

  // Typewriter effect matching original script:
  // "Odkryj <span class='underline'>wysokiej</span> jakości<br> Paczki zasobów"
  const [typedHtml, setTypedHtml] = useState('');

  useEffect(() => {
    const textConfig = {
      pl: { prefix: 'Odkryj ', word: 'wysokiej', rest1: ' jakości', rest2: ' paczki tekstur' },
      en: { prefix: 'Discover ', word: 'high-quality', rest1: ' ', rest2: ' resource packs' },
      de: { prefix: 'Entdecke ', word: 'hochwertige', rest1: ' ', rest2: ' Resource Packs' }
    };
    const c = textConfig[lang] || textConfig.pl;

    let charIndex = 0;
    const total = c.prefix.length + c.word.length + c.rest1.length + c.rest2.length + 1;

    const render = (wordPart = '', rest1Part = '', rest2Part = '') => {
      return (
        c.prefix +
        "<span class='underline'>" +
        wordPart +
        '</span>' +
        rest1Part +
        (rest2Part ? '<br>' + rest2Part : '')
      );
    };

    const interval = setInterval(() => {
      charIndex++;
      if (charIndex <= c.prefix.length) {
        setTypedHtml(c.prefix.slice(0, charIndex));
      } else if (charIndex <= c.prefix.length + c.word.length) {
        setTypedHtml(render(c.word.slice(0, charIndex - c.prefix.length)));
      } else if (charIndex <= c.prefix.length + c.word.length + c.rest1.length) {
        setTypedHtml(
          render(c.word, c.rest1.slice(0, charIndex - c.prefix.length - c.word.length))
        );
      } else if (charIndex < total) {
        setTypedHtml(
          render(
            c.word,
            c.rest1,
            c.rest2.slice(0, charIndex - c.prefix.length - c.word.length - c.rest1.length)
          )
        );
      } else {
        setTypedHtml(render(c.word, c.rest1, c.rest2));
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [lang]);

  // Featured popular packs (first 8)
  const featuredPacks = packs.slice(0, 8);

  return (
    <>
      {/* Ambient background glow from original styles */}
      <div className="glow">
        <div className="glow-top"></div>
        <div className="glow-bottom"></div>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="container">
            <div className="badge show">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="badge-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M19 19h-14c-.5 0 -.9 -.3 -1 -.8l-2 -10c0 -.4 .1 -.8 .5 -1.1c.4 -.2 .8 -.2 1.1 0l4.1 3.3l3.4 -5.1c.4 -.6 1.3 -.6 1.7 0l3.4 5.1l4.1 -3.3c.3 -.3 .8 -.3 1.1 0c.4 .2 .5 .6 .5 1.1l-2 10c0 .5 -.5 .8 -1 .8z" />
              </svg>
              Oficjalna platforma texturepacków do Minecraft
            </div>

            <div className="hero-content">
              <h1 id="type-text" dangerouslySetInnerHTML={{ __html: typedHtml }} />
            </div>

            <p className="hero-description show">
              BarleyTxT to nowoczesna platforma z darmowymi paczkami tekstur do Minecrafta. Pobieraj starannie zoptymalizowane tekstury do PvP, BoxPvP i survivalu, które całkowicie odmienią Twoją grę.
            </p>

            <div className="hero-buttons">
              <div className="hero-button show">
                <a
                  href="https://www.youtube.com/@Barley69"
                  target="_blank"
                  rel="noreferrer"
                  className="button-youtube"
                >
                  Nasze Filmy
                  <svg className="icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z" />
                  </svg>
                </a>
              </div>

              <div className="hero-button show">
                <a
                  href="/texturepacks"
                  className="button-texturepacks"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentView('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Przeglądaj Paczki
                  <svg className="button-icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M384 64C366.3 64 352 78.3 352 96C352 113.7 366.3 128 384 128L466.7 128L265.3 329.4C252.8 341.9 252.8 362.2 265.3 374.7C277.8 387.2 298.1 387.2 310.6 374.7L512 173.3L512 256C512 273.7 526.3 288 544 288C561.7 288 576 273.7 576 256L576 96C576 78.3 561.7 64 544 64L384 64zM144 160C99.8 160 64 195.8 64 240L64 496C64 540.2 99.8 576 144 576L400 576C444.2 576 480 540.2 480 496L480 416C480 398.3 465.7 384 448 384C430.3 384 416 398.3 416 416L416 496C416 504.8 408.8 512 400 512L144 512C135.2 512 128 504.8 128 496L128 240C128 231.2 135.2 224 144 224L224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160L144 160z" />
                  </svg>
                </a>
              </div>

              <div className="hero-button show">
                <a
                  href="/editor"
                  className="button-texturepacks"
                  style={{
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(37, 99, 235, 0.2) 100%)',
                    borderColor: 'rgba(56, 189, 248, 0.45)',
                    color: '#38bdf8'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentView('editor');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Edytor Tekstur
                  <svg className="button-icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ width: '1.1rem', height: '1.1rem' }}>
                    <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.28 19.59 10.59 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 2c3.87 0 7 3.13 7 7 0 1.43-.43 2.75-1.17 3.86l-1.47-1.47a4.98 4.98 0 0 0-4.36-4.36L10.53 8.56A6.97 6.97 0 0 1 12 5zm-3.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                  </svg>
                </a>
              </div>

              <div className="hero-button show">
                <a
                  href="https://discord.gg/8q87J8GTNV"
                  target="_blank"
                  rel="noreferrer"
                  className="button-discord"
                >
                  Dołącz do Discorda
                  <svg className="button-icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5ZM416.5 401.5C387.5 401.5 363.7 374.9 363.7 342.3C363.7 309.7 387.1 283.1 416.5 283.1C446.2 283.1 469.8 309.9 469.3 342.3C469.3 375 445.9 401.5 416.5 401.5Z" />
                  </svg>
                </a>
              </div>
            </div>

            <a className="discord-advertising show" href="https://discord.gg/sharkpull" target="_blank" rel="noreferrer">
              <p className="discord-advertising-content">
                <span className="discord-advertising-title">Chcesz wypromować swój serwer lub społeczność Discord?</span>
                <span className="discord-advertising-text">
                  Dołącz do SharkPull
                  <svg className="discord-advertising-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </p>
            </a>
          </div>
        </section>

        {/* STATISTICS SECTION */}
        <section className="statistics">
          <div className="statistics-header">
            <div className="information-badge">Statystyki</div>
            <h3 className="statistics-title">Nasze Statystyki</h3>
            <p className="statistics-text">Liczby, które mówią same za siebie</p>
          </div>
          <div className="statistics-card">
            <div className="statistics-single">
              <div className="statistics-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.9844 10C21.9473 8.68893 21.8226 7.85305 21.4026 7.13974C20.8052 6.12523 19.7294 5.56066 17.5777 4.43152L15.5777 3.38197C13.8221 2.46066 12.9443 2 12 2C11.0557 2 10.1779 2.46066 8.42229 3.38197L6.42229 4.43152C4.27063 5.56066 3.19479 6.12523 2.5974 7.13974C2 8.15425 2 9.41667 2 11.9415V12.0585C2 14.5833 2 15.8458 2.5974 16.8603C3.19479 17.8748 4.27063 18.4393 6.42229 19.5685L8.42229 20.618C10.1779 21.5393 11.0557 22 12 22C12.9443 22 13.8221 21.5393 15.5777 20.618L17.5777 19.5685C19.7294 18.4393 20.8052 17.8748 21.4026 16.8603C21.8226 16.1469 21.9473 15.3111 21.9844 14" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M21 7.5L17 9.5M12 12L3 7.5M12 12V21.5M12 12C12 12 14.7426 10.6287 16.5 9.75C16.6953 9.65237 17 9.5 17 9.5M17 9.5V13M17 9.5L7.5 4.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="statistics-content">
                <span id="texturepacks-count">{packs.length}</span>
                <p>Dostępnych paczek w katalogu</p>
              </div>
              <div className="statistics-blur"></div>
            </div>

            <div className="statistics-single">
              <div className="statistics-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.54601 20.891L5 20H5L4.54601 20.891ZM4.10899 20.454L5 20H5L4.10899 20.454ZM4.04798 16.4656L5.03199 16.6437H5.03199L4.04798 16.4656ZM6.46558 14.048L6.64372 15.032H6.64372L6.46558 14.048ZM8.52682 14.4682L8.11418 15.3791L8.52682 14.4682ZM7.59797 14.0722L7.86945 13.1098L7.59797 14.0722ZM6.71575 14.0172L6.63976 13.0201L6.71575 14.0172ZM7.20361 14.0026L7.2779 13.0054L7.20361 14.0026ZM12.1655 15.9033C12.7101 15.8119 13.0776 15.2963 12.9862 14.7516C12.8948 14.2069 12.3792 13.8394 11.8345 13.9308L12.1655 15.9033ZM14 22C14.5523 22 15 21.5523 15 21C15 20.4477 14.5523 20 14 20V22ZM17.29 17.2929C16.8994 17.6834 16.8994 18.3166 17.29 18.7071C17.6805 19.0976 18.3137 19.0976 18.7042 18.7071L17.29 17.2929ZM15.0916 14.7507C14.954 15.2856 15.2759 15.8308 15.8108 15.9684C16.3457 16.1061 16.8908 15.7841 17.0285 15.2493L15.0916 14.7507ZM17.9971 20C17.4448 20 16.9971 20.4477 16.9971 21C16.9971 21.5523 17.4448 22 17.9971 22V20ZM18.0071 22C18.5594 22 19.0071 21.5523 19.0071 21C19.0071 20.4477 18.5594 20 18.0071 20V22ZM14 7C14 8.65685 12.6569 10 11 10V12C13.7614 12 16 9.76142 16 7H14ZM11 10C9.34315 10 8 8.65685 8 7H6C6 9.76142 8.23858 12 11 12V10ZM8 7C8 5.34315 9.34315 4 11 4V2C8.23858 2 6 4.23858 6 7H8ZM11 4C12.6569 4 14 5.34315 14 7H16C16 4.23858 13.7614 2 11 2V4ZM11 14C10.2634 14 9.5665 13.8413 8.93945 13.5573L8.11418 15.3791C8.99535 15.7783 9.97313 16 11 16V14ZM5 19.4V17.6841H3V19.4H5ZM5.6 20C5.30347 20 5.14122 19.9992 5.02463 19.9897C4.91972 19.9811 4.94249 19.9707 5 20L4.09202 21.782C4.36344 21.9203 4.63318 21.9644 4.86177 21.9831C5.07869 22.0008 5.33648 22 5.6 22V20ZM3 19.4C3 19.6635 2.99922 19.9213 3.01695 20.1382C3.03562 20.3668 3.07969 20.6366 3.21799 20.908L5 20C5.0293 20.0575 5.01887 20.0803 5.0103 19.9754C5.00078 19.8588 5 19.6965 5 19.4H3ZM5 20H5L3.21799 20.908C3.40973 21.2843 3.7157 21.5903 4.09202 21.782L5 20ZM5 17.6841C5 17.0048 5.00403 16.7982 5.03199 16.6437L3.06398 16.2874C2.99597 16.6631 3 17.0921 3 17.6841H5ZM6.63976 13.0201C6.52094 13.0291 6.40482 13.0427 6.28744 13.064L6.64372 15.032C6.68018 15.0254 6.72646 15.0192 6.79174 15.0143L6.63976 13.0201ZM5.03199 16.6437C5.18058 15.8229 5.82295 15.1806 6.64372 15.032L6.28744 13.064C4.6459 13.3612 3.36116 14.6459 3.06398 16.2874L5.03199 16.6437ZM8.93945 13.5573C8.46856 13.344 8.10859 13.1772 7.86945 13.1098L7.3265 15.0347C7.32059 15.033 7.33175 15.0359 7.36967 15.0506C7.40596 15.0646 7.45555 15.0851 7.52413 15.1147C7.66296 15.1747 7.84942 15.2591 8.11418 15.3791L8.93945 13.5573ZM6.79174 15.0143C7.02942 14.9962 7.06668 14.9952 7.12932 14.9999L7.2779 13.0054C7.03995 12.9877 6.85217 13.0039 6.63976 13.0201L6.79174 15.0143ZM7.86945 13.1098C7.65428 13.0491 7.50084 13.022 7.2779 13.0054L7.12932 14.9999C7.18838 15.0043 7.2134 15.0079 7.22908 15.0106C7.24475 15.0134 7.26949 15.0186 7.3265 15.0347L7.86945 13.1098ZM11.8345 13.9308C11.5638 13.9762 11.285 14 11 14V16C11.3964 16 11.7858 15.967 12.1655 15.9033L11.8345 13.9308ZM14 20H5.6V22H14V20ZM18.997 15.5C18.997 15.6732 18.9516 15.8053 18.6776 16.0697C18.5239 16.218 18.3429 16.3653 18.0919 16.574C17.8536 16.7723 17.5741 17.0087 17.29 17.2929L18.7042 18.7071C18.92 18.4913 19.1405 18.3033 19.3709 18.1116C19.5887 17.9305 19.8452 17.7223 20.0665 17.5087C20.5426 17.0493 20.997 16.4314 20.997 15.5H18.997ZM17.997 14.5C18.5493 14.5 18.997 14.9477 18.997 15.5H20.997C20.997 13.8431 19.6539 12.5 17.997 12.5V14.5ZM17.0285 15.2493C17.1396 14.8177 17.5325 14.5 17.997 14.5V12.5C16.5978 12.5 15.4246 13.457 15.0916 14.7507L17.0285 15.2493ZM17.9971 22H18.0071V20H17.9971V22Z" />
                </svg>
              </div>
              <div className="statistics-content">
                <span id="online-user">{onlineDiscord || 14}</span>
                <p>Graczy online w społeczności</p>
              </div>
              <div className="statistics-blur"></div>
            </div>

            <div className="statistics-single">
              <div className="statistics-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 3.01254C10.9983 2.46026 11.4446 2.01114 11.9969 2.00941C12.5492 2.00768 12.9983 2.45399 13 3.00627L11 3.01254Z" />
                  <path d="M14.3158 10.2951L13.0269 11.592L13 3.00627L11 3.01254L11.0269 11.5983L9.73003 10.3095C9.33828 9.92018 8.7051 9.92214 8.3158 10.3139C7.9265 10.7056 7.92849 11.3388 8.32024 11.7281L8.32275 11.7306L8.32374 11.7316L12.039 15.4236L15.7206 11.7187L15.7262 11.7131L15.727 11.7123L15.7278 11.7115L15.7337 11.7056L15.7344 11.7049L14.3158 10.2951Z" />
                  <path d="M15.7344 11.7049C16.1237 11.3131 16.1217 10.6799 15.73 10.2906C15.3382 9.90134 14.705 9.90335 14.3158 10.2951L15.7344 11.7049Z" />
                  <path d="M4 12C4 10.8954 4.89543 10 6 10C6.55228 10 7 9.55228 7 9C7 8.44771 6.55228 8 6 8C3.79086 8 2 9.79086 2 12V18C2 20.2091 3.79086 22 6 22H17C19.7614 22 22 19.7614 22 17V12C22 9.79086 20.2091 8 18 8C17.4477 8 17 8.44771 17 9C17 9.55228 17.4477 10 18 10C19.1046 10 20 10.8954 20 12V17C20 18.6569 18.6569 20 17 20H6C4.89543 20 4 19.1046 4 18V12Z" />
                </svg>
              </div>
              <div className="statistics-content">
                <span id="total-download-count">{totalDownloads.toLocaleString()}</span>
                <p>Pobranych paczek łącznie</p>
              </div>
              <div className="statistics-blur"></div>
            </div>
          </div>
        </section>

        {/* POPULAR TEXTUREPACKS SECTION */}
        <section className="texturepacks-popular" id="texturepacks">
          <div className="texturepacks-popular-header">
            <div className="information-badge">Katalog</div>
            <h3 className="texturepacks-popular-title">Najpopularniejsze Paczki</h3>
            <p className="texturepacks-popular-text">Najchętniej pobierane tekstury przez graczy Minecraft</p>
          </div>
          <div id="texturepacks-container" className="texturepacks-card">
            {featuredPacks.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onClick={() => setActivePack(pack)}
              />
            ))}
          </div>
          <div className="texturepacks-button">
            <a
              href="/texturepacks"
              className="button-texturepacks"
              onClick={(e) => {
                e.preventDefault();
                setCurrentView('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Zobacz Wszystkie Paczki
              <svg className="button-icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                <path d="M384 64C366.3 64 352 78.3 352 96C352 113.7 366.3 128 384 128L466.7 128L265.3 329.4C252.8 341.9 252.8 362.2 265.3 374.7C277.8 387.2 298.1 387.2 310.6 374.7L512 173.3L512 256C512 273.7 526.3 288 544 288C561.7 288 576 273.7 576 256L576 96C576 78.3 561.7 64 544 64L384 64zM144 160C99.8 160 64 195.8 64 240L64 496C64 540.2 99.8 576 144 576L400 576C444.2 576 480 540.2 480 496L480 416C480 398.3 465.7 384 448 384C430.3 384 416 398.3 416 416L416 496C416 504.8 408.8 512 400 512L144 512C135.2 512 128 504.8 128 496L128 240C128 231.2 135.2 224 144 224L224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160L144 160z" />
              </svg>
            </a>
          </div>
        </section>


        {/* 3D PARTNERS SECTION */}
        <PartnersSection />

        {/* FAQ SECTION */}
        <FAQSection />
      </main>
    </>
  );
};
