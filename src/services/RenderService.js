import {
  renderBlock,
  renderItem,
  renderModel,
  renderTexture,
  prepareAssets,
  configure
} from 'block-model-renderer';
import * as THREE from 'three';
import { SkinViewer, WalkingAnimation } from 'skinview3d';
import { normalizeResourcePackZip } from './PackScannerService.js';
if (THREE.Material && !THREE.Material.prototype.onBuild) {
  THREE.Material.prototype.onBuild = function () { };
}

// Configure block-model-renderer: pass THREE instance to avoid duplicates and opt out of bundled assets warning
configure({
  THREE,
  assetsUrl: false
});

let cachedVanillaBuffer = null;
const imageCache = new Map(); // cacheKey -> dataUrl
let activeAssetsStack = null;

// Dynamic memory cache for missing vanilla textures from CDN
const cdnCache = new Map();

const textEncoder = new TextEncoder();

// In-memory vanilla Minecraft item model parents to ensure instant, 100% reliable weapon & tool rendering
const BUILTIN_VANILLA_MODELS = {
  'assets/minecraft/models/item/generated.json': textEncoder.encode(JSON.stringify({
    parent: 'builtin/generated',
    gui_light: 'front',
    display: {
      ground: { rotation: [0, 0, 0], translation: [0, 2, 0], scale: [0.5, 0.5, 0.5] },
      head: { rotation: [0, 180, 0], translation: [0, 13, 7], scale: [1, 1, 1] },
      thirdperson_righthand: { rotation: [0, 0, 0], translation: [0, 3, 1], scale: [0.55, 0.55, 0.55] },
      firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
      fixed: { rotation: [0, 180, 0], scale: [1, 1, 1] }
    }
  })),
  'assets/minecraft/models/item/handheld.json': textEncoder.encode(JSON.stringify({
    parent: 'minecraft:item/generated',
    display: {
      thirdperson_righthand: { rotation: [0, -90, 55], translation: [0, 4.0, 0.5], scale: [0.85, 0.85, 0.85] },
      thirdperson_lefthand: { rotation: [0, 90, -55], translation: [0, 4.0, 0.5], scale: [0.85, 0.85, 0.85] },
      firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
      firstperson_lefthand: { rotation: [0, 90, -25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] }
    }
  })),
  'assets/minecraft/models/item/handheld_rod.json': textEncoder.encode(JSON.stringify({
    parent: 'minecraft:item/handheld',
    display: {
      thirdperson_righthand: { rotation: [0, -90, 55], translation: [0, 4.0, 2.5], scale: [0.85, 0.85, 0.85] },
      firstperson_righthand: { rotation: [0, -90, 25], translation: [0, 1.6, 0.8], scale: [0.68, 0.68, 0.68] }
    }
  })),
  'assets/block-model-renderer/models/missing.json': textEncoder.encode(JSON.stringify({
    textures: {}
  }))
};

/**
 * Fallback virtual handler that transparently fetches missing vanilla textures/models from CDN
 * Prevents magenta/black missing textures when resource packs don't override vanilla assets.
 */
