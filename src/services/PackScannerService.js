import JSZip from 'jszip';
import packFormat from 'pack-format';

export const REVIEW_CATEGORIES = [
  'All',
  'Armor',
  'Weapons',
  'Food',
  'Tools',
  'Blocks',
  'Cosmetics & Other'
];

/**
 * Categorize a Minecraft asset based on directive rules (Section 5)
 */
export function categorizeMinecraftAsset(
  id,
  filePath,
  parentModel,
  isBlockOrBlockstate = false,
  isArmorLayerTexture = false
) {
  const cleanId = (id || '').replace(/^[^:]+:/, '').toLowerCase();
  const cleanPath = (filePath || '').toLowerCase();
  const parent = (parentModel || '').toLowerCase();

  if (
    isArmorLayerTexture ||
    /(?:_helmet|_chestplate|_leggings|_boots|turtle_helmet|elytra|wolf_armor|horse_armor)$/.test(cleanId) ||
    cleanPath.includes('/armor/') ||
    cleanPath.includes('/equipment/')
  ) {
    return 'Armor';
  }

  if (
    /(?:_sword|^bow|^crossbow|^trident|^mace|_spear|^shield|^arrow|^tipped_arrow|^spectral_arrow)/.test(cleanId) ||
    /\/(?:weapons?|swords?|blades?|daggers?|knives|guns?|bows?|spears?|staffs?|wands?)\//.test(cleanPath)
  ) {
    return 'Weapons';
  }

  if (
    /(?:apple|bread|porkchop|beef|chicken|mutton|rabbit|cod|salmon|tropical_fish|pufferfish|stew|soup|cookie|melon_slice|dried_kelp|carrot|potato|beetroot|pie|berries|honey_bottle|milk_bucket|potion|chorus_fruit|cake|tea|salad|doughnut|ice_cream|rice)/.test(cleanId) ||
    /\/(?:foods?|drinks?|meals?|consumables?|potions?)\//.test(cleanPath)
  ) {
    return 'Food';
  }

  if (
    /(?:_pickaxe|_axe|_shovel|_hoe|fishing_rod|flint_and_steel|shears|brush|spyglass|compass|clock|lead|name_tag|totem_of_undying|bucket|saddle)$/.test(cleanId) ||
    parent.includes('handheld_rod')
  ) {
    return 'Tools';
  }

  if (
    isBlockOrBlockstate ||
    cleanPath.includes('/blockstates/') ||
    cleanPath.includes('/models/block/') ||
    parent.startsWith('minecraft:block/') ||
    parent.startsWith('block/')
  ) {
    return 'Blocks';
  }

  return 'Cosmetics & Other';
}

/**
 * Format Minecraft Section Sign (§) formatted strings into clean HTML
 */
export function formatMinecraftText(rawText) {
  if (!rawText) return '';
  if (typeof rawText === 'object') {
    if (Array.isArray(rawText)) {
      return rawText.map(formatMinecraftText).join('');
    }
    if (rawText.text) {
      let sub = formatMinecraftText(rawText.text);
      if (rawText.extra && Array.isArray(rawText.extra)) {
        sub += rawText.extra.map(formatMinecraftText).join('');
      }
      return sub;
    }
    return JSON.stringify(rawText);
  }

  const str = String(rawText);
  const colorMap = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
  };

  const tokens = str.split(/(§[0-9a-fk-or])/gi);
  let html = '';
  let currentColor = null;
  let bold = false;
  let italic = false;
  let underline = false;

  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith('§')) {
      const code = token[1].toLowerCase();
      if (colorMap[code]) {
        currentColor = colorMap[code];
      } else if (code === 'l') {
        bold = true;
      } else if (code === 'o') {
        italic = true;
      } else if (code === 'n') {
        underline = true;
      } else if (code === 'r') {
        currentColor = null;
        bold = false;
        italic = false;
        underline = false;
      }
    } else {
      const style = [];
      if (currentColor) style.push(`color: ${currentColor}`);
      if (bold) style.push('font-weight: 700');
      if (italic) style.push('font-style: italic');
      if (underline) style.push('text-decoration: underline');
      if (style.length > 0) {
        html += `<span style="${style.join('; ')}">${escapeHtml(token)}</span>`;
      } else {
        html += escapeHtml(token);
      }
    }
  }

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get human-readable Minecraft version using pack-format
 */
