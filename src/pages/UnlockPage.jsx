import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';
import {
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  Download,
  Clock,
  ShieldCheck
} from 'lucide-react';
import '../styles/create-link.css';

export const UnlockPage = ({ slug, setCurrentView }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState({});
  const [timers, setTimers] = useState({});
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  useEffect(() => {
    // Check whitelist bypass
    fetch('/api/check-whitelist')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.whitelisted) setIsWhitelisted(true);
      })
      .catch(() => {});

    async function loadLink() {
      setLoading(true);
      try {
        let found = null;

        // Try API
        if (slug) {
          try {
            const res = await fetch(`/api/links/slug/${slug}`);
            if (res.ok) {
              found = await res.json();
            }
          } catch (_) {}
        }

        // Try local storage
        if (!found && slug) {
          const links = JSON.parse(localStorage.getItem('barley_gated_links') || '{}');
          if (links[slug]) found = links[slug];
        }

        // Fallback default demo pack if slug is generic or test
        if (!found) {
          found = {
            title: 'Wonciak 3 Pack',
            texturepack: 'https://www.mediafire.com/file/va02q6bwi23h7pi/wonciak+3.zip/file',
            socialLinks: [
              'https://www.youtube.com/@Barley69',
              'https://discord.gg/8q87J8GTNV'
            ]
          };
        }

        setLinkData(found);
      } catch (err) {
        console.error('Error loading unlock link:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLink();
  }, [slug]);

  const socialLinks = linkData?.socialLinks || (linkData?.steps ? linkData.steps.map(s => s.url) : []);

  const handleStepClick = (index, url) => {
    if (completedSteps[index]) return;

    // Open target link
    window.open(url, '_blank');

    // Start 6s verification timer
    setTimers((prev) => ({ ...prev, [index]: 6 }));
    const timerInterval = setInterval(() => {
      setTimers((prev) => {
        const current = prev[index];
        if (current <= 1) {
          clearInterval(timerInterval);
          setCompletedSteps((c) => ({ ...c, [index]: true }));
          addToast('Krok zaliczony!', 'success');
          return { ...prev, [index]: 0 };
        }
        return { ...prev, [index]: current - 1 };
      });
    }, 1000);
  };

  const allCompleted = isWhitelisted || (
    socialLinks.length > 0 &&
    socialLinks.every((_, i) => completedSteps[i])
  );

  const handleDownload = () => {
    if (!allCompleted) return;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    addToast('Pobieranie odblokowane!', 'success');
    if (linkData?.texturepack) {
      window.location.href = linkData.texturepack;
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Wczytywanie zadania...</p>
      </div>
    );
  }

  return (
    <div className="unlock-section">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">
            {allCompleted ? <Unlock size={14} color="#34d399" /> : <Lock size={14} color="#f59e0b" />}
            <span>{t.unlock.title}</span>
          </div>
          <h1 className="section-title">
            {linkData?.title || 'Texturepack Download'}
          </h1>
          <p className="section-subtitle">
            {t.unlock.subtitle}
          </p>
        </div>

        <div className="form-container-card" style={{ maxWidth: 540 }}>
          {isWhitelisted && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontSize: '0.875rem' }}>
              <ShieldCheck size={18} />
              <span>Jesteś administratorem/whitelisted – kroki zostały pominięte!</span>
            </div>
          )}

          <div className="unlock-steps-grid">
            {socialLinks.map((url, idx) => {
              const isDone = completedSteps[idx] || isWhitelisted;
              const timerVal = timers[idx] || 0;

              let label = 'Odwiedź stronę';
              if (url.includes('youtube') || url.includes('youtu.be')) label = t.unlock.stepYoutube;
              else if (url.includes('discord')) label = t.unlock.stepDiscord;
              else if (url.includes('tiktok')) label = t.unlock.stepTiktok;

              return (
                <button
                  key={idx}
                  className={`unlock-step-btn ${isDone ? 'done' : ''}`}
                  onClick={() => handleStepClick(idx, url)}
                  disabled={isDone || timerVal > 0}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 700 }}>#{idx + 1}</span>
                    <span>{label}</span>
                  </span>

                  <span className="step-status-indicator">
                    {isDone ? (
                      <>
                        <CheckCircle2 size={18} color="#34d399" />
                        <span>{t.unlock.completed}</span>
                      </>
                    ) : timerVal > 0 ? (
                      <>
                        <Clock size={16} />
                        <span>{timerVal}s</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink size={16} />
                        <span>Przejdź</span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Download Action */}
          <button
            className={`btn ${allCompleted ? 'btn-primary' : 'btn-outline'}`}
            style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
            onClick={handleDownload}
            disabled={!allCompleted}
          >
            {allCompleted ? <Unlock size={18} /> : <Lock size={18} />}
            <span>{t.unlock.unlockButton}</span>
          </button>

          {!allCompleted && (
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-dim)', marginTop: '0.75rem' }}>
              {t.unlock.lockedNotice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
