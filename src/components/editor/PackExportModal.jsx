import React, { useState, useRef } from 'react';
import {
  MINECRAFT_VERSIONS,
  TextureEditorService
} from '../../services/TextureEditorService';
import {
  Download,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  Upload,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '../../context/ToastContext';

export const PackExportModal = ({
  zipData,
  defaultPackName = 'Custom_Pack',
  defaultDescription = 'Paczka stworzona za pomocą BarleyTxT Texture Editor',
  defaultIcon = null,
  modifiedCount = 0,
  onClose
}) => {
  const { addToast } = useToast();

  const [selectedVersion, setSelectedVersion] = useState('1.21+');
  const [packName, setPackName] = useState(defaultPackName.replace(/\.zip$/i, ''));
  const [packDescription, setPackDescription] = useState(defaultDescription);
  const [packIcon, setPackIcon] = useState(defaultIcon || '/assets/img/favicon.png');
  const [customIconDataUrl, setCustomIconDataUrl] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('');

  const iconInputRef = useRef(null);

  const selectedVersionObj = MINECRAFT_VERSIONS.find((v) => v.version === selectedVersion) || MINECRAFT_VERSIONS[7];

  const handleCustomIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      addToast('Ikona pack.png musi być w formacie PNG!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setPackIcon(b64);
      setCustomIconDataUrl(b64);
      addToast('Załadowano nową ikonę paczki!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Skladanie i eksport paczki dla wybranej wersji gry
  const handleExport = async () => {
    if (!zipData) {
      addToast('Brak danych paczki zasobów do spakowania!', 'error');
      return;
    }

    setExporting(true);
    setExportProgress(20);

    try {
      setExportProgress(45);

      // TextureEditorService ogarnia caly burdel z pack_format i folderami item/ vs items/
      const result = await TextureEditorService.exportPack(zipData, {
        targetFormat: selectedVersionObj.format,
        targetVersion: selectedVersionObj.version,
        packName: packName.trim() || 'Barley_Custom_Pack',
        description: packDescription.trim(),
        iconDataUrl: customIconDataUrl
      });

      setExportProgress(85);

      // Tworzymy blob URL i od razu odpalamy download zeby user nie musial klikac drugi raz
      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setDownloadFilename(result.filename);
      setExportProgress(100);
      setExportSuccess(true);

      // Konfetti na sukces - niech user ma troche radosci
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      addToast(`Paczka dla Minecraft ${selectedVersion} została pomyślnie złożona!`, 'success');

      // Automatyczne pobranie pliku
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      addToast('Błąd składania paczki: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pack-export-overlay">
      <div className="pack-export-modal">
        {/* Header */}
        <div className="pack-export-header">
          <div className="pack-export-title-row">
            <div className="pack-export-icon-wrap">
              <FileArchive size={24} color="#38bdf8" />
            </div>
            <div>
              <h3 className="pack-export-title">Pobierz Paczkę Zasobów</h3>
              <p className="pack-export-subtitle">
                Wybierz wersję Minecraft — strona automatycznie dopasuje strukturę folderów i pack.mcmeta
              </p>
            </div>
          </div>

          <button
            type="button"
            className="pack-export-close-btn"
            onClick={onClose}
            title="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="pack-export-body">
          {/* Modified Textures Indicator */}
          {modifiedCount > 0 && (
            <div className="pack-export-mod-alert">
              <Sparkles size={16} />
              <span>
                Paczka zawiera <strong>{modifiedCount}</strong> edytowanych tekstur pixel art!
              </span>
            </div>
          )}

          {/* Minecraft Version Selector */}
          <div className="pack-export-section">
            <label className="pack-export-label">
              <span>Wybierz wersję docelową Minecraft:</span>
              <span className="pack-export-format-tag">
                Format: {selectedVersionObj.format}
              </span>
            </label>

            <div className="pack-export-versions-grid">
              {MINECRAFT_VERSIONS.map((ver) => {
                const isSelected = selectedVersion === ver.version;
                return (
                  <button
                    key={ver.version}
                    type="button"
                    className={`pack-version-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedVersion(ver.version)}
                  >
                    <div className="pack-version-top">
                      <span className="pack-version-num">{ver.name}</span>
                      <span className="pack-version-tag">{ver.tag}</span>
                    </div>
                    <p className="pack-version-desc">{ver.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metadata Customization */}
          <div className="pack-export-section">
            <label className="pack-export-label">Konfiguracja paczki:</label>

            <div className="pack-export-meta-row">
              {/* Pack Icon & Upload */}
              <div className="pack-export-icon-col">
                <div
                  className="pack-export-icon-preview"
                  onClick={() => iconInputRef.current?.click()}
                  title="Kliknij, aby zmienić ikonę pack.png"
                >
                  <img
                    src={packIcon}
                    alt="Pack Icon"
                    onError={(e) => { e.target.src = '/assets/img/favicon.png'; }}
                  />
                  <div className="pack-export-icon-overlay">
                    <Upload size={16} />
                    <span>Zmień</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={iconInputRef}
                  accept=".png"
                  style={{ display: 'none' }}
                  onChange={handleCustomIconUpload}
                />
                <span className="pack-export-icon-hint">pack.png</span>
              </div>

              {/* Pack Name & Description */}
              <div className="pack-export-inputs-col">
                <div className="pack-input-group">
                  <span className="pack-input-label">Nazwa pliku paczki:</span>
                  <div className="pack-input-wrap">
                    <input
                      type="text"
                      className="pack-text-input"
                      value={packName}
                      onChange={(e) => setPackName(e.target.value)}
                      placeholder="Nazwa_Paczki"
                    />
                    <span className="pack-input-suffix">.zip</span>
                  </div>
                </div>

                <div className="pack-input-group">
                  <span className="pack-input-label">Opis (pack.mcmeta):</span>
                  <input
                    type="text"
                    className="pack-text-input"
                    value={packDescription}
                    onChange={(e) => setPackDescription(e.target.value)}
                    placeholder="Opis wyświetlany w menu gry Minecraft"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Compatibility Notice */}
          <div className="pack-export-info-box">
            <Info size={16} flexShrink={0} />
            <p>
              {selectedVersionObj.format <= 3 ? (
                <>
                  Dla wybranej wersji <strong>{selectedVersion}</strong> strona automatycznie utworzy foldery{' '}
                  <code>textures/items/</code> oraz <code>textures/blocks/</code> (liczba mnoga wymagana przez Minecraft 1.8 - 1.12).
                </>
              ) : (
                <>
                  Dla wybranej wersji <strong>{selectedVersion}</strong> strona zapisze plik{' '}
                  <code>pack.mcmeta</code> z formatem <strong>{selectedVersionObj.format}</strong> oraz ścieżkami{' '}
                  <code>item/</code> i <code>block/</code>.
                </>
              )}
            </p>
          </div>

          {/* Progress / Success */}
          {exporting && (
            <div className="pack-export-progress-wrap">
              <div className="pack-export-progress-bar">
                <div
                  className="pack-export-progress-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="pack-export-progress-text">
                <Loader2 size={16} className="spin-animate" />
                <span>Składanie i kompresja paczki ({exportProgress}%)...</span>
              </div>
            </div>
          )}

          {exportSuccess && downloadUrl && (
            <div className="pack-export-success-wrap">
              <CheckCircle2 size={24} color="#10b981" />
              <div>
                <strong>Paczka gotowa do gry!</strong>
                <p>Plik {downloadFilename} został przygotowany.</p>
              </div>
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="pack-download-again-btn"
              >
                <Download size={15} />
                <span>Pobierz ponownie</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pack-export-footer">
          <button
            type="button"
            className="pack-btn-cancel"
            onClick={onClose}
          >
            Zamknij
          </button>

          <button
            type="button"
            className="pack-btn-submit"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="spin-animate" />
                <span>Składanie paczki...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Pobierz dla MC {selectedVersion}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
