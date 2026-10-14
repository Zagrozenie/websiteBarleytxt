import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePacks } from '../context/PacksContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import {
  Shield,
  UploadCloud,
  FileArchive,
  CheckCircle2,
  Trash2,
  Edit3,
  Download,
  Upload,
  Search,
  LogOut,
  Sparkles,
  BarChart2,
  Layers,
  Image as ImageIcon,
  Key,
  X,
  Eye,
  EyeOff,
  Globe,
  AlertCircle,
  Box
} from 'lucide-react';
import '../styles/admin.css';
import { ReviewModule } from '../components/admin/review/ReviewModule';

export const AdminPage = ({ setCurrentView }) => {
  const { t } = useLanguage();
  const {
    packs,
    addPack,
    updatePack,
    deletePack,
    exportPacks,
    importPacks,
    totalDownloads,
    setActivePack
  } = usePacks();
  const { isAuthenticated, login, logout, adminToken } = useAuth();
  const { addToast } = useToast();

  const handleLogout = () => {
    logout();
    if (setCurrentView) setCurrentView('home');
    if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState({}, '', '/');
    }
  };

  // Login form state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin tabs: 'uploader' | 'manage' | 'stats'
  const [activeTab, setActiveTab] = useState('uploader');

  // Uploader State
  const [dragActive, setDragActive] = useState(false);
  const [analyzingZip, setAnalyzingZip] = useState(false);
  const [uploadedZipFile, setUploadedZipFile] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [packName, setPackName] = useState('');
  const [packAuthor, setPackAuthor] = useState('');
  const [packCategory, setPackCategory] = useState('pvp');
  const [packVersion, setPackVersion] = useState('1.20+');
  const [packDownload, setPackDownload] = useState('');
  const [packImage, setPackImage] = useState('/assets/img/texturepack.png');
  const [packIcon, setPackIcon] = useState('/assets/img/favicon.png');
  const [packDescription, setPackDescription] = useState('');
  const [extractedInfo, setExtractedInfo] = useState(null);

  // Manage Packs state
  const [manageSearch, setManageSearch] = useState('');
  const [managerCategory, setManagerCategory] = useState('all');
  const [editingPack, setEditingPack] = useState(null);

  const fileInputRef = useRef(null);
  const jsonImportRef = useRef(null);

  const formatToVersionMap = {
    1: '1.8.9+',
    2: '1.9+',
    3: '1.12.2+',
    4: '1.13+',
    5: '1.15+',
    6: '1.16.5+',
    7: '1.17+',
    8: '1.18.2+',
    9: '1.19.2+',
    12: '1.19.3+',
    13: '1.19.4+',
    15: '1.20+',
    18: '1.20.2+',
    22: '1.20.4+',
    32: '1.20.6+',
    34: '1.21+'
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await login(password);
      if (res.success) {
        addToast('Zalogowano do panelu administratora!', 'success');
        setPassword('');
      } else {
        setLoginError(res.error || 'Nieprawidłowe hasło administratora');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Inspect uploaded Minecraft pack zip
  const inspectZip = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.zip')) {
      addToast('Wybierz plik z rozszerzeniem .zip', 'error');
      return;
    }

    setAnalyzingZip(true);
    setUploadedZipFile(file);

    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(file);

      // 1. Find pack.mcmeta
      let mcmetaFile = zipData.file('pack.mcmeta');
      if (!mcmetaFile) {
        const found = zipData.file(/pack\.mcmeta$/i);
        if (found.length > 0) mcmetaFile = found[0];
      }

      let format = null;
      let desc = '';
      if (mcmetaFile) {
        try {
          const raw = await mcmetaFile.async('string');
          const json = JSON.parse(raw);
          format = json?.pack?.pack_format;
          desc = typeof json?.pack?.description === 'string'
            ? json.pack.description
            : (typeof json?.pack?.description === 'object' ? JSON.stringify(json.pack.description) : '');
        } catch (_) { }
      }

      // 2. Find pack.png icon
      let iconFile = zipData.file('pack.png');
      if (!iconFile) {
        const foundIcon = zipData.file(/pack\.png$/i);
        if (foundIcon.length > 0) iconFile = foundIcon[0];
      }

      let iconDataUrl = '/assets/img/favicon.png';
      if (iconFile) {
        try {
          const iconBlob = await iconFile.async('blob');
          iconDataUrl = URL.createObjectURL(iconBlob);
        } catch (_) { }
      }

      // Clean name from filename
      const cleanName = file.name
        .replace(/\.zip$/i, '')
        .replace(/[^\w\s-]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      const detectedVer = format && formatToVersionMap[format]
        ? formatToVersionMap[format]
        : (format ? `Format ${format}` : '1.20+');

      setPackName(cleanName || 'Nowa Paczka');
      setPackVersion(detectedVer);
      setPackDescription(desc);
      setPackIcon(iconDataUrl);
      if (!packAuthor) setPackAuthor('Barley');

      setExtractedInfo({
        filename: file.name,
        sizeMb: (file.size / (1024 * 1024)).toFixed(2),
        format: format || 'Brak',
        detectedVer,
        hasIcon: !!iconFile
      });

      addToast(`Paczka "${file.name}" przeanalizowana pomyślnie!`, 'success');
    } catch (err) {
      addToast('Błąd odczytu archiwum .zip: ' + err.message, 'error');
    } finally {
      setAnalyzingZip(false);
    }
  };

  const handlePublishPack = async (e) => {
    e.preventDefault();
    if (!packName.trim() || !packDownload.trim()) {
      addToast('Podaj nazwę paczki oraz link do pobrania!', 'error');
      return;
    }

    const newPack = {
      name: packName.trim(),
      author: (packAuthor || 'Nieznany').trim(),
      category: packCategory.toLowerCase().trim(),
      version: packVersion.trim(),
      download: packDownload.trim(),
      image: packImage || '/assets/img/texturepack.png',
      icon: packIcon || '/assets/img/favicon.png'
    };

    const res = await addPack(newPack);
    if (res.success) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Reset form
      setPackName('');
      setPackDownload('');
      setPackDescription('');
      setExtractedInfo(null);
      setUploadedZipFile(null);

      // Offer to view pack
      setActivePack(res.pack);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingPack) return;

    await updatePack(editingPack.id, editingPack);
    setEditingPack(null);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Czy na pewno chcesz usunąć paczkę "${name}"?`)) {
      deletePack(id);
    }
  };

  const handleJsonImportChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (Array.isArray(json)) {
          importPacks(json);
        } else {
          addToast('Nieprawidłowy format pliku JSON', 'error');
        }
      } catch (err) {
        addToast('Błąd parsowania JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="admin-section">
        <div className="admin-ambient-glow" />
        <div className="admin-login-wrapper">
          <div className="admin-login-card">
            <div className="admin-lock-icon">
              <Key size={32} />
            </div>
            <h2 className="admin-login-title">
              {t.admin.loginTitle}
            </h2>
            <p className="admin-login-desc">
              {t.admin.loginSubtitle}
            </p>

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder={t.admin.pinPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="login-error-alert">
                  <AlertCircle size={18} flexShrink={0} />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.95rem' }}
                disabled={isLoggingIn}
              >
                <Shield size={18} />
                <span>{isLoggingIn ? 'Logowanie...' : t.admin.loginBtn}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Filtered packs in manager tab
  const managedPacks = packs.filter((p) => {
    // Category filter
    if (managerCategory !== 'all') {
      const pCat = (p.category || '').toLowerCase();
      if (pCat !== managerCategory) return false;
    }

    // Search query
    if (!manageSearch.trim()) return true;
    const q = manageSearch.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.author || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const getCategoryClass = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('pvp') && !cat.includes('box')) return 'category-pvp';
    if (cat.includes('box')) return 'category-boxpvp';
    if (cat.includes('overlay')) return 'category-overlay';
    if (cat.includes('survival')) return 'category-survival';
    return 'category-default';
  };

  return (
    <div className="admin-section">
      <div className="admin-ambient-glow" />

      {/* Top Header */}
      <div className="admin-header-row">
        <div className="admin-header-info">
          <div className="admin-header-title-wrap">
            <h1 className="admin-header-title">
              {t.admin.title}
            </h1>
            <span className="admin-status-pill">
              <span className="admin-status-dot" />
              Panel aktywny
            </span>
          </div>
          <p className="admin-header-subtitle">
            Zarządzaj texturepackami i statystykami platformy BarleyTxT
          </p>
        </div>

        <div className="admin-header-actions">
          <div className="admin-tabs">
            <button
              className={`admin-tab-btn ${activeTab === 'uploader' ? 'active' : ''}`}
              onClick={() => setActiveTab('uploader')}
            >
              <UploadCloud size={16} />
              <span>{t.admin.tabUploader}</span>
            </button>

            <button
              className={`admin-tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              <Layers size={16} />
              <span>{t.admin.tabManage}</span>
              <span className="admin-tab-badge">{packs.length}</span>
            </button>

            <button
              className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart2 size={16} />
              <span>{t.admin.tabStats}</span>
            </button>
          </div>

          {/* Quick link to 3D Review Module */}
          <button
            className="btn btn-outline"
            onClick={() => setShowReviewModal(true)}
            title="Otwórz moduł Review 3D WebGL"
            style={{
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Box size={16} />
            <span>Review 3D</span>
          </button>

          {/* Quick link to preview website */}
          <button
            className="btn btn-outline"
            onClick={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="Przejdź do strony głównej"
          >
            <Globe size={16} />
            <span>Strona</span>
          </button>

          <button className="btn btn-danger" onClick={handleLogout} title="Wyloguj">
            <LogOut size={16} />
            <span>{t.admin.logoutBtn}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOADER PACZEK */}
      {activeTab === 'uploader' && (
        <div className="uploader-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              {t.admin.uploader.title}
            </h2>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9375rem' }}>
              {t.admin.uploader.subtitle}
            </p>
          </div>

          {/* Drag & Drop Zip Zone */}
          <div
            className={`uploader-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.length) inspectZip(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".zip"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) inspectZip(e.target.files[0]);
              }}
            />

            <div className="uploader-icon-glow">
              <UploadCloud size={38} />
            </div>

            <h3 className="uploader-title">
              {t.admin.uploader.dropZip}
            </h3>
            <p className="uploader-hint">
              {analyzingZip ? t.admin.uploader.analyzing : t.admin.uploader.dropHint}
            </p>
          </div>

          {/* Quick Demo Test Action */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-0.75rem', marginBottom: '1.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.82rem',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch('/sample-review-pack.zip');
                  if (!res.ok) throw new Error('Błąd pobierania paczki');
                  const blob = await res.blob();
                  const file = new File([blob], 'sample-review-pack.zip', { type: 'application/zip' });
                  inspectZip(file);
                } catch (err) {
                  addToast('Nie udało się załadować paczki demo: ' + err.message, 'error');
                }
              }}
            >
              <Sparkles size={15} />
              <span>Załaduj przykładową paczkę demo (.zip)</span>
            </button>

            <a
              href="/sample-review-pack.zip"
              download="sample-review-pack.zip"
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                color: '#8b949e',
                textDecoration: 'none'
              }}
            >
              <Download size={14} />
              <span>Pobierz paczkę testową</span>
            </a>
          </div>

          {/* Extracted Details Card */}
          {extractedInfo && (
            <div className="inspection-card">
              <img
                src={packIcon}
                alt="Pack Icon"
                className="extracted-icon-preview"
                onError={(e) => { e.target.src = '/assets/img/favicon.png'; }}
              />
              <div className="inspection-details">
                <div className="inspection-title">{packName}</div>
                <div className="inspection-meta">
                  <span className="inspection-badge">Plik: <strong>{extractedInfo.filename}</strong></span>
                  <span className="inspection-badge">Rozmiar: <strong>{extractedInfo.sizeMb} MB</strong></span>
                  <span className="inspection-badge">Wykryty format: <strong>Format {extractedInfo.format}</strong></span>
                  <span className="inspection-badge">Wersja MC: <strong>{extractedInfo.detectedVer}</strong></span>
                </div>
                {packDescription && (
                  <div className="inspection-quote">
                    "{packDescription}"
                  </div>
                )}
                <div style={{ marginTop: '0.9rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                      color: '#ffffff',
                      fontWeight: 600,
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowReviewModal(true)}
                  >
                    <Box size={18} />
                    <span>Inspekcja 3D & Review Paczki (Modele, Zbroje, Tekstury)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pack Metadata Form */}
          <form onSubmit={handlePublishPack}>
            <div className="uploader-form-grid">
              <div className="form-group">
                <label className="form-label">{t.admin.uploader.packName}:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="np. Dark Wonciak Pack"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.admin.uploader.author}:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="np. Barley, Wonciak"
                  value={packAuthor}
                  onChange={(e) => setPackAuthor(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.admin.uploader.category}:</label>
                <select
                  className="custom-select"
                  value={packCategory}
                  onChange={(e) => setPackCategory(e.target.value)}
                >
                  <option value="pvp">PvP</option>
                  <option value="boxpvp">BoxPvP</option>
                  <option value="overlay">Overlay</option>
                  <option value="survival">Survival</option>
                  <option value="inne">Inne</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t.admin.uploader.version}:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="np. 1.20.2+, 1.21+, 1.8.9+"
                  value={packVersion}
                  onChange={(e) => setPackVersion(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full-col">
                <label className="form-label">
                  <span>{t.admin.uploader.downloadUrl}:</span>
                  <span className="form-label-hint">Mediafire, Google Drive, Mega itp.</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://www.mediafire.com/file/..."
                  value={packDownload}
                  onChange={(e) => setPackDownload(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ścieżka lub URL tła (podgląd):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="/assets/img/texturepack.png"
                  value={packImage}
                  onChange={(e) => setPackImage(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ścieżka lub URL ikony:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="/assets/img/favicon.png"
                  value={packIcon}
                  onChange={(e) => setPackIcon(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '1.15rem', marginTop: '2rem', fontSize: '1.05rem' }}
            >
              <Sparkles size={20} />
              <span>{t.admin.uploader.publishBtn}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: ZARZĄDZAJ PACZKAMI */}
      {activeTab === 'manage' && (
        <div>
          <div className="manager-toolbar">
            <div className="search-input-wrapper" style={{ maxWidth: 360 }}>
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={t.admin.manage.searchPacks}
                value={manageSearch}
                onChange={(e) => setManageSearch(e.target.value)}
              />
              {manageSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setManageSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Category filter pills */}
            <div className="manager-filters">
              {[
                { id: 'all', label: 'Wszystkie' },
                { id: 'pvp', label: 'PvP' },
                { id: 'boxpvp', label: 'BoxPvP' },
                { id: 'overlay', label: 'Overlay' },
                { id: 'survival', label: 'Survival' },
                { id: 'inne', label: 'Inne' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-pill ${managerCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setManagerCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
                {t.admin.manage.total} <strong>{packs.length}</strong>
              </span>

              <button className="btn btn-outline" onClick={exportPacks} title="Eksportuj do JSON">
                <Download size={16} />
                <span>{t.admin.manage.exportJson}</span>
              </button>

              <button
                className="btn btn-outline"
                onClick={() => jsonImportRef.current?.click()}
                title="Importuj z pliku JSON"
              >
                <Upload size={16} />
                <span>{t.admin.manage.importJson}</span>
              </button>
              <input
                type="file"
                ref={jsonImportRef}
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleJsonImportChange}
              />
            </div>
          </div>

          <div className="manager-table-wrapper">
            <table className="manager-table">
              <thead>
                <tr>
                  <th>Paczka</th>
                  <th>Autor</th>
                  <th>Wersja</th>
                  <th>Kategoria</th>
                  <th style={{ textAlign: 'right' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {managedPacks.slice(0, 50).map((pack) => (
                  <tr key={pack.id}>
                    <td>
                      <div className="table-pack-info">
                        <img
                          src={pack.icon || '/assets/img/favicon.png'}
                          alt={pack.name}
                          className="table-pack-thumb"
                          onError={(e) => { e.target.src = '/assets/img/favicon.png'; }}
                        />
                        <div>
                          <span className="table-pack-name">{pack.name}</span>
                          <span className="table-pack-id">{pack.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{pack.author}</span>
                    </td>
                    <td>
                      <span className="pack-version-badge">
                        {pack.version}
                      </span>
                    </td>
                    <td>
                      <span className={`pack-category-pill ${getCategoryClass(pack.category)}`}>
                        {pack.category}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="action-btn action-btn-edit"
                          onClick={() => setEditingPack({ ...pack })}
                          title="Edytuj paczkę"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-btn-delete"
                          onClick={() => handleDelete(pack.id, pack.name)}
                          title="Usuń paczkę"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {managedPacks.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--admin-text-muted)' }}>
                      Nie znaleziono paczek spełniających kryteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {managedPacks.length > 50 && (
            <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--admin-text-dim)', fontSize: '0.8125rem' }}>
              Wyświetlono pierwszych 50 z {managedPacks.length} pasujących paczek. Użyj wyszukiwarki, aby zawęzić wyniki.
            </p>
          )}
        </div>
      )}

      {/* TAB 3: STATYSTYKI */}
      {activeTab === 'stats' && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <FileArchive size={30} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{packs.length}</span>
              <span className="stat-label">Wszystkich Paczek w Bazie</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Download size={30} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalDownloads.toLocaleString()}</span>
              <span className="stat-label">Łącznych Pobrań</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Layers size={30} />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {packs.filter((p) => (p.category || '').toLowerCase() === 'pvp').length}
              </span>
              <span className="stat-label">Paczek PvP</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Layers size={30} />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {packs.filter((p) => (p.category || '').toLowerCase() === 'boxpvp').length}
              </span>
              <span className="stat-label">Paczek BoxPvP</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pack Modal */}
      {editingPack && (
        <div className="modal-backdrop" onClick={() => setEditingPack(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Edycja Paczki: {editingPack.name}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingPack(null)}
                aria-label="Zamknij"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-content-pad">
              <form onSubmit={handleEditSave}>
                <div className="form-group">
                  <label className="form-label">Nazwa paczki:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingPack.name}
                    onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                    required
                  />
                </div>

                <div className="uploader-form-grid">
                  <div className="form-group">
                    <label className="form-label">Autor:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingPack.author}
                      onChange={(e) => setEditingPack({ ...editingPack, author: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Wersja:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingPack.version}
                      onChange={(e) => setEditingPack({ ...editingPack, version: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Kategoria:</label>
                  <select
                    className="custom-select"
                    value={editingPack.category}
                    onChange={(e) => setEditingPack({ ...editingPack, category: e.target.value })}
                  >
                    <option value="pvp">PvP</option>
                    <option value="boxpvp">BoxPvP</option>
                    <option value="overlay">Overlay</option>
                    <option value="survival">Survival</option>
                    <option value="inne">Inne</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Link do pobrania:</label>
                  <input
                    type="url"
                    className="form-input"
                    value={editingPack.download}
                    onChange={(e) => setEditingPack({ ...editingPack, download: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL podglądu tła:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingPack.image || ''}
                    onChange={(e) => setEditingPack({ ...editingPack, image: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL ikony:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingPack.icon || ''}
                    onChange={(e) => setEditingPack({ ...editingPack, icon: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.95rem' }}>
                    {t.admin.manage.saveChanges}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setEditingPack(null)}
                    style={{ padding: '0.95rem 1.5rem' }}
                  >
                    {t.admin.manage.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Minecraft Resource Pack Review Module Modal */}
      {showReviewModal && (
        <ReviewModule
          zipFile={uploadedZipFile}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};
