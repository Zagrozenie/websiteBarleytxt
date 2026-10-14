import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';
import { API_BASE } from '../config';

export const UnlockPage = ({ slug, setCurrentView }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  const [completedSteps, setCompletedSteps] = useState(0);
  const [loadingIndex, setLoadingIndex] = useState(-1);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // Check whitelist bypass
    async function checkWhitelist() {
      try {
        const res = await fetch(`${API_BASE}/api/check-whitelist`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.whitelisted && isMounted) {
            setIsWhitelisted(true);
            return;
          }
        }
      } catch (_) {}

      try {
        const res = await fetch('/api/check-whitelist', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.whitelisted && isMounted) setIsWhitelisted(true);
        }
      } catch (_) {}
    }

    checkWhitelist();

    async function loadLink() {
      setLoading(true);
      try {
        let found = null;

        // Try API
        if (slug) {
          try {
            const res = await fetch(`${API_BASE}/api/links/slug/${slug}`);
            if (res.ok) found = await res.json();
          } catch (_) {}

          if (!found) {
            try {
              const res = await fetch(`/api/links/slug/${slug}`);
              if (res.ok) found = await res.json();
            } catch (_) {}
          }
        }

        // Try local storage
        if (!found && slug) {
          try {
            const links = JSON.parse(localStorage.getItem('barley_gated_links') || '{}');
            if (links[slug]) found = links[slug];
          } catch (_) {}
        }

        // Fallback default demo pack if slug is generic or test
        if (!found) {
          found = {
            title: 'Wonciak 3 Pack',
            texturepack: 'https://www.mediafire.com/file/va02q6bwi23h7pi/wonciak+3.zip/file',
            socialLinks: [
              'https://www.youtube.com/@Barley69',
              'https://www.tiktok.com/@barley.47',
              'https://discord.gg/Wa9u6bVBgz'
            ]
          };
        }

        if (isMounted) setLinkData(found);
      } catch (err) {
        console.error('Error loading unlock link:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLink();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slug]);

  // Transform steps
  const steps = React.useMemo(() => {
    const rawLinks = linkData?.socialLinks || (linkData?.steps ? linkData.steps.map(s => s.url) : []);
    if (rawLinks.length > 0) {
      return rawLinks.map((url) => {
        const lower = url.toLowerCase();
        let type = 'discord';
        let title = t.unlock?.stepOther || 'Odwiedź stronę';
        if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
          type = 'youtube';
          title = t.unlock?.stepYoutube || 'Zasubskrybuj kanał';
        } else if (lower.includes('tiktok.com')) {
          type = 'tiktok';
          title = t.unlock?.stepTiktok || 'Zaobserwuj konto';
        } else if (lower.includes('discord.gg') || lower.includes('discord.com')) {
          type = 'discord';
          title = t.unlock?.stepDiscord || 'Dołącz na serwer';
        }
        return { type, url, title };
      });
    }

    return [
      {
        type: 'youtube',
        url: 'https://www.youtube.com/@Barley69',
        title: t.unlock?.stepYoutube || 'Zasubskrybuj kanał'
      },
      {
        type: 'tiktok',
        url: 'https://www.tiktok.com/@barley.47',
        title: t.unlock?.stepTiktok || 'Zaobserwuj konto'
      },
      {
        type: 'discord',
        url: 'https://discord.gg/Wa9u6bVBgz',
        title: t.unlock?.stepDiscord || 'Dołącz na serwer'
      }
    ];
  }, [linkData, t]);

  useEffect(() => {
    if (isWhitelisted) {
      setCompletedSteps(steps.length);
    }
  }, [isWhitelisted, steps.length]);

  const allCompleted = isWhitelisted || completedSteps >= steps.length;

  const handleStepClick = (index, url) => {
    if (isWhitelisted) return;
    if (index !== completedSteps || loadingIndex !== -1) return;

    window.open(url, '_blank');

    setLoadingIndex(index);
    setTimerRemaining(7);

    timerRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setLoadingIndex(-1);
          setCompletedSteps((curr) => {
            const next = curr + 1;
            if (next >= steps.length) {
              addToast('Wszystkie kroki wykonane! Pobieranie odblokowane.', 'success');
            } else {
              addToast('Krok zaliczony! Przejdź do kolejnego.', 'info');
            }
            return next;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDownload = () => {
    if (!allCompleted) {
      addToast('Musisz wykonać kroki aby pobrać texturepack', 'error');
      return;
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    addToast('Pobieranie rozpoczęte!', 'success');
    if (linkData?.texturepack) {
      setTimeout(() => {
        window.location.href = linkData.texturepack;
      }, 300);
    }
  };

  const renderIcon = (type) => {
    if (type === 'youtube') {
      return (
        <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}>
          <path d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z" />
        </svg>
      );
    }
    if (type === 'tiktok') {
      return (
        <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}>
          <path d="M544.5 273.9C500.5 274 457.5 260.3 421.7 234.7L421.7 413.4C421.7 446.5 411.6 478.8 392.7 506C373.8 533.2 347.1 554 316.1 565.6C285.1 577.2 251.3 579.1 219.2 570.9C187.1 562.7 158.3 545 136.5 520.1C114.7 495.2 101.2 464.1 97.5 431.2C93.8 398.3 100.4 365.1 116.1 336C131.8 306.9 156.1 283.3 185.7 268.3C215.3 253.3 248.6 247.8 281.4 252.3L281.4 342.2C266.4 337.5 250.3 337.6 235.4 342.6C220.5 347.6 207.5 357.2 198.4 369.9C189.3 382.6 184.4 398 184.5 413.8C184.6 429.6 189.7 444.8 199 457.5C208.3 470.2 221.4 479.6 236.4 484.4C251.4 489.2 267.5 489.2 282.4 484.3C297.3 479.4 310.4 469.9 319.6 457.2C328.8 444.5 333.8 429.1 333.8 413.4L333.8 64L421.8 64C421.7 71.4 422.4 78.9 423.7 86.2C426.8 102.5 433.1 118.1 442.4 131.9C451.7 145.7 463.7 157.5 477.6 166.5C497.5 179.6 520.8 186.6 544.6 186.6L544.6 274z" />
        </svg>
      );
    }
    return (
      <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}>
        <path d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="download-pack-loader" style={{ display: 'inline-block', width: '2rem', height: '2rem', borderColor: '#3b82f6', borderTopColor: 'transparent' }}></div>
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Wczytywanie zadania...</p>
      </div>
    );
  }

  return (
    <div className="download-container download-container-unlock">
      <div className="download-card" style={{ margin: 'auto' }}>
        {/* Header */}
        <div className="download-info">
          <div className="download-info-left">
            <img
              className="download-pack-icon"
              src="/assets/img/texturepack.png"
              alt="Ikonka Texturepacka"
              onError={(e) => { e.target.src = '/assets/img/favicon.png'; }}
            />
            <div className="download-pack-info">
              <div className="download-pack-title" id="download-pack-title">
                {linkData?.title || 'Texturepack Download'}
              </div>
            </div>
          </div>
        </div>

        {/* Separator Text */}
        <div className="download-separator-text">
          <span>{t.unlock?.subtitle || 'Wykonaj kroki poniżej'}</span>
        </div>

        {/* Steps */}
        <div className="download-steps visible">
          {steps.map((step, idx) => {
            const isDone = isWhitelisted || idx < completedSteps;
            const isLoading = idx === loadingIndex;
            const isDisabled = !isWhitelisted && (idx > completedSteps || (isLoading && idx !== loadingIndex));

            return (
              <a
                key={idx}
                href={step.url}
                target="_blank"
                rel="noreferrer"
                className={`download-step-button ${step.type}-button ${isDone ? 'done' : ''} ${isLoading ? 'loading' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleStepClick(idx, step.url);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  {renderIcon(step.type)}
                  <span>{step.title}</span>
                  {isLoading && timerRemaining > 0 && (
                    <span style={{ fontSize: '0.8125rem', opacity: 0.9, marginLeft: '0.25rem' }}>
                      ({timerRemaining}s)
                    </span>
                  )}
                </div>

                <svg className="download-pack-arrow" fill="currentColor" viewBox="0 0 320 512" height="1rem" width="1rem" xmlns="http://www.w3.org/2000/svg">
                  <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
                </svg>

                <span className="download-pack-loader"></span>

                <svg className="download-pack-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                  <path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z" />
                </svg>
              </a>
            );
          })}
        </div>

        <div className="download-separator"></div>

        {/* Download Button */}
        <button
          id="download-pack-button"
          type="button"
          className={`download-pack-button ${allCompleted ? 'unlocked' : ''}`}
          disabled={!allCompleted}
          onClick={handleDownload}
        >
          <svg className="download-pack-button-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" stroke="currentColor" d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12"></path>
          </svg>
          {t.unlock?.unlockButton || 'Pobierz'}
        </button>
      </div>
    </div>
  );
};
