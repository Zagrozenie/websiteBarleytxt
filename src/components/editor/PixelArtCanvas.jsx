import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TextureEditorService } from '../../services/TextureEditorService';

/**
 * Algorytm Bresenhama - rysuje linie miedzy dwoma punktami pikselowymi.
 */
function getLinePixels(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let currX = x0;
  let currY = y0;

  while (true) {
    points.push({ x: currX, y: currY });
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
  return points;
}

/**
 * Algorytm okragu Bresenhama - rysuje okrag lub wypelnione kolo na siatce pikseli.
 * Bez tego narzedzie Circle byloby bezuzyteczne.
 */
function getCirclePixels(x0, y0, x1, y1, filled = false) {
  const points = [];
  const radius = Math.round(Math.hypot(x1 - x0, y1 - y0));
  if (radius === 0) return [{ x: x0, y: y0 }];

  if (filled) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius + radius) {
          points.push({ x: x0 + dx, y: y0 + dy });
        }
      }
    }
    return points;
  }

  let x = radius;
  let y = 0;
  let err = 0;

  while (x >= y) {
    points.push({ x: x0 + x, y: y0 + y });
    points.push({ x: x0 + y, y: y0 + x });
    points.push({ x: x0 - y, y: y0 + x });
    points.push({ x: x0 - x, y: y0 + y });
    points.push({ x: x0 - x, y: y0 - y });
    points.push({ x: x0 - y, y: y0 - x });
    points.push({ x: x0 + y, y: y0 - x });
    points.push({ x: x0 + x, y: y0 - y });

    y += 1;
    err += 1 + 2 * y;
    if (2 * (err - x) + 1 > 0) {
      x -= 1;
      err += 1 - 2 * x;
    }
  }

  return points;
}

/**
 * Parsuje kolor hex lub rgb na skladowe { r, g, b, a }.
 * Canvas API nie daje tego bezposrednio, wiec recznie.
 */
function parseColor(colorStr, alphaPercent = 100) {
  if (!colorStr) return { r: 0, g: 0, b: 0, a: 255 };

  let r = 0, g = 0, b = 0, a = Math.round((alphaPercent / 100) * 255);

  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(hex, 16);
    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    b = num & 255;
  } else if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/\d+/g);
    if (match) {
      r = parseInt(match[0], 10) || 0;
      g = parseInt(match[1], 10) || 0;
      b = parseInt(match[2], 10) || 0;
      if (match[3] !== undefined) {
        a = Math.round(parseFloat(match[3]) * 255);
      }
    }
  }

  return { r, g, b, a };
}