export function getVersionFromPackFormat(formatNum) {
  if (formatNum === undefined || formatNum === null) return '1.20+';
  try {
    const num = Number(formatNum);
    const getVersionsFn = packFormat?.getVersions || packFormat?.default?.getVersions || (typeof packFormat === 'function' ? packFormat.getVersions : null);
    const versions = getVersionsFn ? getVersionsFn(num, 'resource') : null;
    if (versions && versions.releases) {
      if (versions.releases.min === versions.releases.max) {
        return `MC ${versions.releases.min} (Format ${num})`;
      }
      return `MC ${versions.releases.min} - ${versions.releases.max} (Format ${num})`;
    }
  } catch (_) {}
  return `Format ${formatNum}`;
}

/**
 * Make pretty human name from item/block id (e.g. diamond_sword -> Diamond Sword)
 */
export function prettifyAssetId(id) {
  const clean = (id || '').replace(/^[^:]+:/, '').replace(/[_-]/g, ' ');
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize a resource pack zip by stripping any root wrapper folders (e.g. "PackName/assets/..." -> "assets/...")
 */
export async function normalizeResourcePackZip(zipFileOrBuffer) {
  const zip = new JSZip();
  const zipData = await zip.loadAsync(zipFileOrBuffer);
  const keys = Object.keys(zipData.files);

  const assetKey = keys.find((k) => k.includes('assets/'));
  if (!assetKey) return { zipData, buffer: zipFileOrBuffer };

  const idx = assetKey.indexOf('assets/');
  if (idx <= 0) return { zipData, buffer: zipFileOrBuffer }; // already at root

  const prefix = assetKey.slice(0, idx);
  const cleanZip = new JSZip();

  for (const [p, file] of Object.entries(zipData.files)) {
    if (file.dir) continue;
    if (p.startsWith(prefix)) {
      const cleanPath = p.slice(prefix.length);
      cleanZip.file(cleanPath, await file.async('uint8array'));
    }
  }

  const cleanBuffer = await cleanZip.generateAsync({ type: 'uint8array' });
  return { zipData: cleanZip, buffer: cleanBuffer };
}

export class PackScannerService {
  /**
   * Scan resource pack ZIP and perform delta discovery
   */
  static async scanPack(zipFileOrBuffer) {
    const { zipData } = await normalizeResourcePackZip(zipFileOrBuffer);

    // 1. Pack metadata
    let packDescription = '';
    let packFormatNum = null;
    let minFormat = null;
    let maxFormat = null;
    let iconUrl = null;

    let mcmetaFile = zipData.file('pack.mcmeta') || zipData.file(/pack\.mcmeta$/i)[0];
    if (mcmetaFile) {
      try {
        const mcmetaRaw = await mcmetaFile.async('string');
        const parsed = JSON.parse(mcmetaRaw);
        if (parsed?.pack) {
          packDescription = parsed.pack.description || '';
          packFormatNum = parsed.pack.pack_format ?? null;
          minFormat = parsed.pack.min_format ?? parsed.pack.supported_formats?.[0] ?? null;
          maxFormat = parsed.pack.max_format ?? parsed.pack.supported_formats?.[1] ?? null;
        }
      } catch (e) {
        console.warn('Błąd parsowania pack.mcmeta:', e);
      }
    }

    // 2. Pack Icon
    let iconFile = zipData.file('pack.png') || zipData.file(/pack\.png$/i)[0];
    if (iconFile) {
      try {
        const b64 = await iconFile.async('base64');
        iconUrl = `data:image/png;base64,${b64}`;
      } catch (_) {}
    }

    const versionBadge = getVersionFromPackFormat(packFormatNum);

    // 3. Scan Delta Discovery
    const assetsMap = new Map(); // assetKey -> ScannedAsset
    const rawFiles = Object.keys(zipData.files);

    // Track animated textures
    const animatedTextures = new Set();
    for (const f of rawFiles) {
      if (f.endsWith('.png.mcmeta')) {
        const baseTexture = f.replace(/\.mcmeta$/, '');
        animatedTextures.add(baseTexture.toLowerCase());
      }
    }

    // A. Modern Item Definitions: assets/<namespace>/items/*.json (1.21.4+ / 26.x)
    const modernItemFiles = rawFiles.filter((f) =>
      /^assets\/[^/]+\/items\/[^/]+\.json$/i.test(f)
    );

    for (const filePath of modernItemFiles) {
      const match = filePath.match(/^assets\/([^/]+)\/items\/(.+)\.json$/i);
      if (!match) continue;
      const namespace = match[1];
      const itemId = match[2];
      const fullId = `${namespace}:${itemId}`;

      try {
        const content = await zipData.file(filePath).async('string');
        const itemDef = JSON.parse(content);

        // Walk selector tree to find all sub-models and CMDs
        const discovered = [];
        const walkNode = (node, ctx = {}) => {
          if (!node || typeof node !== 'object') return;
          if (node.type === 'minecraft:model' || node.model) {
            discovered.push({
              modelPath: node.model,
              customModelData: ctx.cmd,
              tints: node.tints
            });
          }
          if (node.type === 'minecraft:range_dispatch') {
            const isCmd = node.property?.includes('custom_model_data');
            if (Array.isArray(node.entries)) {
              for (const entry of node.entries) {
                walkNode(entry.model, { ...ctx, cmd: isCmd ? entry.threshold : ctx.cmd });
              }
            }
            if (node.fallback) walkNode(node.fallback, ctx);
          }
          if (node.type === 'minecraft:select' && Array.isArray(node.cases)) {
            for (const c of node.cases) {
              walkNode(c.model, ctx);
            }
          }
          if (node.type === 'minecraft:condition') {
            if (node.on_true) walkNode(node.on_true, ctx);
            if (node.on_false) walkNode(node.on_false, ctx);
          }
          if (node.type === 'minecraft:composite' && Array.isArray(node.models)) {
            for (const m of node.models) {
              walkNode(m, ctx);
            }
          }
        };

        if (itemDef.model) walkNode(itemDef.model);

        // Register main item
        const isAnim = animatedTextures.has(`assets/${namespace}/textures/item/${itemId}.png`.toLowerCase());
        const category = categorizeMinecraftAsset(fullId, filePath, undefined, false, false);

        assetsMap.set(fullId, {
          id: fullId,
          shortId: itemId,
          name: prettifyAssetId(itemId),
          namespace,
          category,
          filePath,
          type: 'item',
          modelJson: itemDef,
          isAnimated: isAnim,
          rawJsonString: JSON.stringify(itemDef, null, 2),
          modernDefinition: true
        });

        // Register CMD overrides as dedicated entries
        discovered.forEach((sub, idx) => {
          if (sub.customModelData !== undefined) {
            const subId = `${fullId}#cmd_${sub.customModelData}`;
            if (!assetsMap.has(subId)) {
              assetsMap.set(subId, {
                id: subId,
                shortId: `${itemId} [CMD #${sub.customModelData}]`,
                name: `${prettifyAssetId(itemId)} (CMD #${sub.customModelData})`,
                namespace,
                category,
                filePath,
                type: 'model',
                modelPath: sub.modelPath,
                customModelData: sub.customModelData,
                isAnimated: isAnim,
                rawJsonString: JSON.stringify(sub, null, 2)
              });
            }
          }
        });
      } catch (err) {
        console.warn(`Błąd parsowania definicji przedmiotu ${filePath}:`, err);
      }
    }

    // B. Classic Item Models: assets/<namespace>/models/item/*.json (1.14 - 1.21.3)
    const classicItemModelFiles = rawFiles.filter((f) =>
      /^assets\/[^/]+\/models\/item\/[^/]+\.json$/i.test(f)
    );

    for (const filePath of classicItemModelFiles) {
      const match = filePath.match(/^assets\/([^/]+)\/models\/item\/(.+)\.json$/i);
      if (!match) continue;
      const namespace = match[1];
      const modelName = match[2];
      const fullId = `${namespace}:${modelName}`;

      try {
        const content = await zipData.file(filePath).async('string');
        const modelJson = JSON.parse(content);
        const parent = modelJson.parent || '';
        const isAnim = Array.from(animatedTextures).some((t) =>
          t.includes(`item/${modelName}`) || (modelJson.textures && Object.values(modelJson.textures).some((tex) => t.includes(tex)))
        );

        const hasTextures = Boolean(modelJson.textures && Object.keys(modelJson.textures).length > 0);
        const hasElements = Boolean(Array.isArray(modelJson.elements) && modelJson.elements.length > 0);
        const hasOverrides = Boolean(Array.isArray(modelJson.overrides) && modelJson.overrides.length > 0);

        // Abstract templates (e.g. smaller_util.json) that have no textures, elements or overrides are internal parent helpers
        if (!hasTextures && !hasElements && !hasOverrides) {
          continue;
        }

        const category = categorizeMinecraftAsset(fullId, filePath, parent, false, false);

        // Only register base model if it has direct renderable textures/elements or if it is a real item
        if (!assetsMap.has(fullId) && (hasTextures || hasElements || !hasOverrides)) {
          assetsMap.set(fullId, {
            id: fullId,
            shortId: modelName,
            name: prettifyAssetId(modelName),
            namespace,
            category,
            filePath,
            type: 'model',
            modelJson,
            parentModel: parent,
            isAnimated: isAnim,
            rawJsonString: JSON.stringify(modelJson, null, 2)
          });
        }

        // Parse overrides for CustomModelData
        if (hasOverrides) {
          for (let i = 0; i < modelJson.overrides.length; i++) {
            const ov = modelJson.overrides[i];
            const cmd = ov.predicate?.custom_model_data;
            const dmg = ov.predicate?.damage;
            const targetModel = ov.model || '';
            const variantId = `${fullId}#override_${i + 1}${cmd !== undefined ? `_cmd${cmd}` : ''}`;

            if (!assetsMap.has(variantId)) {
              assetsMap.set(variantId, {
                id: variantId,
                baseId: fullId,
                shortId: `${modelName} ${cmd !== undefined ? `[CMD: #${cmd}]` : `[Wariant #${i + 1}]`}`,
                name: `${prettifyAssetId(modelName)} ${cmd !== undefined ? `(CMD: #${cmd})` : `(Wariant #${i + 1})`}`,
                namespace,
                category,
                filePath,
                type: 'model',
                modelPath: targetModel || fullId,
                parentModel: parent,
                customModelData: cmd,
                damagePredicate: dmg,
                isAnimated: isAnim,
                rawJsonString: JSON.stringify(ov, null, 2)
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Błąd parsowania modelu ${filePath}:`, err);
      }
    }

    // C. Blockstates & Block Models: assets/<namespace>/blockstates/*.json & assets/<namespace>/models/block/*.json
    const blockstateFiles = rawFiles.filter((f) =>
      /^assets\/[^/]+\/blockstates\/[^/]+\.json$/i.test(f)
    );

    for (const filePath of blockstateFiles) {
      const match = filePath.match(/^assets\/([^/]+)\/blockstates\/(.+)\.json$/i);
      if (!match) continue;
      const namespace = match[1];
      const blockId = match[2];
      const fullId = `${namespace}:${blockId}`;

      try {
        const content = await zipData.file(filePath).async('string');
        const bsJson = JSON.parse(content);
        const isAnim = Array.from(animatedTextures).some((t) => t.includes(`block/${blockId}`));

        assetsMap.set(fullId, {
          id: fullId,
          shortId: blockId,
          name: prettifyAssetId(blockId),
          namespace,
          category: 'Blocks',
          filePath,
          type: 'block',
          blockstates: {},
          isAnimated: isAnim,
          rawJsonString: JSON.stringify(bsJson, null, 2)
        });
      } catch (_) {}
    }

    const blockModelFiles = rawFiles.filter((f) =>
      /^assets\/[^/]+\/models\/block\/[^/]+\.json$/i.test(f)
    );

    for (const filePath of blockModelFiles) {
      const match = filePath.match(/^assets\/([^/]+)\/models\/block\/(.+)\.json$/i);
      if (!match) continue;
      const namespace = match[1];
      const blockId = match[2];
      const fullId = `${namespace}:${blockId}`;

      if (!assetsMap.has(fullId)) {
        try {
          const content = await zipData.file(filePath).async('string');
          const modelJson = JSON.parse(content);
          const isAnim = Array.from(animatedTextures).some((t) => t.includes(`block/${blockId}`));

          assetsMap.set(fullId, {
            id: fullId,
            shortId: blockId,
            name: prettifyAssetId(blockId),
            namespace,
            category: 'Blocks',
            filePath,
            type: 'block',
            modelJson,
            isAnimated: isAnim,
            rawJsonString: JSON.stringify(modelJson, null, 2)
          });
        } catch (_) {}
      }
    }

    // D. Texture-Only Overrides (items and blocks)
    const textureFiles = rawFiles.filter((f) =>
      /^assets\/[^/]+\/textures\/(item|block)\/[^/]+\.png$/i.test(f)
    );

    for (const filePath of textureFiles) {
      const match = filePath.match(/^assets\/([^/]+)\/textures\/(item|block)\/(.+)\.png$/i);
      if (!match) continue;
      const namespace = match[1];
      const kind = match[2]; // 'item' or 'block'
      const idName = match[3];
      const fullId = `${namespace}:${idName}`;

      // If this item/block is not already registered with custom json, register it as texture override!
      if (!assetsMap.has(fullId)) {
        const isAnim = animatedTextures.has(filePath.toLowerCase());
        const category = categorizeMinecraftAsset(
          fullId,
          filePath,
          undefined,
          kind === 'block',
          false
        );

        assetsMap.set(fullId, {
          id: fullId,
          shortId: idName,
          name: prettifyAssetId(idName),
          namespace,
          category,
          filePath,
          type: kind === 'block' ? 'block' : 'item',
          isAnimated: isAnim,
          textureOnly: true
        });
      }
    }

    // E. 3D Armor Sets Detection
    const armorSets = new Map(); // material -> { layer1Url, layer2Url, material }
    const armorFiles = rawFiles.filter((f) =>
      /textures\/(?:models\/armor|entity\/equipment\/humanoid|entity)\/[^/]+\.png$/i.test(f)
    );

    for (const filePath of armorFiles) {
      // Classic armor textures: <material>_layer_1.png or <material>_layer_2.png
      const classicMatch = filePath.match(/\/([^/]+)_layer_([12])\.png$/i);
      if (classicMatch) {
        const material = classicMatch[1].toLowerCase();
        const layer = classicMatch[2];
        if (!armorSets.has(material)) {
          armorSets.set(material, { material });
        }
        const set = armorSets.get(material);
        try {
          const b64 = await zipData.file(filePath).async('base64');
          const dataUrl = `data:image/png;base64,${b64}`;
          if (layer === '1') set.layer1Url = dataUrl;
          if (layer === '2') set.layer2Url = dataUrl;
        } catch (_) {}
      }

      // Modern equipment textures: humanoid/<material>.png, humanoid_leggings/<material>.png
      const modernMatch = filePath.match(/\/humanoid(?:_leggings)?\/([^/]+)\.png$/i);
      if (modernMatch) {
        const material = modernMatch[1].toLowerCase();
        const isLeggings = filePath.includes('leggings');
        if (!armorSets.has(material)) {
          armorSets.set(material, { material });
        }
        const set = armorSets.get(material);
        try {
          const b64 = await zipData.file(filePath).async('base64');
          const dataUrl = `data:image/png;base64,${b64}`;
          if (isLeggings) set.layer2Url = dataUrl;
          else set.layer1Url = dataUrl;
        } catch (_) {}
      }

    }

    // Custom Elytra detection (distinguish entity 3D wings vs 2D inventory item icon)
    const entityElytraFile = rawFiles.find((f) =>
      /textures\/(?:entity\/elytra|entity\/equipment\/.*elytra)\.png$/i.test(f)
    );
    const itemElytraFile = rawFiles.find((f) =>
      /textures\/item\/.*elytra\.png$/i.test(f)
    );

    const hasAnyElytra = Boolean(
      entityElytraFile ||
      itemElytraFile ||
      Array.from(assetsMap.values()).some((a) => a.id.includes('elytra')) ||
      rawFiles.some((f) => f.toLowerCase().includes('elytra'))
    );

    if (hasAnyElytra) {
      if (!armorSets.has('elytra')) {
        armorSets.set('elytra', { material: 'elytra', isElytra: true });
      }
      const elytraSet = armorSets.get('elytra');
      elytraSet.isElytra = true;

      if (entityElytraFile) {
        try {
          const b64 = await zipData.file(entityElytraFile).async('base64');
          elytraSet.elytraUrl = `data:image/png;base64,${b64}`;
        } catch (_) {}
      }

      if (itemElytraFile) {
        try {
          const b64 = await zipData.file(itemElytraFile).async('base64');
          elytraSet.itemIconUrl = `data:image/png;base64,${b64}`;
        } catch (_) {}
      }
    }

    // Automatically locate and attach item icon (e.g. diamond_chestplate.png) to armor set for card thumbnail
    for (const [material, armorData] of armorSets.entries()) {
      if (armorData.isElytra) continue;
      const chestFile = rawFiles.find((f) =>
        new RegExp(`textures/item/.*${material}_chestplate\\.png$`, 'i').test(f)
      );
      const helmetFile = rawFiles.find((f) =>
        new RegExp(`textures/item/.*${material}_helmet\\.png$`, 'i').test(f)
      );
      const iconFile = chestFile || helmetFile;
      if (iconFile) {
        try {
          const b64 = await zipData.file(iconFile).async('base64');
          armorData.itemIconUrl = `data:image/png;base64,${b64}`;
        } catch (_) {}
      }
    }

    // Register 3D Armor Sets
    for (const [material, armorData] of armorSets.entries()) {
      const setId = `armor_3d:${material}`;
      assetsMap.set(setId, {
        id: setId,
        shortId: armorData.isElytra ? 'elytra' : `${material}_armor_3d`,
        name: armorData.isElytra ? 'Elytra' : `${prettifyAssetId(material)} Armor Set (3D)`,
        namespace: 'minecraft',
        category: 'Armor',
        filePath: armorData.isElytra
          ? (entityElytraFile || 'assets/minecraft/textures/entity/elytra.png')
          : `assets/minecraft/textures/models/armor/${material}_layer_1.png`,
        type: 'armor_set',
        armorPiece: armorData.isElytra ? 'elytra' : 'all',
        armorSet: armorData,
        isAnimated: false
      });
    }

    // DEDUPLICATE: Unify Elytra into a single 3D player-rendered card and remove redundant duplicate item card
    if (armorSets.has('elytra')) {
      for (const [key, val] of assetsMap.entries()) {
        if (val.type !== 'armor_set' && (val.id === 'minecraft:elytra' || val.shortId === 'elytra' || val.filePath?.toLowerCase().includes('textures/item/elytra.png'))) {
          assetsMap.delete(key);
        }
      }
    }

    // Link individual armor items with their corresponding armorSet and piece
    const ARMOR_PIECE_REGEX = /(?:_|^)(helmet|chestplate|leggings|boots|elytra)$/i;
    for (const asset of assetsMap.values()) {
      if (asset.category === 'Armor' && asset.type !== 'armor_set') {
        const cleanId = (asset.shortId || asset.id || '').replace(/^[^:]+:/, '').toLowerCase();
        const match = cleanId.match(ARMOR_PIECE_REGEX);
        const isElytra = cleanId.includes('elytra') || match?.[1]?.toLowerCase() === 'elytra';

        if (isElytra) {
          asset.armorPiece = 'elytra';
          if (armorSets.has('elytra')) {
            asset.armorSet = armorSets.get('elytra');
          } else {
            asset.armorSet = {
              material: 'elytra',
              isElytra: true,
              elytraUrl: 'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/entity/elytra.png'
            };
          }
        } else if (match) {
          const piece = match[1].toLowerCase();
          const material = cleanId.replace(ARMOR_PIECE_REGEX, '').replace(/^_|_$/g, '');
          asset.armorPiece = piece;
          if (armorSets.has(material)) {
            asset.armorSet = armorSets.get(material);
          } else if (material) {
            // Vanilla fallback so 3D armor preview always works for custom items
            asset.armorSet = {
              material,
              layer1Url: `https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/models/armor/${material}_layer_1.png`,
              layer2Url: `https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/models/armor/${material}_layer_2.png`
            };
          }
        }
      }
    }

    // 4. Calculate Category Counters
    const allAssetsList = Array.from(assetsMap.values());
    const categoryCounts = {
      All: allAssetsList.length,
      Armor: 0,
      Weapons: 0,
      Food: 0,
      Tools: 0,
      Blocks: 0,
      'Cosmetics & Other': 0
    };

    for (const item of allAssetsList) {
      if (categoryCounts[item.category] !== undefined) {
        categoryCounts[item.category]++;
      } else {
        categoryCounts['Cosmetics & Other']++;
      }
    }

    return {
      metadata: {
        filename: zipFileOrBuffer.name || 'resourcepack.zip',
        sizeMb: zipFileOrBuffer.size ? (zipFileOrBuffer.size / (1024 * 1024)).toFixed(2) : '0',
        description: packDescription,
        descriptionHtml: formatMinecraftText(packDescription),
        packFormat: packFormatNum,
        minFormat,
        maxFormat,
        versionBadge,
        iconUrl: iconUrl || '/assets/img/favicon.png',
        totalAssets: allAssetsList.length
      },
      assets: allAssetsList,
      categoryCounts,
      zipData
    };
  }

  /**
   * Extract raw texture blob or data URL for an asset
   */
  static async getAssetTextureUrl(zipData, asset) {
    if (asset.type === 'armor_set' && asset.armorSet) {
      return asset.armorSet.layer1Url || asset.armorSet.layer2Url || asset.armorSet.elytraUrl || null;
    }

    if (!zipData) return null;

    // Check direct file if it's already a png
    if (asset.filePath && asset.filePath.endsWith('.png')) {
      const f = zipData.file(asset.filePath);
      if (f) {
        const b64 = await f.async('base64');
        return `data:image/png;base64,${b64}`;
      }
    }

    // If it has modelJson textures
    if (asset.modelJson?.textures) {
      const texValues = Object.values(asset.modelJson.textures);
      for (const tex of texValues) {
        if (!tex || tex.startsWith('#')) continue;
        const clean = tex.replace(/^minecraft:/, '');
        const candidates = [
          `assets/minecraft/textures/${clean}.png`,
          `assets/${asset.namespace}/textures/${clean}.png`
        ];
        for (const c of candidates) {
          const f = zipData.file(c);
          if (f) {
            const b64 = await f.async('base64');
            return `data:image/png;base64,${b64}`;
          }
        }
      }
    }

    // Default search for texture matching shortId
    const fallbackPath = `assets/${asset.namespace}/textures/${asset.type === 'block' ? 'block' : 'item'}/${asset.shortId}.png`;
    const fallbackFile = zipData.file(fallbackPath);
    if (fallbackFile) {
      const b64 = await fallbackFile.async('base64');
      return `data:image/png;base64,${b64}`;
    }

    return null;
  }
}
