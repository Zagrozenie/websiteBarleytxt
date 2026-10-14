import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  FileArchive,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Download,
  Sparkles
} from 'lucide-react';
import '../styles/converter.css';

export const ConverterPage = () => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [file, setFile] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [srcVer, setSrcVer] = useState('1.16.5');
  const [destVer, setDestVer] = useState('1.21');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [convertedFilename, setConvertedFilename] = useState('');

  const fileInputRef = useRef(null);

  const versionsList = [
    { value: '1.8.9', label: '1.8.9 (Format 1)', format: 1 },
    { value: '1.12.2', label: '1.12.2 (Format 3)', format: 3 },
    { value: '1.16.5', label: '1.16.5 (Format 6)', format: 6 },
    { value: '1.18.2', label: '1.18.2 (Format 8)', format: 8 },
    { value: '1.19.4', label: '1.19.4 (Format 13)', format: 13 },
    { value: '1.20', label: '1.20 (Format 15)', format: 15 },
    { value: '1.20.2', label: '1.20.2 (Format 18)', format: 18 },
    { value: '1.21', label: '1.21+ (Format 34)', format: 34 }
  ];

  const formatToVersionMap = {
    1: '1.8.9',
    2: '1.9',
    3: '1.12.2',
    4: '1.13',
    5: '1.15',
    6: '1.16.5',
    7: '1.17',
    8: '1.18.2',
    9: '1.19.2',
    12: '1.19.3',
    13: '1.19.4',
    15: '1.20',
    18: '1.20.2',
    22: '1.20.4',
    32: '1.20.6',
    34: '1.21'
  };

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      addToast(t.converter.errors.wrongFormat, 'error');
      return;
    }

    if (selectedFile.size > 200 * 1024 * 1024) {
      addToast(t.converter.errors.fileTooBig, 'error');
      return;
    }

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(selectedFile);

      let mcmetaFile = zipContent.file('pack.mcmeta');
      if (!mcmetaFile) {
        const found = zipContent.file(/pack\.mcmeta$/i);
        if (found.length > 0) mcmetaFile = found[0];
      }

      let detectedFormat = null;
      let detectedDesc = '';

      if (mcmetaFile) {
        try {
          const text = await mcmetaFile.async('string');
          const json = JSON.parse(text);
          detectedFormat = json?.pack?.pack_format;
          detectedDesc = typeof json?.pack?.description === 'string'
            ? json.pack.description
            : '';
        } catch (_) {}
      }

      let autoVersion = '1.16.5';
      if (detectedFormat && formatToVersionMap[detectedFormat]) {
        autoVersion = formatToVersionMap[detectedFormat];
      }

      setSrcVer(autoVersion);
      setFile(selectedFile);
      setFileDetails({
        name: selectedFile.name,
        sizeMb: (selectedFile.size / (1024 * 1024)).toFixed(2),
        format: detectedFormat,
        detectedVersion: autoVersion,
        description: detectedDesc
      });
      setConvertedBlob(null);

      addToast(`Wczytano "${selectedFile.name}"! Wykryto wersję: ${autoVersion}`, 'success');
    } catch (err) {
      addToast(t.converter.errors.corrupted + ': ' + err.message, 'error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      addToast(t.converter.errors.chooseFile, 'error');
      return;
    }

    if (srcVer === destVer) {
      addToast(t.converter.errors.cantSame, 'error');
      return;
    }

    setConverting(true);
    setProgress(15);

    try {
      // Try backend conversion first
      let success = false;
      let blobResult = null;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('srcVer', srcVer);
        formData.append('destVer', destVer);

        setProgress(40);
        const res = await fetch('/convert', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          blobResult = await res.blob();
          success = true;
          setProgress(100);
        }
      } catch (_) {}

      // Fallback: Client-side JSZip conversion
      if (!success) {
        setProgress(50);
        const zip = new JSZip();
        await zip.loadAsync(file);

        const targetFormatObj = versionsList.find((v) => v.value === destVer);
        const targetFormat = targetFormatObj ? targetFormatObj.format : 34;

        let mcmetaFile = zip.file('pack.mcmeta');
        if (!mcmetaFile) {
          const found = zip.file(/pack\.mcmeta$/i);
          if (found.length > 0) mcmetaFile = found[0];
        }

        if (mcmetaFile) {
          try {
            const raw = await mcmetaFile.async('string');
            const parsed = JSON.parse(raw);
            if (parsed.pack) {
              parsed.pack.pack_format = targetFormat;
            }
            zip.file(mcmetaFile.name, JSON.stringify(parsed, null, 2));
          } catch (_) {
            zip.file('pack.mcmeta', JSON.stringify({
              pack: {
                pack_format: targetFormat,
                description: `Converted to ${destVer} via BarleyTxT`
              }
            }, null, 2));
          }
        } else {
          zip.file('pack.mcmeta', JSON.stringify({
            pack: {
              pack_format: targetFormat,
              description: `Converted to ${destVer} via BarleyTxT`
            }
          }, null, 2));
        }

        setProgress(85);
        blobResult = await zip.generateAsync({ type: 'blob' });
        setProgress(100);
      }

      setConvertedBlob(blobResult);
      setConvertedFilename(`converted_${destVer}_${file.name}`);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      addToast(t.converter.successDesc, 'success');
    } catch (err) {
      addToast(t.converter.errors.corrupted + ': ' + err.message, 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadConverted = () => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast('Pobieranie rozpoczęte!', 'success');
  };

  return (
    <div className="converter-section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <div className="section-badge">
            <Repeat size={14} />
            <span>{t.converter.badge}</span>
          </div>
          <h1 className="section-title">
            {t.converter.title}
          </h1>
          <p className="section-subtitle">
            {t.converter.subtitle}
          </p>
        </div>

        <div className="converter-container">
          {/* Dropzone */}
          <div
            className={`dropzone-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".zip"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) processFile(e.target.files[0]);
              }}
            />

            <div className="dropzone-icon-box">
              <UploadCloud size={36} />
            </div>

            <h3 className="dropzone-title">{t.converter.dropTitle}</h3>
            <p className="dropzone-desc">{t.converter.dropSubtitle}</p>
          </div>

          {/* Selected File Details */}
          {fileDetails && (
            <div className="file-selected-box">
              <div className="file-info-group">
                <FileArchive size={28} color="#3b82f6" />
                <div>
                  <div className="file-name">{fileDetails.name}</div>
                  <div className="file-size">
                    {fileDetails.sizeMb} MB • Wykryto: <strong>{fileDetails.detectedVersion}</strong> (Format {fileDetails.format || '?'})
                  </div>
                </div>
              </div>

              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}
                onClick={() => {
                  setFile(null);
                  setFileDetails(null);
                  setConvertedBlob(null);
                }}
              >
                Zmień plik
              </button>
            </div>
          )}

          {/* Versions Selector */}
          <div className="versions-row">
            <div className="version-selector-group">
              <label className="version-label">{t.converter.sourceVer}:</label>
              <select
                className="custom-select"
                value={srcVer}
                onChange={(e) => setSrcVer(e.target.value)}
              >
                {versionsList.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="version-selector-group">
              <label className="version-label">{t.converter.targetVer}:</label>
              <select
                className="custom-select"
                value={destVer}
                onChange={(e) => setDestVer(e.target.value)}
              >
                {versionsList.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Convert Action Button */}
          {!convertedBlob && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
              onClick={handleConvert}
              disabled={converting || !file}
            >
              <Repeat size={20} className={converting ? 'rotate-anim' : ''} />
              <span>{converting ? t.converter.converting : t.converter.convertBtn}</span>
            </button>
          )}

          {/* Converting Animation */}
          {converting && (
            <div className="converting-status-box">
              <h3>{t.converter.converting}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {t.converter.convertingDesc}
              </p>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8' }}>
                {progress}%
              </span>
            </div>
          )}

          {/* Converted Success Action */}
          {convertedBlob && (
            <div className="converted-success-box">
              <div className="success-icon-box">
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>
                {t.converter.success}
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                {t.converter.successDesc} ({convertedFilename})
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadConverted}
                >
                  <Download size={18} />
                  <span>{t.converter.downloadConverted}</span>
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setFile(null);
                    setFileDetails(null);
                    setConvertedBlob(null);
                  }}
                >
                  {t.converter.convertAnother}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