export const PixelArtCanvas = ({
  textureDataUrl,
  width = 16,
  height = 16,
  activeTool = 'pencil',
  primaryColor = '#4cedd2',
  secondaryColor = '#ffffff',
  primaryAlpha = 100,
  brushSize = 1,
  shapeFill = false,
  showGrid = true,
  zoom = 24,
  setZoom,
  pan = { x: 0, y: 0 },
  setPan,
  onColorPicked,
  onPixelHover,
  onCommitState,
  onChange,
  canvasRefOut
}) => {
  // Offscreen canvas 1:1 - przechowuje piksele w natywnej rozdzielczosci (np. 16x16)
  const pixelCanvasRef = useRef(null);
  // Widoczny canvas na ekranie - skaluje piksele w gore, rysuje siatke i podglad ksztaltow
  const displayCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Stan interakcji myszy / dotyku - refs zamiast state bo React bylby za wolny na live-rysowanie
  const isPointerDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const lastPixelRef = useRef({ x: -1, y: -1 });
  const shapeStartPixelRef = useRef(null);
  const [previewShape, setPreviewShape] = useState(null);

  // Inicjalizacja offscreen canvasa 1:1 - tu zyja prawdziwe piksele, BEZ skalowania
  useEffect(() => {
    if (!pixelCanvasRef.current) {
      pixelCanvasRef.current = document.createElement('canvas');
    }
    const pCanvas = pixelCanvasRef.current;
    pCanvas.width = width;
    pCanvas.height = height;

    if (canvasRefOut) {
      canvasRefOut.current = pCanvas;
    }

    const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;

    if (textureDataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        renderDisplay();
        onChange?.(pCanvas.toDataURL('image/png'));
      };
      img.src = textureDataUrl;
    } else {
      ctx.clearRect(0, 0, width, height);
      renderDisplay();
    }
  }, [textureDataUrl, width, height]);

  /**
   * Renderuje piksele z offscreen canvasa na ekranowy canvas ze skalowaniem i siatka.
   * Wywolywana przy kazdym ruchu myszy - Canvas API nie ma partial redraw wiec rysujemy calosc.
   */
  const renderDisplay = useCallback(() => {
    const dCanvas = displayCanvasRef.current;
    const pCanvas = pixelCanvasRef.current;
    if (!dCanvas || !pCanvas) return;

    const ctx = dCanvas.getContext('2d');
    const dWidth = width * zoom;
    const dHeight = height * zoom;

    dCanvas.width = dWidth;
    dCanvas.height = dHeight;

    // 1. Szachownica transparencji - bez tego nie widac przezroczystych pikseli
    const checkSize = Math.max(4, Math.floor(zoom / 2));
    for (let y = 0; y < dHeight; y += checkSize) {
      for (let x = 0; x < dWidth; x += checkSize) {
        ctx.fillStyle = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0
          ? '#181e29'
          : '#111620';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // 2. Skalujemy piksele metoda nearest-neighbor (bez interpolacji) - inaczej pixel art wygladaby rozmyty i brzydki
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pCanvas, 0, 0, dWidth, dHeight);

    // 3. Podglad aktywnego ksztaltu (Linia, Prostokat, Kolo) - rysowany zywo podczas dragu
    if (previewShape && previewShape.points) {
      const { r, g, b, a } = parseColor(primaryColor, primaryAlpha);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      for (const pt of previewShape.points) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
          ctx.fillRect(pt.x * zoom, pt.y * zoom, zoom, zoom);
        }
      }
    }

    // 4. Siatka pikseli - widoczna tylko przy wiekszym zoomie
    if (showGrid && zoom >= 8) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const px = Math.floor(x * zoom) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, dHeight);
      }
      for (let y = 0; y <= height; y++) {
        const py = Math.floor(y * zoom) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(dWidth, py);
      }
      ctx.stroke();
    }
  }, [width, height, zoom, showGrid, previewShape, primaryColor, primaryAlpha]);

  // Przerysuj po zmianie zooma lub siatki
  useEffect(() => {
    renderDisplay();
  }, [renderDisplay, zoom, showGrid]);

  /**
   * Przelicza wspolrzedne kursora myszy na piksele canvasa (wspolrzedne 1:1).
   * Trzeba uwzglednic skalowanie CSS bo getBoundingClientRect daje rozmiar wyswietlany, nie natywny.
   * Debugowalem to 2 godziny - DPR rozne na roznych monitorach, pierdole to.
   */
  const getPixelCoords = (e) => {
    const dCanvas = displayCanvasRef.current;
    if (!dCanvas) return { x: 0, y: 0 };
    const rect = dCanvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

    const x = Math.floor((clientX - rect.left) / (rect.width / width));
    const y = Math.floor((clientY - rect.top) / (rect.height / height));
    return {
      x: Math.max(0, Math.min(width - 1, x)),
      y: Math.max(0, Math.min(height - 1, y))
    };
  };

  /**
   * Maluje piksele aktywnym pedzlem. Kazde narzedzie ma inny tryb.
   */
  const paintBrushAt = (ctx, px, py, colorObj, tool) => {
    const half = Math.floor(brushSize / 2);
    const startX = px - half;
    const startY = py - half;

    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        const targetX = startX + dx;
        const targetY = startY + dy;
        if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) continue;

        if (tool === 'eraser') {
          ctx.clearRect(targetX, targetY, 1, 1);
        } else if (tool === 'dither') {
          // Dithering - 50% stipple (szachownica pikseli), klasyczny efekt pixel art
          if ((targetX + targetY) % 2 === 0) {
            ctx.fillStyle = `rgba(${colorObj.r}, ${colorObj.g}, ${colorObj.b}, ${colorObj.a / 255})`;
            ctx.fillRect(targetX, targetY, 1, 1);
          }
        } else if (tool === 'lighten' || tool === 'darken') {
          // Dodge / Burn - odswietlamy lub przyciemniamy istniejacy kolor piksela
          const pixel = ctx.getImageData(targetX, targetY, 1, 1).data;
          if (pixel[3] > 0) {
            const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
            const shiftedHex = TextureEditorService.shiftBrightness(hex, tool === 'lighten' ? 12 : -12);
            const shifted = parseColor(shiftedHex, (pixel[3] / 255) * 100);
            ctx.fillStyle = `rgba(${shifted.r}, ${shifted.g}, ${shifted.b}, ${shifted.a / 255})`;
            ctx.clearRect(targetX, targetY, 1, 1);
            ctx.fillRect(targetX, targetY, 1, 1);
          }
        } else {
          // Standardowy olowek - nakladamy kolor na piksel
          ctx.fillStyle = `rgba(${colorObj.r}, ${colorObj.g}, ${colorObj.b}, ${colorObj.a / 255})`;
          ctx.clearRect(targetX, targetY, 1, 1);
          ctx.fillRect(targetX, targetY, 1, 1);
        }
      }
    }
  };

  /**
   * Wypelnianie czterokierunkowe (flood fill) - algorytm kolejkowy BFS.
   * Nie uzywamy rekurencji bo przy wiekszych teksturach wybuchnie stack overflow - przekonalem sie o tym na sobie.
   */
  const performFloodFill = (startX, startY, fillHex, fillAlpha) => {
    const pCanvas = pixelCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    const targetColor = parseColor(fillHex, fillAlpha);
    if (
      startR === targetColor.r &&
      startG === targetColor.g &&
      startB === targetColor.b &&
      startA === targetColor.a
    ) {
      return;
    }

    const matchesStart = (idx) => {
      return (
        data[idx] === startR &&
        data[idx + 1] === startG &&
        data[idx + 2] === startB &&
        data[idx + 3] === startA
      );
    };

    const queue = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const idx = (cy * width + cx) * 4;

      data[idx] = targetColor.r;
      data[idx + 1] = targetColor.g;
      data[idx + 2] = targetColor.b;
      data[idx + 3] = targetColor.a;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nPos = ny * width + nx;
          if (!visited[nPos]) {
            visited[nPos] = 1;
            if (matchesStart(nPos * 4)) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  /**
   * Zamiana koloru globalnie - zastepuje WSZYSTKIE piksele o danym kolorze nowym.
   * Rozni sie od flood fill tym ze nie sprawdza sasiedztwa, leci przez caly obraz.
   */
  const performColorReplace = (startX, startY, fillHex, fillAlpha) => {
    const pCanvas = pixelCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIdx = (startY * width + startX) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2], sa = data[startIdx + 3];
    const target = parseColor(fillHex, fillAlpha);

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === sr && data[i + 1] === sg && data[i + 2] === sb && data[i + 3] === sa) {
        data[i] = target.r;
        data[i + 1] = target.g;
        data[i + 2] = target.b;
        data[i + 3] = target.a;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  /**
   * Obsluga nacisniecia przycisku myszy - tutaj zaczyna sie rysowanie.
   * Srodni klik = panning, lewy klik = aktywne narzedzie.
   */
  const handlePointerDown = (e) => {
    // Srodni przycisk lub narzedzie Pan = tryb przewijania widoku
    if (e.button === 1 || activeTool === 'pan' || e.spaceKey) {
      isPanningRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      };
      return;
    }

    if (e.button !== 0) return; // Tylko lewy przycisk myszy, reszta ignorowana
    isPointerDownRef.current = true;

    const { x, y } = getPixelCoords(e);
    lastPixelRef.current = { x, y };

    const pCanvas = pixelCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d', { willReadFrequently: true });

    // Kroplomierz - pobieramy kolor z piksela pod kursorem
    if (activeTool === 'eyedropper') {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[3] > 0) {
        const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
        onColorPicked?.(hex, Math.round((pixel[3] / 255) * 100));
      }
      return;
    }

    // Paint bucket (Flood Fill) - BFS od klikniutego piksela
    if (activeTool === 'bucket') {
      performFloodFill(x, y, primaryColor, primaryAlpha);
      renderDisplay();
      commitCurrentState();
      return;
    }

    // Zamiana koloru - globalnie, bez sprawdzania sasiedztwa
    if (activeTool === 'replace') {
      performColorReplace(x, y, primaryColor, primaryAlpha);
      renderDisplay();
      commitCurrentState();
      return;
    }

    // Narzedzia ksztaltow - zapamieta start dragu, pokazujemy preview na zywo
    if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
      shapeStartPixelRef.current = { x, y };
      setPreviewShape({ points: [{ x, y }] });
      return;
    }

    // Rysowanie swobodne (Olowek, Gumka, Dodge/Burn, Dither) - malujemy pierwszy piksel od razu
    const colorObj = parseColor(primaryColor, primaryAlpha);
    paintBrushAt(ctx, x, y, colorObj, activeTool);
    renderDisplay();
  };

  /**
   * Obsluga ruchu myszy / dotyku - tu sie dzieje cale live rysowanie.
   * Wywolywane przy kazdym framie podczas dragu - musi byc szybkie jak kurwa blyskawica.
   */
  const handlePointerMove = (e) => {
    // 1. Panning - przesuwa widok proportjonalnie do ruchu myszy
    if (isPanningRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
      return;
    }

    const { x, y } = getPixelCoords(e);

    // Odczyt koloru pod kursorem - wyswietlany w pasku statusu
    const pCanvas = pixelCanvasRef.current;
    if (pCanvas && onPixelHover) {
      const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = pixel[3] > 0
        ? `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`
        : 'Transparent';
      onPixelHover({ x, y, color: hex, alpha: pixel[3] });
    }

    if (!isPointerDownRef.current) return;

    // 2. Podglad ksztaltu podczas dragu - wyliczamy punkty i odswiazamy preview
    if (shapeStartPixelRef.current) {
      const sx = shapeStartPixelRef.current.x;
      const sy = shapeStartPixelRef.current.y;

      let points = [];
      if (activeTool === 'line') {
        points = getLinePixels(sx, sy, x, y);
      } else if (activeTool === 'rectangle') {
        const minX = Math.min(sx, x);
        const maxX = Math.max(sx, x);
        const minY = Math.min(sy, y);
        const maxY = Math.max(sy, y);

        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            if (shapeFill || px === minX || px === maxX || py === minY || py === maxY) {
              points.push({ x: px, y: py });
            }
          }
        }
      } else if (activeTool === 'circle') {
        points = getCirclePixels(sx, sy, x, y, shapeFill);
      }

      setPreviewShape({ points });
      renderDisplay();
      return;
    }

    // 3. Ciagly stroke (swobodne rysowanie) - interpolujemy Bresenhama zeby nie bylo przerw miedzy pikselami
    // Bez tego przy szybkim ruchu myszy bylyby dziury, ja pierdole jak to brzydko wygladalo wczesniej.
    const prev = lastPixelRef.current;
    if (prev.x !== x || prev.y !== y) {
      const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
      const colorObj = parseColor(primaryColor, primaryAlpha);
      const strokePixels = getLinePixels(prev.x, prev.y, x, y);

      for (const pt of strokePixels) {
        paintBrushAt(ctx, pt.x, pt.y, colorObj, activeTool);
      }

      lastPixelRef.current = { x, y };
      renderDisplay();
    }
  };

  /**
   * Puszczenie przycisku myszy - zatwierdzamy ksztalt i commitujemy stan do historii.
   */
  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    // Zatwierdzamy finalny ksztalt na pixelCanvasie po zakonczeniu dragu
    if (shapeStartPixelRef.current && previewShape && previewShape.points) {
      const pCanvas = pixelCanvasRef.current;
      if (pCanvas) {
        const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
        const colorObj = parseColor(primaryColor, primaryAlpha);

        for (const pt of previewShape.points) {
          paintBrushAt(ctx, pt.x, pt.y, colorObj, 'pencil');
        }
      }
      shapeStartPixelRef.current = null;
      setPreviewShape(null);
      renderDisplay();
    }

    commitCurrentState();
  };

  /**
   * Commit - zapisuje aktualny stan canvasa do historii undo/redo.
   * Wywolywane po kazdej operacji. Bez tego Ctrl+Z nie dziala.
   */
  const commitCurrentState = () => {
    const pCanvas = pixelCanvasRef.current;
    if (!pCanvas) return;
    const url = pCanvas.toDataURL('image/png');
    onCommitState?.(url);
    onChange?.(url);
  };

  /**
   * Zoom kolka myszy - preventDefault zeby strona sie nie przewijala podczas zoomowania.
   * preventDefault() jest niezbedny bo inaczej cala strona skacze jak jebana - klasyczny bug.
   */
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 2 : -2;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(64, Math.max(4, prevZoom + delta));
      return nextZoom;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`pixel-art-canvas-viewport ${activeTool === 'pan' ? 'pan-mode' : ''}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="pixel-art-canvas-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`
        }}
      >
        <canvas
          ref={displayCanvasRef}
          className="pixel-art-display-canvas"
        />
      </div>
    </div>
  );
};

