import JSZip from 'jszip';
import { PackScannerService } from './PackScannerService.js';
import { invalidateAssetCache } from './RenderService.js';

/**
 * Definicje wersji Minecrafta do eksportu paczki.
 * Kazda wersja ma swoj pack_format i strukture folderow - tyle kombinacji ze az boli.
 */
export const MINECRAFT_VERSIONS = [
  {
    version: '1.8.9',
    format: 1,
    name: '1.8.9 (Format 1)',
    tag: 'Classic PvP',
    description: 'Najpopularniejsza wersja PvP 1.8.x z folderami items/ oraz blocks/'
  },
  {
    version: '1.12.2',
    format: 3,
    name: '1.12.2 (Format 3)',
    tag: 'Modded & Classic',
    description: 'Wersja 1.12 z klasyczną strukturą ścieżek'
  },
  {
    version: '1.16.5',
    format: 6,
    name: '1.16.5 (Format 6)',
    tag: 'Nether Update',
    description: 'Standard dla paczek 1.16.x ze strukturą singularną item/ i block/'
  },
  {
    version: '1.18.2',
    format: 8,
    name: '1.18.2 (Format 8)',
    tag: 'Caves & Cliffs',
    description: 'Wersja 1.18.x z nowym generowaniem świata'
  },
  {
    version: '1.19.4',
    format: 13,
    name: '1.19.4 (Format 13)',
    tag: 'The Wild',
    description: 'Wersja 1.19.x'
  },
  {
    version: '1.20 - 1.20.1',
    format: 15,
    name: '1.20 (Format 15)',
    tag: 'Trails & Tales',
    description: 'Wersja 1.20 oraz 1.20.1'
  },
  {
    version: '1.20.2 - 1.20.4',
    format: 18,
    name: '1.20.2 - 1.20.4 (Format 18)',
    tag: 'Modern',
    description: 'Wersje 1.20.2 do 1.20.4 z nowymi podziałami gui'
  },
  {
    version: '1.21+',
    format: 34,
    name: '1.21+ (Format 34)',
    tag: 'Najnowsza',
    description: 'Wersja 1.21 Tricky Trials i nowsze'
  }
];

/**
 * Gotowe palety kolorow wzorowane na Minecrafcie.
 * Spedzitem godzine dobierajac te kolory recznie - gowno nie jest tak proste jak wyglada.
 */
export const MINECRAFT_PRESET_PALETTES = [
  {
    id: 'diamond',
    name: 'Diament (Diamond)',
    colors: ['#ebfcff', '#b9f2ff', '#4cedd2', '#2cbda7', '#1a8274', '#0f5249']
  },
  {
    id: 'netherite',
    name: 'Netheryt (Netherite)',
    colors: ['#6b676e', '#524c53', '#3e373f', '#2f2830', '#201b21', '#141115']
  },
  {
    id: 'gold',
    name: 'Złoto (Gold)',
    colors: ['#fffde0', '#fff375', '#f5cb1b', '#d19808', '#8a5a02', '#4a3000']
  },
  {
    id: 'iron',
    name: 'Żelazo (Iron)',
    colors: ['#ffffff', '#e8e8e8', '#c4c4c4', '#999999', '#6e6e6e', '#454545']
  },
  {
    id: 'redstone',
    name: 'Redstone / Krew',
    colors: ['#ff9999', '#ff3b3b', '#d40000', '#8f0000', '#540000', '#2b0000']
  },
  {
    id: 'emerald',
    name: 'Szmaragd (Emerald)',
    colors: ['#99ffbb', '#3bf577', '#00c749', '#008732', '#00521e', '#00290f']
  },
  {
    id: 'lapis',
    name: 'Lapis Lazuli / Magia',
    colors: ['#8ba3ff', '#486df5', '#2445cc', '#142a8a', '#0c1a57', '#060d2b']
  },
  {
    id: 'wood',
    name: 'Drewno Dębowe (Wood)',
    colors: ['#d6b07c', '#b3864d', '#8a602d', '#613f17', '#3d250b', '#211304']
  },
  {
    id: 'stone',
    name: 'Kamień (Stone)',
    colors: ['#b8b8b8', '#969696', '#737373', '#525252', '#363636', '#1f1f1f']
  },
  {
    id: 'rainbow',
    name: 'Podstawowe Barwy',
    colors: ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899']
  }
];