export const cdnFallbackHandler = {
  async read(filePath) {
    if (BUILTIN_VANILLA_MODELS[filePath]) {
      return BUILTIN_VANILLA_MODELS[filePath];
    }

    if (filePath && filePath.includes('missing.json')) {
      return BUILTIN_VANILLA_MODELS['assets/block-model-renderer/models/missing.json'];
    }

    if (!filePath || !filePath.startsWith('assets/minecraft/')) return null;
    if (cdnCache.has(filePath)) return cdnCache.get(filePath);

    // Fast synthesize standard Minecraft item models: assets/minecraft/models/item/<item>.json
    // Ensures instant 100% reliable 3D rendering for weapons, tools and items with zero network/404 failures
    const itemModelMatch = filePath.match(/^assets\/minecraft\/models\/item\/([^/]+)\.json$/);
    if (itemModelMatch) {
      const itemName = itemModelMatch[1];
      const isHandheld = /(sword|pickaxe|axe|shovel|hoe|rod|stick|dagger|spear|knife|blade|scythe|hammer|staff|wand)/i.test(itemName);
      const synthModel = textEncoder.encode(JSON.stringify({
        parent: isHandheld ? 'minecraft:item/handheld' : 'minecraft:item/generated',
        textures: {
          layer0: `minecraft:item/${itemName}`
        }
      }));
      cdnCache.set(filePath, synthModel);
      return synthModel;
    }

    // Fast reject paths that don't exist on CDN or are atlas probes to avoid spamming 404s
    if (
      filePath.startsWith('assets/minecraft/items/') ||
      filePath.includes('/atlases/') ||
      filePath.includes('atlases') ||
      filePath.includes('/textures/gui/sprites/') ||
      filePath.includes('/textures/painting/') ||
      filePath.includes('/textures/particle/') ||
      filePath.includes('/textures/environment/') ||
      filePath.includes('/textures/map/') ||
      filePath.endsWith('.png.mcmeta') ||
      filePath.includes('#')
    ) {
      cdnCache.set(filePath, null);
      return null;
    }

    try {
      const cdnUrl = `https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/${filePath}`;
      const res = await fetch(cdnUrl);
      if (!res.ok) {
        cdnCache.set(filePath, null);
        return null;
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      cdnCache.set(filePath, buf);
      return buf;
    } catch (_) {
      cdnCache.set(filePath, null);
      return null;
    }
  },
  list() {
    return [];
  }
};

/**
 * Concurrency-controlled Render Queue (max 4 concurrent renders)
 * Section 6 of architectural directive
 */
class RenderQueue {
  constructor(concurrency = 4) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  enqueue(renderFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ renderFn, resolve, reject });
      this.dequeue();
    });
  }

  dequeue() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const { renderFn, resolve, reject } = this.queue.shift();
    this.running++;

    renderFn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.running--;
        this.dequeue();
      });
  }

  clear() {
    this.queue = [];
  }
}

export const renderQueue = new RenderQueue(4);

/**
 * Fetch and cache vanilla base assets
 */
export async function getVanillaAssetsBuffer() {
  if (cachedVanillaBuffer) return cachedVanillaBuffer;

  const candidateUrls = ['/vanilla-assets.zip', '/assets/vanilla-assets.zip'];
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        cachedVanillaBuffer = await res.arrayBuffer();
        return cachedVanillaBuffer;
      }
    } catch (_) { }
  }

  throw new Error('Nie udało się załadować bazowej paczki vanilla-assets.zip');
}

/**
 * Initialize cascading asset stack (prepareAssets)
 * Index 0: Custom zip (highest priority)
 * Index 1: Vanilla base assets
 * Index 2: Dynamic CDN fallback handler for missing vanilla textures
 */
export async function initResourcePackAssets(uploadedAdminZipFile) {
  const vanillaBuffer = await getVanillaAssetsBuffer();
  const { buffer: cleanZipBuffer } = await normalizeResourcePackZip(uploadedAdminZipFile);

  // In block-model-renderer, earlier elements override later ones (index 0 is highest priority!)
  activeAssetsStack = await prepareAssets(
    [cleanZipBuffer, vanillaBuffer, cdnFallbackHandler],
    { ignoreAtlases: true, version: '1.20.4' }
  );

  imageCache.clear();
  return activeAssetsStack;
}

export function getActiveAssets() {
  return activeAssetsStack;
}

/**
 * Invalidate cached preview renders for an asset ID or clear all
 */
export function invalidateAssetCache(assetId = null) {
  if (!assetId) {
    imageCache.clear();
    return;
  }
  for (const key of Array.from(imageCache.keys())) {
    if (key.startsWith(assetId)) {
      imageCache.delete(key);
    }
  }
}

/**
 * Render single asset preview with WebGL context recycling
 */
