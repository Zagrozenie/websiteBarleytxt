import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Link2, Plus, Trash2, Copy, Check, Sparkles } from 'lucide-react';
import '../styles/create-link.css';

export const CreateLinkPage = () => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [texturepackUrl, setTexturepackUrl] = useState('');
  const [steps, setSteps] = useState([
    { type: 'youtube', url: 'https://youtube.com/@Barley69' },
    { type: 'discord', url: 'https://discord.gg/8q87J8GTNV' }
  ]);
  const [createdSlug, setCreatedSlug] = useState(null);
  const [generating, setGenerating] = useState(false);

  const addStep = (type) => {
    setSteps([...steps, { type, url: '' }]);
  };

  const removeStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStepUrl = (index, url) => {
    const updated = [...steps];
    updated[index].url = url;
    setSteps(updated);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !texturepackUrl.trim()) {
      addToast('Podaj tytuł oraz link do texturepacka!', 'error');
      return;
    }

    setGenerating(true);
    try {
      let slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim() || `link-${Date.now()}`;

      // Try backend endpoint
      try {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            texturepack: texturepackUrl,
            socialLinks: steps.map((s) => s.url).filter(Boolean)
          })
        });

        if (res.ok) {
          const data = await res.json();
          slug = data.slug || slug;
        }
      } catch (_) {}

      // Store in localStorage as backup
      const links = JSON.parse(localStorage.getItem('barley_gated_links') || '{}');
      links[slug] = {
        title,
        texturepack: texturepackUrl,
        steps
      };
      localStorage.setItem('barley_gated_links', JSON.stringify(links));

      setCreatedSlug(slug);
      addToast('Link został pomyślnie wygenerowany!', 'success');
    } catch (err) {
      addToast('Błąd generowania linku: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const fullUrl = createdSlug ? `${window.location.origin}/?unlock=${createdSlug}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    addToast(t.createLink.copied, 'success');
  };

  return (
    <div className="create-link-section">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">
            <Link2 size={14} />
            <span>{t.createLink.badge}</span>
          </div>
          <h1 className="section-title">
            {t.createLink.title}
          </h1>
          <p className="section-subtitle">
            {t.createLink.subtitle}
          </p>
        </div>

        <div className="form-container-card">
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">{t.createLink.packTitle}:</label>
              <input
                type="text"
                className="form-input"
                placeholder="np. Wonciak Pack 1.21"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.createLink.packUrl}:</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://www.mediafire.com/file/..."
                value={texturepackUrl}
                onChange={(e) => setTexturepackUrl(e.target.value)}
                required
              />
            </div>

            {/* Steps Builder */}
            <div className="steps-builder">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">{t.createLink.addStep}:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => addStep('youtube')}
                  >
                    + YouTube
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => addStep('discord')}
                  >
                    + Discord
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => addStep('tiktok')}
                  >
                    + TikTok
                  </button>
                </div>
              </div>

              <div className="steps-list">
                {steps.map((step, idx) => (
                  <div key={idx} className="step-item-row">
                    <span className="step-type-badge">
                      {step.type.toUpperCase()}
                    </span>
                    <input
                      type="url"
                      className="form-input"
                      style={{ flex: 1, padding: '0.5rem 0.75rem' }}
                      placeholder={`Link do ${step.type}...`}
                      value={step.url}
                      onChange={(e) => updateStepUrl(idx, e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="remove-step-btn"
                      onClick={() => removeStep(idx)}
                      aria-label="Usuń krok"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
              disabled={generating}
            >
              <Sparkles size={18} />
              <span>{t.createLink.generateBtn}</span>
            </button>
          </form>

          {/* Generated Link Result */}
          {createdSlug && (
            <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ color: '#34d399', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={18} /> {t.createLink.linkReady}
              </h4>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }}
                  value={fullUrl}
                />
                <button className="btn btn-primary" onClick={copyToClipboard}>
                  <Copy size={16} />
                  <span>{t.createLink.copyLink}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