/**
 * TextureEditorService - caly glowny silnik edytora tekstur Minecraft.
 * Ladowanie, edycja, zapis, eksport paczek.
 */
export class TextureEditorService {
  /**
   * Szukamy sciezki do pliku tekstury wewnatrz zipa.
   * Mojang nie mogl zrobic jednej stalej sciezki - musieli zmieniac foldery miedzy wersjami, kurwa.
   * Stad 4 rozne miejsca do sprawdzenia - i to jeszcze nie wszystkie przypadki, pierdole to.
   */
  static resolveAssetPath(zipData, asset) {
    if (!asset || !zipData) return null;

    // 1. Bezposrednia sciezka jesli konczy sie .png
    if (asset.filePath && asset.filePath.toLowerCase().endsWith('.png')) {
      if (zipData.file(asset.filePath)) return asset.filePath;
    }

    // 2. Tekstura zmapowana w pliku modelJson
    if (asset.modelJson?.textures) {
      const texValues = Object.values(asset.modelJson.textures);
      for (const tex of texValues) {
        if (!tex || typeof tex !== 'string' || tex.startsWith('#')) continue;
        const clean = tex.replace(/^minecraft:/, '');
        const candidates = [
          `assets/minecraft/textures/${clean}.png`,
          `assets/${asset.namespace || 'minecraft'}/textures/${clean}.png`,
          `assets/minecraft/textures/items/${clean.replace(/^item\//, '')}.png`,
          `assets/minecraft/textures/blocks/${clean.replace(/^block\//, '')}.png`
        ];
        for (const c of candidates) {
          if (zipData.file(c)) return c;
        }
      }
    }

    // 3. Standardowe sciezki - tych kombinacji jest za duzo, ja pierdole ten system plikow
    const ns = asset.namespace || 'minecraft';
    const shortId = asset.shortId || asset.id.replace(/^[^:]+:/, '');
    const kind = asset.type === 'block' ? 'block' : 'item';

    const standardCandidates = [
      `assets/${ns}/textures/${kind}/${shortId}.png`,
      `assets/${ns}/textures/${kind}s/${shortId}.png`, // liczba mnoga - tylko w 1.8.9, bo Mojang zmienil konwencje w 1.13
      `assets/minecraft/textures/${kind}/${shortId}.png`,
      `assets/minecraft/textures/${kind}s/${shortId}.png`
    ];

    for (const c of standardCandidates) {
      if (zipData.file(c)) return c;
    }

    // 4. Specjalny case dla zbroi - maja osobne pliki warstw armor layer_1 i layer_2
    if (asset.armorSet) {
      const mat = asset.armorSet.material;
      const armorCandidates = [
        `assets/minecraft/textures/models/armor/${mat}_layer_1.png`,
        `assets/minecraft/textures/models/armor/${mat}_layer_2.png`,
        `assets/minecraft/textures/entity/elytra.png`
      ];
      for (const c of armorCandidates) {
        if (zipData.file(c)) return c;
      }
    }

    // Domyslna sciezka do zapisu jesli plik jeszcze nie istnieje w zipie
    return `assets/${ns}/textures/${kind}/${shortId}.png`;
  }