export async function renderAssetPreview(
  asset,
  options = {}
) {
  const {
    displayContext = '3d', // '3d' | 'gui' | 'thirdperson_righthand' | etc.
    size = 256
  } = options;

  // If asset has a custom edited texture, serve it directly
  if (asset.customDataUrl) {
    return { type: 'image', dataUrl: asset.customDataUrl };
  }

  const assets = activeAssetsStack;
  if (!assets) {
    throw new Error('Stos zasobów nie został zainicjalizowany.');
  }

  // Armor sets thumbnail preview (instant 2D icon/texture, zero WebGL context exhaustion)
  if (asset.type === 'armor_set') {
    const dataUrl = asset.armorSet?.itemIconUrl || asset.armorSet?.elytraUrl || asset.armorSet?.layer1Url || VANILLA_ELYTRA_DATA_URL;
    return { type: 'image', dataUrl };
  }

  // Resolve effective display transform for true 3D rendering (use 'gui' for both items and blocks)
  let effectiveDisplay = displayContext;
  if (displayContext === '3d' || displayContext === 'player_hand') {
    effectiveDisplay = 'gui';
  } else if (asset.type !== 'block' && (displayContext === 'ground' || displayContext === 'fixed' || displayContext.includes('hand'))) {
    effectiveDisplay = 'gui';
  }

  const cacheKey = `${asset.id}_${effectiveDisplay}_${size}`;
  if (imageCache.has(cacheKey)) {
    return { type: 'image', dataUrl: imageCache.get(cacheKey) };
  }

  // Enqueue in RenderQueue
  return renderQueue.enqueue(async () => {
    // Check cache again in case another task rendered it
    if (imageCache.has(cacheKey)) {
      return { type: 'image', dataUrl: imageCache.get(cacheKey) };
    }

    let canvasOrPlayer = null;

    try {
      if (asset.textureOnly && asset.filePath) {
        // Direct texture render for texture-only assets (e.g. fire_0, standalone pngs)
        const result = await renderTexture({
          texture: asset.filePath,
          assets,
          width: size,
          height: size,
          animated: Boolean(asset.isAnimated)
        });
        canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
      } else if (asset.type === 'block') {
        try {
          const result = await renderBlock({
            id: asset.id,
            assets,
            blockstates: asset.blockstates || {},
            width: size,
            height: size,
            display: effectiveDisplay,
            animated: Boolean(asset.isAnimated),
            ignoreAtlases: true,
            version: '1.20.4'
          });
          canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
        } catch (blockErr) {
          if (asset.modelJson && (asset.modelJson.elements || asset.modelJson.textures)) {
            const result = await renderModel({
              assets,
              model: asset.modelJson,
              width: size,
              height: size,
              display: effectiveDisplay,
              animated: Boolean(asset.isAnimated),
              ignoreAtlases: true,
              version: '1.20.4'
            });
            canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
          } else if (asset.filePath) {
            const result = await renderTexture({
              texture: asset.filePath,
              assets,
              width: size,
              height: size,
              animated: Boolean(asset.isAnimated)
            });
            canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
          } else {
            throw blockErr;
          }
        }
      } else if (asset.modelPath) {
        // Specific model path (e.g. override variant)
        try {
          const result = await renderModel({
            assets,
            model: asset.modelPath,
            width: size,
            height: size,
            display: effectiveDisplay,
            animated: Boolean(asset.isAnimated),
            ignoreAtlases: true,
            version: '1.20.4'
          });
          canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
        } catch (modelErr) {
          if (asset.modelJson && (asset.modelJson.elements || asset.modelJson.textures)) {
            const result = await renderModel({
              assets,
              model: asset.modelJson,
              width: size,
              height: size,
              display: effectiveDisplay,
              animated: Boolean(asset.isAnimated),
              ignoreAtlases: true,
              version: '1.20.4'
            });
            canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
          } else if (asset.filePath) {
            const result = await renderTexture({
              texture: asset.filePath,
              assets,
              width: size,
              height: size,
              animated: Boolean(asset.isAnimated)
            });
            canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
          } else {
            throw modelErr;
          }
        }
      } else {
        // Standard item or model
        try {
          const result = await renderItem({
            id: asset.baseId || asset.id,
            assets,
            width: size,
            height: size,
            display: effectiveDisplay,
            animated: Boolean(asset.isAnimated),
            ignoreAtlases: true,
            version: '1.20.4'
          });
          canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
        } catch (itemErr) {
          // If modelJson is present with geometry or textures, try renderModel
          if (asset.modelJson && (asset.modelJson.elements || asset.modelJson.textures)) {
            const result = await renderModel({
              assets,
              model: asset.modelJson,
              width: size,
              height: size,
              display: effectiveDisplay,
              animated: Boolean(asset.isAnimated),
              ignoreAtlases: true,
              version: '1.20.4'
            });
            canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
          } else if (asset.filePath && asset.filePath.endsWith('.png')) {
            const result = await renderTexture({
              texture: asset.filePath,
              assets,
              width: size,
              height: size,
              animated: Boolean(asset.isAnimated)
            });
            canvasOrPlayer = asset.isAnimated && result?.canvas ? result.canvas : result;
          } else {
            throw itemErr;
          }
        }
      }
    } catch (err) {
      console.warn(`Błąd renderowania zasobu ${asset.id}:`, err);

      // Bulletproof Fallback: resolve item/block texture directly
      try {
        let texPath = null;
        if (asset.filePath && asset.filePath.endsWith('.png')) {
          texPath = asset.filePath;
        } else if (asset.modelJson?.textures) {
          const texVal = asset.modelJson.textures.layer0 || Object.values(asset.modelJson.textures).find(t => t && !t.startsWith('#'));
          if (texVal) {
            const cleanTex = texVal.replace(/^minecraft:/, '');
            texPath = `assets/minecraft/textures/${cleanTex}.png`;
          }
        }
        if (!texPath) {
          const cleanName = (asset.shortId || asset.id.split(':').pop()).replace(/\s*\[.*\]\s*/g, '').replace(/#.*$/, '');
          const folder = asset.type === 'block' ? 'block' : 'item';
          texPath = `assets/${asset.namespace || 'minecraft'}/textures/${folder}/${cleanName}.png`;
        }

        canvasOrPlayer = await renderTexture({
          texture: texPath,
          assets,
          width: size,
          height: size,
          animated: false
        });
      } catch (fErr) {
        throw err;
      }
    }

    if (!canvasOrPlayer) {
      throw new Error(`Pusty wynik renderowania dla ${asset.id}`);
    }

    // WEBGL CONTEXT RECYCLING (Section 6 of directive)
    if (!asset.isAnimated && canvasOrPlayer instanceof HTMLCanvasElement) {
      const dataUrl = canvasOrPlayer.toDataURL('image/webp');
      imageCache.set(cacheKey, dataUrl);
      return { type: 'image', dataUrl };
    }

    // Animated textures retain player canvas
    return { type: 'canvas', canvas: canvasOrPlayer };
  });
}

/**
 * Helper to compute standard Minecraft UV coordinates on a BoxGeometry
 */
function setMinecraftUVs(box, u, v, width, height, depth, textureWidth = 64, textureHeight = 32) {
  const toFaceVertices = (x1, y1, x2, y2) => [
    new THREE.Vector2(x1 / textureWidth, 1.0 - y2 / textureHeight),
    new THREE.Vector2(x2 / textureWidth, 1.0 - y2 / textureHeight),
    new THREE.Vector2(x2 / textureWidth, 1.0 - y1 / textureHeight),
    new THREE.Vector2(x1 / textureWidth, 1.0 - y1 / textureHeight)
  ];

  const top = toFaceVertices(u + depth, v, u + width + depth, v + depth);
  const bottom = toFaceVertices(u + width + depth, v, u + width * 2 + depth, v + depth);
  const left = toFaceVertices(u, v + depth, u + depth, v + depth + height);
  const front = toFaceVertices(u + depth, v + depth, u + width + depth, v + depth + height);
  const right = toFaceVertices(u + width + depth, v + depth, u + width + depth * 2, v + height + depth);
  const back = toFaceVertices(u + width + depth * 2, v + depth, u + width * 2 + depth * 2, v + height + depth);

  const uvAttr = box.attributes.uv;
  const uvRight = [right[3], right[2], right[0], right[1]];
  const uvLeft = [left[3], left[2], left[0], left[1]];
  const uvTop = [top[3], top[2], top[0], top[1]];
  const uvBottom = [bottom[0], bottom[1], bottom[3], bottom[2]];
  const uvFront = [front[3], front[2], front[0], front[1]];
  const uvBack = [back[3], back[2], back[0], back[1]];

  const newUVData = [];
  for (const uvArray of [uvRight, uvLeft, uvTop, uvBottom, uvFront, uvBack]) {
    for (const uv of uvArray) {
      newUVData.push(uv.x, uv.y);
    }
  }
  uvAttr.set(new Float32Array(newUVData));
  uvAttr.needsUpdate = true;
}

/**
 * Build and attach authentic Minecraft 3D armor onto a skinview3d PlayerObject
 */
export function applyArmorToSkinViewer(viewer, armorData = {}, pieceFilter = 'all') {
  if (!viewer?.playerObject?.skin) return;

  const skin = viewer.playerObject.skin;
  skin.visible = true;

  // Safely collect and remove existing armor meshes
  const toRemove = [];
  skin.traverse((child) => {
    if (child.name && child.name.startsWith('armorPart_')) {
      toRemove.push(child);
    }
  });
  toRemove.forEach((c) => c.parent?.remove(c));

  const textureLoader = new THREE.TextureLoader();
  const shouldRender = (piece) => pieceFilter === 'all' || pieceFilter === piece;

  // 1. Layer 1 (Helmet, Chestplate, Boots)
  if (armorData.layer1Url) {
    textureLoader.load(armorData.layer1Url, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

      const imgW = tex.image?.width || 64;
      const imgH = tex.image?.height || 32;

      const mat = new THREE.MeshLambertMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: true,
        side: THREE.DoubleSide
      });

      // Helmet Base & Overlay (Head)
      if (shouldRender('helmet')) {
        const helmetGeo = new THREE.BoxGeometry(9.4, 9.4, 9.4);
        setMinecraftUVs(helmetGeo, 0, 0, 8, 8, 8, imgW, imgH);
        const helmetMesh = new THREE.Mesh(helmetGeo, mat);
        helmetMesh.name = 'armorPart_helmet';
        helmetMesh.position.set(0, 4, 0);
        skin.head.add(helmetMesh);

        const helmetOverlayGeo = new THREE.BoxGeometry(9.9, 9.9, 9.9);
        setMinecraftUVs(helmetOverlayGeo, 32, 0, 8, 8, 8, imgW, imgH);
        const helmetOverlayMesh = new THREE.Mesh(helmetOverlayGeo, mat);
        helmetOverlayMesh.name = 'armorPart_helmetOverlay';
        helmetOverlayMesh.position.set(0, 4, 0);
        skin.head.add(helmetOverlayMesh);
      }

      // Chestplate (Torso & Arms)
      if (shouldRender('chestplate')) {
        const chestBodyGeo = new THREE.BoxGeometry(8.9, 12.6, 4.9);
        setMinecraftUVs(chestBodyGeo, 16, 16, 8, 12, 4, imgW, imgH);
        const chestBodyMesh = new THREE.Mesh(chestBodyGeo, mat);
        chestBodyMesh.name = 'armorPart_chestBody';
        chestBodyMesh.position.set(0, 0, 0);
        skin.body.add(chestBodyMesh);

        const rightArmPivot = skin.rightArm.children[0];
        if (rightArmPivot) {
          const rightArmGeo = new THREE.BoxGeometry(4.9, 12.6, 4.9);
          setMinecraftUVs(rightArmGeo, 40, 16, 4, 12, 4, imgW, imgH);
          const rightArmMesh = new THREE.Mesh(rightArmGeo, mat);
          rightArmMesh.name = 'armorPart_chestRightArm';
          rightArmMesh.position.set(0, 0, 0);
          rightArmPivot.add(rightArmMesh);
        }

        const leftArmPivot = skin.leftArm.children[0];
        if (leftArmPivot) {
          const leftArmGeo = new THREE.BoxGeometry(4.9, 12.6, 4.9);
          const u = imgH >= 64 ? 48 : 40;
          const v = imgH >= 64 ? 48 : 16;
          setMinecraftUVs(leftArmGeo, u, v, 4, 12, 4, imgW, imgH);
          const leftArmMesh = new THREE.Mesh(leftArmGeo, mat);
          leftArmMesh.name = 'armorPart_chestLeftArm';
          leftArmMesh.position.set(0, 0, 0);
          leftArmPivot.add(leftArmMesh);
        }
      }

      // Boots (Feet)
      if (shouldRender('boots')) {
        const rightLegPivot = skin.rightLeg.children[0];
        if (rightLegPivot) {
          const rightBootGeo = new THREE.BoxGeometry(4.8, 12.5, 4.8);
          setMinecraftUVs(rightBootGeo, 0, 16, 4, 12, 4, imgW, imgH);
          const rightBootMesh = new THREE.Mesh(rightBootGeo, mat);
          rightBootMesh.name = 'armorPart_bootRightLeg';
          rightBootMesh.position.set(0, 0, 0);
          rightLegPivot.add(rightBootMesh);
        }

        const leftLegPivot = skin.leftLeg.children[0];
        if (leftLegPivot) {
          const leftBootGeo = new THREE.BoxGeometry(4.8, 12.5, 4.8);
          const u = 0;
          const v = imgH >= 64 ? 32 : 16;
          setMinecraftUVs(leftBootGeo, u, v, 4, 12, 4, imgW, imgH);
          const leftBootMesh = new THREE.Mesh(leftBootGeo, mat);
          leftBootMesh.name = 'armorPart_bootLeftLeg';
          leftBootMesh.position.set(0, 0, 0);
          leftLegPivot.add(leftBootMesh);
        }
      }
    });
  }

  // 2. Layer 2 (Leggings)
  if (armorData.layer2Url && shouldRender('leggings')) {
    textureLoader.load(armorData.layer2Url, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

      const imgW = tex.image?.width || 64;
      const imgH = tex.image?.height || 32;

      const mat = new THREE.MeshLambertMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: true,
        side: THREE.DoubleSide
      });

      // Leggings Belt/Waist (Body)
      const legBodyGeo = new THREE.BoxGeometry(8.5, 12.2, 4.5);
      setMinecraftUVs(legBodyGeo, 16, 16, 8, 12, 4, imgW, imgH);
      const legBodyMesh = new THREE.Mesh(legBodyGeo, mat);
      legBodyMesh.name = 'armorPart_leggingsBody';
      legBodyMesh.position.set(0, 0, 0);
      skin.body.add(legBodyMesh);

      // Leggings Right Leg
      const rightLegPivot = skin.rightLeg.children[0];
      if (rightLegPivot) {
        const rightLegGeo = new THREE.BoxGeometry(4.5, 12.2, 4.5);
        setMinecraftUVs(rightLegGeo, 0, 16, 4, 12, 4, imgW, imgH);
        const rightLegMesh = new THREE.Mesh(rightLegGeo, mat);
        rightLegMesh.name = 'armorPart_leggingsRightLeg';
        rightLegMesh.position.set(0, 0, 0);
        rightLegPivot.add(rightLegMesh);
      }

      // Leggings Left Leg
      const leftLegPivot = skin.leftLeg.children[0];
      if (leftLegPivot) {
        const leftLegGeo = new THREE.BoxGeometry(4.5, 12.2, 4.5);
        const u = 0;
        const v = imgH >= 64 ? 32 : 16;
        setMinecraftUVs(leftLegGeo, u, v, 4, 12, 4, imgW, imgH);
        const leftLegMesh = new THREE.Mesh(leftLegGeo, mat);
        leftLegMesh.name = 'armorPart_leggingsLeftLeg';
        leftLegMesh.position.set(0, 0, 0);
        leftLegPivot.add(leftLegMesh);
      }
    });
  }

  // 3. Elytra
  const isElytraAsset = Boolean(armorData.isElytra || armorData.material === 'elytra' || pieceFilter === 'elytra');

  if (isElytraAsset && (pieceFilter === 'all' || pieceFilter === 'elytra')) {
    const applyElytra = (capeSource) => {
      try {
        const res = viewer.loadCape(capeSource, { backEquipment: 'elytra' });
        if (res && typeof res.catch === 'function') {
          res.catch((err) => {
            console.warn('Elytra loadCape async error, falling back:', err);
            try {
              viewer.loadCape(VANILLA_ELYTRA_DATA_URL, { backEquipment: 'elytra' });
            } catch (_) {}
          });
        }
        if (viewer.playerObject) {
          viewer.playerObject.rotation.y = Math.PI - 0.25;
        }
      } catch (err) {
        console.warn('Elytra loadCape sync error, falling back:', err);
        try {
          viewer.loadCape(VANILLA_ELYTRA_DATA_URL, { backEquipment: 'elytra' });
          if (viewer.playerObject) {
            viewer.playerObject.rotation.y = Math.PI - 0.25;
          }
        } catch (_) {}
      }
    };

    if (armorData.elytraUrl) {
      const img = new Image();
      img.onload = () => {
        // Skinview3d cape requires 2:1 aspect ratio (e.g. 64x32)
        if (img.width === 2 * img.height) {
          applyElytra(img.src);
        } else {
          // If square item icon was passed, use default vanilla 64x32 wings
          applyElytra(VANILLA_ELYTRA_DATA_URL);
        }
      };
      img.onerror = () => applyElytra(VANILLA_ELYTRA_DATA_URL);
      img.src = armorData.elytraUrl;
    } else {
      applyElytra(VANILLA_ELYTRA_DATA_URL);
    }
  } else {
    try {
      viewer.loadCape(null);
      if (viewer.playerObject && !isElytraAsset && pieceFilter !== 'elytra') {
        viewer.playerObject.rotation.y = 0;
      }
    } catch (_) {}
  }
}

