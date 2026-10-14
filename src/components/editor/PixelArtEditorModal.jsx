import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PixelArtCanvas } from './PixelArtCanvas';
import {
  TextureEditorService,
  MINECRAFT_PRESET_PALETTES
} from '../../services/TextureEditorService';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Sun,
  Moon,
  Grid,
  Hand,
  Undo2,
  Redo2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Check,
  X,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Layers,
  Palette,
  Eye,
  Info
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const PixelArtEditorModal = ({
  asset,
  zipData,
  onSaveToPack,
  onClose
}) => {
  const { addToast } = useToast();

  // Wymiary canvasa i dane zaladowanej tekstury
  const [textureUrl, setTextureUrl] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [currentCanvasUrl, setCurrentCanvasUrl] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 16, height: 16 });
  const [loading, setLoading] = useState(true);

  // Stan narzedzi - aktywne narzedzie i jego opcje
  const [activeTool, setActiveTool] = useState('pencil'); // 'pencil' | 'eraser' | 'bucket' | 'eyedropper' | 'line' | 'rectangle' | 'circle' | 'lighten' | 'darken' | 'dither' | 'replace' | 'pan'
  const [brushSize, setBrushSize] = useState(1);
  const [shapeFill, setShapeFill] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Zoom i przesuniecie widoku - zoom scrollem, pan srodkowym przyciskiem lub narzedziem Hand
  const [zoom, setZoom] = useState(24);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Kolory i palety - tu sie dzieje cala magia kolorow, ja pierdole ile tego
  const [primaryColor, setPrimaryColor] = useState('#4cedd2');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [primaryAlpha, setPrimaryAlpha] = useState(100);
  const [extractedPalette, setExtractedPalette] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('diamond');
  const [customPalette, setCustomPalette] = useState(() => {
    try {
      const saved = localStorage.getItem('barley_custom_palette');
      return saved ? JSON.parse(saved) : ['#b9f2ff', '#4cedd2', '#2cbda7', '#1a8274', '#0f5249', '#ffffff', '#000000'];
    } catch (_) {
      return ['#b9f2ff', '#4cedd2', '#2cbda7', '#1a8274', '#0f5249'];
    }
  });

  // Historia undo/redo - trzymamy dataURL w tablicy po kazdym ruchu. Zuzywa troche ramu, ale dziala stabilnie i nie pierdoli sie z diffowaniem.
  // Ktos moze pytac czemu nie diffing. Bo nie. Dziala i to sie liczy.
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Info o pikselu pod kursorem - wyswietlane w pasku statusu
  const [hoverInfo, setHoverInfo] = useState({ x: 0, y: 0, color: '#4cedd2', alpha: 255 });

  const pixelCanvasRefOut = useRef(null);
  const fileInputRef = useRef(null);

  // Ladujemy teksture przy otwarciu edytora - jesli sie wywali to user zobaczy blad
  useEffect(() => {
    if (!asset) return;

    let cancelled = false;
    setLoading(true);

    TextureEditorService.loadTexture(zipData, asset)
      .then((res) => {
        if (cancelled) return;
        setTextureUrl(res.dataUrl);
        setOriginalUrl(res.dataUrl);
        setCurrentCanvasUrl(res.dataUrl);
        setDimensions({ width: res.width, height: res.height });

        // Domyslny zoom dla wiekszych obrazkow - przy duzych teksturach zoom 24px bylby za wielki i canvas by wylatywal poza ekran
        if (res.width > 32 || res.height > 32) {
          setZoom(12);
        } else if (res.width > 16 || res.height > 16) {
          setZoom(18);
        } else {
          setZoom(26);
        }

        // Inicjalizujemy historie ze startowa tekstura jako punkt 0
        setHistory([res.dataUrl]);
        setHistoryIndex(0);
        setLoading(false);

        // Wyciagamy palete kolorow z zaladowanej tekstury - user ma od razu sensowne kolory bez szukania recznie
        if (res.img) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = res.width;
          tempCanvas.height = res.height;
          const ctx = tempCanvas.getContext('2d');
          ctx.drawImage(res.img, 0, 0);
          const palette = TextureEditorService.extractPaletteFromImageData(ctx, res.width, res.height, 24);
          setExtractedPalette(palette);
          if (palette.length > 0) {
            setPrimaryColor(palette[0]);
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Błąd ładowania tekstury:', err);
        addToast('Błąd ładowania tekstury: ' + err.message, 'error');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [asset, zipData]);

  // Skroty klawiszowe (Undo, Redo, narzedzia, zamiana kolorow, siatka)
  // Musialem to zrobic recznie w addEventListener, bo te biblioteki ze skrotami do reacta to jakies gowno.
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Pomijamy jesli user pisze w inpucie - inaczej wciskasz B w nazwie i zmienia narzedzie, no ja pierdole.
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Cofnij: Ctrl+Z — must-have, bez tego nie ma edytora
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ponow: Ctrl+Y lub Ctrl+Shift+Z - obslugujemy oba formaty
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Skroty narzedzi - standardowe klawisze jak w programach graficznych
      switch (e.key.toLowerCase()) {
        case 'b': setActiveTool('pencil'); break;
        case 'e': setActiveTool('eraser'); break;
        case 'g': setActiveTool('bucket'); break;
        case 'i': setActiveTool('eyedropper'); break;
        case 'l': setActiveTool('line'); break;
        case 'u': setActiveTool('rectangle'); break;
        case 'c': setActiveTool('circle'); break;
        case 'd': setActiveTool('lighten'); break;
        case 's': setActiveTool('darken'); break;
        case 'r': setActiveTool('replace'); break;
        case 'x': handleSwapColors(); break;
        case 'h': handleFlipH(); break;
        case 'v': handleFlipV(); break;
        case 'escape': handleAttemptClose(); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, primaryColor, secondaryColor, hasUnsavedChanges]);

  // Commitujemy nowy stan do historii - po kazdym ruchu odcinamy przyszlosc jesli cofnelismy stan
  const handleCommitState = (newDataUrl) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, newDataUrl];
    });
    setHistoryIndex((prev) => prev + 1);
    setCurrentCanvasUrl(newDataUrl);
    setHasUnsavedChanges(true);

    // Aktualizujemy palete dynamicznie po kazdym ruchu pedzla
    const pCanvas = pixelCanvasRefOut.current;
    if (pCanvas) {
      const ctx = pCanvas.getContext('2d');
      const palette = TextureEditorService.extractPaletteFromImageData(ctx, dimensions.width, dimensions.height, 24);
      setExtractedPalette(palette);
    }
  };

  // Cofnij - krok w tyl w historii
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const prevDataUrl = history[nextIndex];
      setHistoryIndex(nextIndex);
      setTextureUrl(prevDataUrl);
      setCurrentCanvasUrl(prevDataUrl);
      setHasUnsavedChanges(true);
    }
  };

  // Ponow - krok w przod w historii
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextDataUrl = history[nextIndex];
      setHistoryIndex(nextIndex);
      setTextureUrl(nextDataUrl);
      setCurrentCanvasUrl(nextDataUrl);
      setHasUnsavedChanges(true);
    }
  };

  // Zamiana kolorow glownego i dodatkowego - klawisz X
  const handleSwapColors = () => {
    const temp = primaryColor;
    setPrimaryColor(secondaryColor);
    setSecondaryColor(temp);
  };

  // Transformacja: Odbicie poziome (flip H) - trik z translate i scale(-1, 1)
  const handleFlipH = () => {
    const pCanvas = pixelCanvasRefOut.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(pCanvas, 0, 0);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(dimensions.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    const newUrl = pCanvas.toDataURL('image/png');
    setTextureUrl(newUrl);
    handleCommitState(newUrl);
  };

  // Transformacja: Odbicie pionowe (flip V)
  const handleFlipV = () => {
    const pCanvas = pixelCanvasRefOut.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(pCanvas, 0, 0);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(0, dimensions.height);
    ctx.scale(1, -1);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    const newUrl = pCanvas.toDataURL('image/png');
    setTextureUrl(newUrl);
    handleCommitState(newUrl);
  };

  // Transformacja: Obrot o 90 stopni zgodnie z ruchem wskazowek zegara
  const handleRotate90 = () => {
    const pCanvas = pixelCanvasRefOut.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(pCanvas, 0, 0);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(dimensions.width / 2, dimensions.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(tempCanvas, -dimensions.width / 2, -dimensions.height / 2);
    ctx.restore();

    const newUrl = pCanvas.toDataURL('image/png');
    setTextureUrl(newUrl);
    handleCommitState(newUrl);
  };

  // Odwrocenie kolorow - 255 minus kazdy kanal RGB
  const handleInvertColors = () => {
    const pCanvas = pixelCanvasRefOut.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, dimensions.width, dimensions.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const newUrl = pCanvas.toDataURL('image/png');
    setTextureUrl(newUrl);
    handleCommitState(newUrl);
  };

  // Wyczyszczenie calego canvasa do przezroczystosci
  const handleClearCanvas = () => {
    const pCanvas = pixelCanvasRefOut.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    const newUrl = pCanvas.toDataURL('image/png');
    setTextureUrl(newUrl);
    handleCommitState(newUrl);
    addToast('Wyczyszczono płótno', 'info');
  };

  // Przywrocenie oryginalnej tekstury ze startu sesji
  const handleResetOriginal = () => {
    if (!originalUrl) return;
    setTextureUrl(originalUrl);
    handleCommitState(originalUrl);
    addToast('Przywrócono oryginalną teksturę', 'info');
  };

  // Dodaje kolor do wlasnej palety usera w localStorage
  const handleAddCustomColor = (hex) => {
    if (!customPalette.includes(hex)) {
      const updated = [hex, ...customPalette].slice(0, 18);
      setCustomPalette(updated);
      try {
        localStorage.setItem('barley_custom_palette', JSON.stringify(updated));
      } catch (_) {}
      addToast('Dodano kolor do palety', 'success');
    }
  };

  // Import PNG z dysku - tylko PNG, zaden jpg ani webp bo minecraft tego gowna nie obsluzy.
  const handleImportPng = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      addToast('Wybierz plik w formacie PNG', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const importedUrl = ev.target.result;
      setTextureUrl(importedUrl);
      handleCommitState(importedUrl);
      addToast(`Wczytano plik ${file.name}!`, 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Export aktualnej tekstury jako plik PNG na dysk — bez kompresji, surowy PNG z canvasa
  const handleExportPng = () => {
    const pCanvas = pixelCanvasRefOut.current;
    if (!pCanvas) return;
    const url = pCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.shortId || 'texture'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    addToast('Pobrano teksturę PNG', 'success');
  };

  // Zapisujemy edytowana teksture do paczki ZIP w pamieci
  // Jesli sie wywali to user traci robote, wiec owijamy w try-catch zeby nie bylo placzu.
  const handleSaveToPack = async () => {
    const pCanvas = pixelCanvasRefOut.current;
    if (!pCanvas) return;

    const finalDataUrl = pCanvas.toDataURL('image/png');
    try {
      await TextureEditorService.saveTexture(zipData, asset, finalDataUrl);
      setHasUnsavedChanges(false);
      onSaveToPack?.(asset, finalDataUrl);
      addToast(`Zapisano pomyślnie teksturę "${asset.name}" w paczce!`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Błąd zapisu do paczki: ' + err.message, 'error');
    }
  };

  // Proba zamkniecia z ostrzezeniem jesli sa niezapisane zmiany
  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Masz niezapisane zmiany w tej teksturze. Czy na pewno chcesz wyjść bez zapisywania?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const activePreset = MINECRAFT_PRESET_PALETTES.find((p) => p.id === selectedPresetId) || MINECRAFT_PRESET_PALETTES[0];

  return (
    <div className="pixel-editor-overlay" onContextMenu={(e) => e.preventDefault()}>
      <div className="pixel-editor-modal">
        {/* Top Header Bar */}
        <header className="pixel-editor-header">
          <div className="pixel-editor-header-left">
            <div className="pixel-editor-item-badge">
              {currentCanvasUrl && (
                <img
                  src={currentCanvasUrl}
                  alt={asset.name}
                  className="pixel-editor-item-icon"
                />
              )}
            </div>
            <div>
              <div className="pixel-editor-title-row">
                <h3 className="pixel-editor-title">{asset.name || 'Edycja Tekstury'}</h3>
                <span className="pixel-editor-res-pill">
                  {dimensions.width} × {dimensions.height} px
                </span>
                {hasUnsavedChanges && (
                  <span className="pixel-editor-modified-pill">
                    ● Niezapisane zmiany
                  </span>
                )}
              </div>
              <span className="pixel-editor-subtitle">{asset.id}</span>
            </div>
          </div>

          {/* Quick Edit Actions */}
          <div className="pixel-editor-header-actions">
            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Cofnij (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Ponów (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>

            <div className="pixel-header-divider" />

            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleFlipH}
              title="Odbij poziomo (H)"
            >
              <FlipHorizontal size={16} />
            </button>
            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleFlipV}
              title="Odbij pionowo (V)"
            >
              <FlipVertical size={16} />
            </button>
            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleRotate90}
              title="Obróć o 90° w prawo"
            >
              <RotateCw size={16} />
            </button>
            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleInvertColors}
              title="Odwróć barwy (Invert)"
            >
              <Sliders size={16} />
            </button>

            <div className="pixel-header-divider" />

            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleClearCanvas}
              title="Wyczyść płótno (przezroczystość)"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              className="pixel-header-btn"
              onClick={handleResetOriginal}
              title="Przywróć stan początkowy"
            >
              <RotateCcw size={16} />
            </button>

            <div className="pixel-header-divider" />

            {/* Zoom Controls */}
            <div className="pixel-zoom-bar">
              <button
                type="button"
                className="pixel-zoom-btn"
                onClick={() => setZoom((z) => Math.max(4, z - 2))}
                title="Oddal"
              >
                <ZoomOut size={14} />
              </button>
              <span className="pixel-zoom-level">{Math.round((zoom / 16) * 100)}%</span>
              <button
                type="button"
                className="pixel-zoom-btn"
                onClick={() => setZoom((z) => Math.min(64, z + 2))}
                title="Przybliż"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                className="pixel-zoom-btn"
                onClick={() => { setZoom(24); setPan({ x: 0, y: 0 }); }}
                title="Wyśrodkuj widok"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            <button
              type="button"
              className={`pixel-header-btn ${showGrid ? 'active' : ''}`}
              onClick={() => setShowGrid(!showGrid)}
              title="Przełącz siatkę pikseli"
            >
              <Grid size={16} />
            </button>

            <div className="pixel-header-divider" />

            <button
              type="button"
              className="pixel-close-btn"
              onClick={handleAttemptClose}
              title="Zamknij edytor"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Studio Workspace */}
        <div className="pixel-editor-body">
          {/* Left Toolbar */}
          <aside className="pixel-toolbar">
            <div className="pixel-toolbar-group">
              <span className="pixel-toolbar-label">Narzędzia</span>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
                onClick={() => setActiveTool('pencil')}
                title="Ołówek (B) - Rysowanie pikseli"
              >
                <Pencil size={18} />
                <span className="pixel-tool-shortcut">B</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                onClick={() => setActiveTool('eraser')}
                title="Gumka (E) - Usuwanie do przezroczystości"
              >
                <Eraser size={18} />
                <span className="pixel-tool-shortcut">E</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'bucket' ? 'active' : ''}`}
                onClick={() => setActiveTool('bucket')}
                title="Wiadro / Wypełnienie (G) - Wypełnij obszar"
              >
                <PaintBucket size={18} />
                <span className="pixel-tool-shortcut">G</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'eyedropper' ? 'active' : ''}`}
                onClick={() => setActiveTool('eyedropper')}
                title="Pipeta (I) - Pobierz kolor z płótna"
              >
                <Pipette size={18} />
                <span className="pixel-tool-shortcut">I</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'line' ? 'active' : ''}`}
                onClick={() => setActiveTool('line')}
                title="Linia prosta (L)"
              >
                <Minus size={18} style={{ transform: 'rotate(45deg)' }} />
                <span className="pixel-tool-shortcut">L</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
                onClick={() => setActiveTool('rectangle')}
                title="Prostokąt (U)"
              >
                <Square size={18} />
                <span className="pixel-tool-shortcut">U</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'circle' ? 'active' : ''}`}
                onClick={() => setActiveTool('circle')}
                title="Koło / Elipsa (C)"
              >
                <Circle size={18} />
                <span className="pixel-tool-shortcut">C</span>
              </button>
            </div>

            <div className="pixel-toolbar-group">
              <span className="pixel-toolbar-label">Cieniowanie</span>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'lighten' ? 'active' : ''}`}
                onClick={() => setActiveTool('lighten')}
                title="Rozjaśniacz (D) - Zwiększ jasność piksela (Dodge)"
              >
                <Sun size={18} />
                <span className="pixel-tool-shortcut">D</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'darken' ? 'active' : ''}`}
                onClick={() => setActiveTool('darken')}
                title="Przyciemniacz (S) - Twórz cienie (Burn)"
              >
                <Moon size={18} />
                <span className="pixel-tool-shortcut">S</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'dither' ? 'active' : ''}`}
                onClick={() => setActiveTool('dither')}
                title="Dithering / Raster (Szachownica cieniowania)"
              >
                <Grid size={18} />
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'replace' ? 'active' : ''}`}
                onClick={() => setActiveTool('replace')}
                title="Zamiana koloru (R) - Podmień dany kolor w całej teksturze"
              >
                <Palette size={18} />
                <span className="pixel-tool-shortcut">R</span>
              </button>

              <button
                type="button"
                className={`pixel-tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
                onClick={() => setActiveTool('pan')}
                title="Rączka / Pan (Spacja)"
              >
                <Hand size={18} />
              </button>
            </div>

            {/* Brush Size / Shape Fill Options */}
            <div className="pixel-toolbar-group">
              <span className="pixel-toolbar-label">Rozmiar pędzla</span>
              <div className="pixel-brush-sizes">
                {[1, 2, 3, 4].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`pixel-brush-btn ${brushSize === size ? 'active' : ''}`}
                    onClick={() => setBrushSize(size)}
                  >
                    {size}px
                  </button>
                ))}
              </div>

              {(activeTool === 'rectangle' || activeTool === 'circle') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className={`pixel-brush-btn ${shapeFill ? 'active' : ''}`}
                    style={{ width: '100%' }}
                    onClick={() => setShapeFill(!shapeFill)}
                  >
                    {shapeFill ? 'Wypełniony' : 'Kontur'}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Central Interactive Canvas Viewport */}
          <main className="pixel-editor-canvas-center">
            <PixelArtCanvas
              textureDataUrl={textureUrl}
              width={dimensions.width}
              height={dimensions.height}
              activeTool={activeTool}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              primaryAlpha={primaryAlpha}
              brushSize={brushSize}
              shapeFill={shapeFill}
              showGrid={showGrid}
              zoom={zoom}
              setZoom={setZoom}
              pan={pan}
              setPan={setPan}
              onColorPicked={(hex, alpha) => {
                setPrimaryColor(hex);
                setPrimaryAlpha(alpha);
                setActiveTool('pencil');
                addToast(`Pobrano kolor: ${hex}`, 'info');
              }}
              onPixelHover={setHoverInfo}
              onCommitState={handleCommitState}
              onChange={setCurrentCanvasUrl}
              canvasRefOut={pixelCanvasRefOut}
            />

            {/* Floating Status Bar */}
            <footer className="pixel-editor-status-bar">
              <div className="pixel-status-item">
                <span className="pixel-status-label">Pozycja:</span>
                <strong>X: {hoverInfo.x}, Y: {hoverInfo.y}</strong>
              </div>

              <div className="pixel-status-item">
                <span className="pixel-status-label">Kolor:</span>
                <span
                  className="pixel-status-color-dot"
                  style={{ backgroundColor: hoverInfo.color === 'Transparent' ? 'transparent' : hoverInfo.color }}
                />
                <strong>{hoverInfo.color}</strong>
              </div>

              <div className="pixel-status-item">
                <span className="pixel-status-label">Płótno:</span>
                <strong>{dimensions.width}×{dimensions.height}</strong>
              </div>

              <div className="pixel-status-item">
                <span className="pixel-status-label">Narzędzie:</span>
                <strong style={{ textTransform: 'capitalize' }}>{activeTool}</strong>
              </div>
            </footer>
          </main>

          {/* Right Sidebar: Colors, Previews, Save */}
          <aside className="pixel-sidebar">
            {/* Color Manager */}
            <div className="pixel-sidebar-section">
              <h4 className="pixel-sidebar-title">
                <Palette size={15} />
                <span>Wybór Koloru</span>
              </h4>

              {/* Primary & Secondary Color Chips */}
              <div className="pixel-color-slots-row">
                <div className="pixel-color-chip-wrap">
                  <div
                    className="pixel-color-chip primary-chip"
                    style={{ backgroundColor: primaryColor, opacity: primaryAlpha / 100 }}
                    title="Kolor Główny"
                  />
                  <span className="pixel-chip-label">Główny</span>
                </div>

                <button
                  type="button"
                  className="pixel-swap-colors-btn"
                  onClick={handleSwapColors}
                  title="Zamień kolory (X)"
                >
                  ⇄
                </button>

                <div className="pixel-color-chip-wrap">
                  <div
                    className="pixel-color-chip secondary-chip"
                    style={{ backgroundColor: secondaryColor }}
                    title="Kolor Zapasowy"
                  />
                  <span className="pixel-chip-label">Zapasowy</span>
                </div>

                <div className="pixel-hex-input-wrap">
                  <input
                    type="color"
                    className="pixel-native-color-picker"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="pixel-hex-text-input"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
              </div>

              {/* Alpha / Opacity Slider */}
              <div className="pixel-alpha-slider-wrap">
                <div className="pixel-slider-header">
                  <span>Krycie (Przezroczystość):</span>
                  <strong>{primaryAlpha}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={primaryAlpha}
                  onChange={(e) => setPrimaryAlpha(Number(e.target.value))}
                  className="pixel-range-input"
                />
              </div>

              {/* Extracted Texture Palette */}
              {extractedPalette.length > 0 && (
                <div className="pixel-palette-block">
                  <div className="pixel-palette-header">
                    <span>Kolory z tej tekstury</span>
                    <span className="pixel-palette-count">{extractedPalette.length}</span>
                  </div>
                  <div className="pixel-swatches-grid">
                    {extractedPalette.map((hex, idx) => (
                      <button
                        key={`${hex}-${idx}`}
                        type="button"
                        className={`pixel-swatch ${primaryColor.toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => setPrimaryColor(hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Minecraft Preset Palettes */}
              <div className="pixel-palette-block">
                <div className="pixel-palette-header">
                  <span>Palety Minecraft</span>
                  <select
                    className="pixel-palette-select"
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                  >
                    {MINECRAFT_PRESET_PALETTES.map((pal) => (
                      <option key={pal.id} value={pal.id}>
                        {pal.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pixel-swatches-grid">
                  {activePreset.colors.map((hex, idx) => (
                    <button
                      key={`${hex}-${idx}`}
                      type="button"
                      className={`pixel-swatch ${primaryColor.toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                      style={{ backgroundColor: hex }}
                      onClick={() => setPrimaryColor(hex)}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Saved Palette */}
              <div className="pixel-palette-block">
                <div className="pixel-palette-header">
                  <span>Twoja Paleta</span>
                  <button
                    type="button"
                    className="pixel-add-color-btn"
                    onClick={() => handleAddCustomColor(primaryColor)}
                    title="Dodaj bieżący kolor"
                  >
                    + Dodaj
                  </button>
                </div>
                <div className="pixel-swatches-grid">
                  {customPalette.map((hex, idx) => (
                    <button
                      key={`${hex}-${idx}`}
                      type="button"
                      className={`pixel-swatch ${primaryColor.toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                      style={{ backgroundColor: hex }}
                      onClick={() => setPrimaryColor(hex)}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Live Previews */}
            <div className="pixel-sidebar-section">
              <h4 className="pixel-sidebar-title">
                <Eye size={15} />
                <span>Podgląd Na Żywo</span>
              </h4>

              <div className="pixel-previews-container">
                {/* 1:1 Actual Size */}
                <div className="pixel-preview-box">
                  <div className="pixel-preview-frame size-1x">
                    {currentCanvasUrl && (
                      <img
                        src={currentCanvasUrl}
                        alt="1x Preview"
                        className="pixel-preview-img"
                        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
                      />
                    )}
                  </div>
                  <span className="pixel-preview-caption">1:1 (Rozmiar w grze)</span>
                </div>

                {/* 2:1 Scale */}
                <div className="pixel-preview-box">
                  <div className="pixel-preview-frame size-2x">
                    {currentCanvasUrl && (
                      <img
                        src={currentCanvasUrl}
                        alt="2x Preview"
                        className="pixel-preview-img"
                        style={{ width: `${dimensions.width * 2}px`, height: `${dimensions.height * 2}px` }}
                      />
                    )}
                  </div>
                  <span className="pixel-preview-caption">2× Skala</span>
                </div>

                {/* Minecraft Slot Preview */}
                <div className="pixel-preview-box">
                  <div className="pixel-mc-slot-frame">
                    {currentCanvasUrl && (
                      <img
                        src={currentCanvasUrl}
                        alt="Minecraft Slot Preview"
                        className="pixel-preview-img"
                        style={{ width: '32px', height: '32px' }}
                      />
                    )}
                  </div>
                  <span className="pixel-preview-caption">Slot Ekwipunku</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pixel-sidebar-actions">
              <button
                type="button"
                className="pixel-btn-save-pack"
                onClick={handleSaveToPack}
              >
                <Check size={18} />
                <span>Zastosuj do paczki</span>
              </button>

              <div className="pixel-btn-row">
                <button
                  type="button"
                  className="pixel-btn-secondary"
                  onClick={handleExportPng}
                  title="Pobierz plik PNG na dysk"
                >
                  <Download size={14} />
                  <span>Pobierz PNG</span>
                </button>

                <button
                  type="button"
                  className="pixel-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Załaduj zewnętrzny plik PNG"
                >
                  <Upload size={14} />
                  <span>Wgraj PNG</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".png"
                  style={{ display: 'none' }}
                  onChange={handleImportPng}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