  /**
   * Laduje teksture jako dataURL i pobiera jej wymiary.
   * Gdyby Canvas API byl normalny to byloby 5 linii - ale Image.onload jest async,
   * wiec musialem to owiac w Promise. Klasyczny bullshit przegladarkowy.
   */
  static async loadTexture(zipData, asset) {
    if (!asset) throw new Error('Brak zasobu do załadowania');

    let dataUrl = asset.customDataUrl || null;

    if (!dataUrl) {
      dataUrl = await PackScannerService.getAssetTextureUrl(zipData, asset);
    }

    if (!dataUrl) {
      // Fallback: pusty canvas 16x16 - musi byc cos, nie mozemy zwrocic nulla
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      dataUrl = canvas.toDataURL('image/png');
    }

    // Ladujemy obrazek do elementu Image zeby pobrac naturalne wymiary
    // Nie ma prostrszego sposobu w Canvas API - sprawdzalem.
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth || img.width || 16,
          height: img.naturalHeight || img.height || 16,
          img
        });
      };
      img.onerror = () => {
        resolve({ width: 16, height: 16, img: null });
      };
      img.src = dataUrl;
    });

    return {
      dataUrl,
      width: dims.width,
      height: dims.height,
      img: dims.img
    };
  }

  /**
   * Zapisuje edytowana teksture do paczki JSZip w pamieci.
   * Konwertujemy dataURL -> Uint8Array bo JSZip nie przyjmuje dataURL bezposrednio.
   */
  static async saveTexture(zipData, asset, pngDataUrl) {
    if (!zipData || !asset || !pngDataUrl) {
      throw new Error('Brak danych do zapisania tekstury');
    }

    const targetPath = this.resolveAssetPath(zipData, asset);
    if (!targetPath) {
      throw new Error('Nie udało się ustalić ścieżki pliku w paczce');
    }

    // Konwertujemy dataURL na Uint8Array - JSZip wymaga surowych bajtow
    const base64Data = pngDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Zapisujemy bajty pod wlasciwa sciezka w zipie
    zipData.file(targetPath, bytes);

    // Synchronizujemy odpowiednik dla 1.8.9 - plural/singular mess wymaga kopii w obu miejscach
    if (targetPath.includes('/item/')) {
      const plural = targetPath.replace('/item/', '/items/');
      if (zipData.file(plural)) zipData.file(plural, bytes);
    } else if (targetPath.includes('/items/')) {
      const singular = targetPath.replace('/items/', '/item/');
      if (zipData.file(singular)) zipData.file(singular, bytes);
    }

    if (targetPath.includes('/block/')) {
      const plural = targetPath.replace('/block/', '/blocks/');
      if (zipData.file(plural)) zipData.file(plural, bytes);
    } else if (targetPath.includes('/blocks/')) {
      const singular = targetPath.replace('/blocks/', '/block/');
      if (zipData.file(singular)) zipData.file(singular, bytes);
    }

    // Invalidate render cache for this asset
    invalidateAssetCache(asset.id);

    return targetPath;
  }

  /**
   * Wyciaga unikalne kolory z canvasa i buduje z nich palete.
   * Sortujemy po czestotliwosci - najczestsze kolory sa zazwyczaj najwazniejsze.
   */
  static extractPaletteFromImageData(ctx, width, height, maxColors = 32) {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const colorCounts = new Map();

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 10) continue; // Pomijamy prawie przezroczyste piksele

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
      }

      // Sortujemy po liczbie wystapien - najczestszy kolor leci na gore palety
      const sorted = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([hex]) => hex);

      return sorted.slice(0, maxColors);
    } catch (e) {
      console.warn('Błąd ekstrakcji palety:', e);
      return [];
    }
  }

  /**
   * Rozjasnia lub przyciemnia kolor hex - potrzebne do narzedzi Dodge i Burn.
   * percent > 0 = rozjasnienie, percent < 0 = przyciemnienie.
   */
  static shiftBrightness(hexColor, percent) {
    let clean = hexColor.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Buduje i eksportuje pelna paczke zasobow Minecraft dla wybranej wersji.
   * Najgrozsza funkcja w calym pliku - ja pierdole ile tu edge-case'ow przez roznice w wersjach Minecrafta.
   * Nie ruszaj jesli nie wiesz co robisz.
   */
  static async exportPack(zipData, options = {}) {
    const {
      targetFormat = 34,
      targetVersion = '1.21+',
      packName = 'BarleyTxT_Custom_Pack',
      description = 'Custom Resource Pack made with BarleyTxT Editor',
      iconDataUrl = null
    } = options;

    if (!zipData) {
      throw new Error('Brak danych paczki zasobów do eksportu');
    }

    // Klonujemy zipData - eksport nie moze modyfikowac aktualnego stanu roboczego
    const exportZip = new JSZip();
    const files = zipData.files;

    for (const [path, file] of Object.entries(files)) {
      if (file.dir) continue;
      const content = await file.async('uint8array');
      exportZip.file(path, content);
    }

    // 1. RESTRUKTURYZACJA FOLDEROW W ZALEZNOSCI OD WERSJI
    // Przed 1.13 Minecraft wymaga 'items/' i 'blocks/' (liczba mnoga).
    // Od 1.13 - 'item/' i 'block/' (liczba pojedyncza). Ktos w Mojang musial to wymyslec i ja pierdole ten pomysl.
    const isPre113 = Number(targetFormat) <= 3;

    if (isPre113) {
      // Stara wersja (1.8.9 / 1.12.2): kopiujemy item/ -> items/ i block/ -> blocks/
      for (const [path, file] of Object.entries(exportZip.files)) {
        if (file.dir) continue;

        if (path.includes('/textures/item/')) {
          const pluralPath = path.replace('/textures/item/', '/textures/items/');
          if (!exportZip.file(pluralPath)) {
            exportZip.file(pluralPath, await file.async('uint8array'));
          }
        }

        if (path.includes('/textures/block/')) {
          const pluralPath = path.replace('/textures/block/', '/textures/blocks/');
          if (!exportZip.file(pluralPath)) {
            exportZip.file(pluralPath, await file.async('uint8array'));
          }
        }
      }
    } else {
      // Nowoczesna wersja (1.13+): odwrotnie - items/ -> item/, blocks/ -> block/
      for (const [path, file] of Object.entries(exportZip.files)) {
        if (file.dir) continue;

        if (path.includes('/textures/items/')) {
          const singularPath = path.replace('/textures/items/', '/textures/item/');
          if (!exportZip.file(singularPath)) {
            exportZip.file(singularPath, await file.async('uint8array'));
          }
        }

        if (path.includes('/textures/blocks/')) {
          const singularPath = path.replace('/textures/blocks/', '/textures/block/');
          if (!exportZip.file(singularPath)) {
            exportZip.file(singularPath, await file.async('uint8array'));
          }
        }
      }
    }

    // 2. Generujemy pack.mcmeta z pack_format dla wybranej wersji
    //    Bez tego pliku Minecraft w ogole nie zaladuje paczki
    const mcmetaContent = {
      pack: {
        pack_format: Number(targetFormat),
        description: description || `Texture Pack for Minecraft ${targetVersion}`
      }
    };
    exportZip.file('pack.mcmeta', JSON.stringify(mcmetaContent, null, 2));

    // 3. Ikonka paczki (pack.png) - opcjonalna, ale wyglada ladnie w menu wyboru paczek
    if (iconDataUrl) {
      try {
        const base64Data = iconDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        exportZip.file('pack.png', bytes);
      } catch (err) {
        console.warn('Nie udalo sie zapisac ikony pack.png, idziemy dalej:', err);
      }
    }

    // 4. Kompresujemy do .zip i zwracamy Blob gotowy do pobrania
    const zipBlob = await exportZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const safeFilename = `${(packName || 'ResourcePack').replace(/[^a-zA-Z0-9_\-\.]/g, '_')}_[MC_${targetVersion.replace(/[^a-zA-Z0-9_\.]/g, '_')}].zip`;

    return {
      blob: zipBlob,
      filename: safeFilename
    };
  }
}