// Embedded 64x32 Minecraft Vanilla Elytra Wings Texture (truecolor RGBA base64, guaranteed offline, zero CORS failure)
export const VANILLA_ELYTRA_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgBAMAAABQs2O3AAAAIVBMVEUAAAB/j593iJptf5JneIpfb4BYZnVPXGpKVmNGUV1CTFgLTatUAAAAAXRSTlMAQObYZgAAAKFJREFUeNrtzbENwjAQBVArigTpuExAvEG4BQL2ABSYmiaMYG+AU1Jy3sBMCRLQIOunoeQ3V9zT/+orjRCRQhE1F8mSMLiLXBFoniDNAYEgZwkYpBj2ACzzbfIQTCFcTgAsYvRuKL7Wr+PPzm0RGN146Itg9QFH26MGZ5h3qMFYZjhRszWEJmrDG40aqpaIEFCkuzIY3rejVkNQdUTqn1/nAThNI5j05ZvKAAAAAElFTkSuQmCC';

// Embedded Default Player Skin Data URL (truecolor RGBA base64, guaranteed offline, zero network/CORS failure)
export const STEVE_SKIN_DATA_URL =
  'data:image/png;base64,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';

/**
 * 3D Player & Armor Inspector powered by skinview3d with Bright Studio Daylight
 */
export function createArmorInspector3D(containerOrCanvas, options = {}) {
  try {
    let canvas = null;
    let resizeObserver = null;

    if (containerOrCanvas instanceof HTMLCanvasElement) {
      canvas = containerOrCanvas;
    } else if (containerOrCanvas && typeof containerOrCanvas === 'object' && 'appendChild' in containerOrCanvas) {
      while (containerOrCanvas.firstChild) {
        containerOrCanvas.removeChild(containerOrCanvas.firstChild);
      }
      canvas = document.createElement('canvas');
      canvas.className = 'review-3d-player-canvas';
      containerOrCanvas.appendChild(canvas);
    } else {
      canvas = document.createElement('canvas');
      canvas.className = 'review-3d-player-canvas';
    }

    const defaultSkin = '/assets/img/custom-steve.png';
    const initW = containerOrCanvas?.clientWidth || options.width || 380;
    const initH = containerOrCanvas?.clientHeight || options.height || 480;

    const viewer = new SkinViewer({
      canvas: canvas,
      width: initW,
      height: initH,
      skin: options.skin || defaultSkin,
      zoom: 0.88
    });

    // Auto-fit container dimensions dynamically to prevent any horizontal/vertical stretching
    if (containerOrCanvas && containerOrCanvas !== canvas && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0 && !viewer.disposed) {
            viewer.setSize(Math.round(width), Math.round(height));
          }
        }
      });
      resizeObserver.observe(containerOrCanvas);
    }

    if (viewer.domElement) {
      viewer.domElement.classList.add('review-3d-player-canvas');
    }

    // Bright, vibrant studio daylight lighting (significantly brighter and clearer)
    viewer.globalLight.intensity = 2.4;
    viewer.cameraLight.intensity = 1.6;

    // Primary directional sunlight (top-left front)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(12, 28, 20);
    viewer.scene.add(sunLight);

    // Secondary fill bounce light (bottom-right back) to eliminate harsh dark shadows
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.8);
    fillLight.position.set(-15, -10, -12);
    viewer.scene.add(fillLight);

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;

    const armorData = options.layer1Url || options.layer2Url || options.elytraUrl
      ? options
      : (options.armorUrls || {});

    const isArmor = Boolean(armorData.layer1Url || armorData.layer2Url || armorData.elytraUrl || armorData.isElytra || armorData.material === 'elytra');
    const pieceFilter = options.pieceFilter || 'all';

    if (isArmor) {
      applyArmorToSkinViewer(viewer, armorData, pieceFilter);
    }

    // Camera preset looking at character
    viewer.controls.target.set(0, 0, 0);
    viewer.controls.minDistance = 10;
    viewer.controls.maxDistance = 256;
    viewer.resetCameraPose();
    viewer.controls.update();

    viewer.animation = new WalkingAnimation();

    // Attach convenience methods to viewer instance
    viewer.setArmor = (armor, piece = 'all') => applyArmorToSkinViewer(viewer, armor, piece);

    // Override dispose to guarantee WebGL context loss and DOM removal
    const origDispose = viewer.dispose.bind(viewer);
    viewer.dispose = () => {
      try {
        if (resizeObserver) resizeObserver.disconnect();
      } catch (_) {}
      try {
        viewer.renderer?.forceContextLoss?.();
      } catch (_) {}
      origDispose();
      try {
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      } catch (_) {}
    };

    return viewer;
  } catch (err) {
    console.error('Failed to create 3D SkinViewer:', err.message, err.stack);
    return null;
  }
}

export async function renderArmorSetThumbnail(asset, size = 160) {
  const isElytra = asset.armorPiece === 'elytra' || asset.armorSet?.isElytra || asset.id.includes('elytra');
  const cacheKey = `armor_player_thumb_${asset.id}_${size}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  // Ensure skin and fallback elytra images are decoded before rendering
  const steveImg = getPreloadedSteveImage();
  if (steveImg && !steveImg.complete && steveImg.decode) {
    try { await steveImg.decode(); } catch (_) {}
  }

  let elytraSource = null;
  if (isElytra) {
    const vanillaElytra = getPreloadedVanillaElytraImage();
    if (vanillaElytra && !vanillaElytra.complete && vanillaElytra.decode) {
      try { await vanillaElytra.decode(); } catch (_) {}
    }

    if (asset.armorSet?.elytraUrl) {
      try {
        const customImg = new Image();
        customImg.src = asset.armorSet.elytraUrl;
        if (customImg.decode) {
          await customImg.decode();
        } else {
          await new Promise((res) => { customImg.onload = res; customImg.onerror = res; });
        }
        if (customImg.width === 2 * customImg.height) {
          elytraSource = customImg;
        }
      } catch (_) {}
    }
    if (!elytraSource) {
      elytraSource = (vanillaElytra?.complete && vanillaElytra) || VANILLA_ELYTRA_DATA_URL;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const viewer = createArmorInspector3D(canvas, {
    skin: (steveImg?.complete && steveImg) || STEVE_SKIN_DATA_URL,
    armorUrls: asset.armorSet,
    pieceFilter: asset.armorPiece || 'all',
    width: size,
    height: size
  });

  viewer.animation = null;

  if (isElytra && elytraSource) {
    viewer.loadCape(elytraSource, { backEquipment: 'elytra' });
    if (viewer.playerObject) {
      viewer.playerObject.rotation.y = Math.PI - 0.25;
    }
  } else {
    if (viewer.playerObject) {
      viewer.playerObject.rotation.y = 0.35;
    }
  }

  viewer.render();
  // Brief delay to allow WebGL frame to flush
  await new Promise((r) => setTimeout(r, 60));
  viewer.render();

  const dataUrl = canvas.toDataURL('image/webp');
  try {
    viewer.dispose();
  } catch (_) {}

  imageCache.set(cacheKey, dataUrl);
  return dataUrl;
}


