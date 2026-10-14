const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const JSZip = require('jszip');

// Helper to calculate CRC32 for PNG chunks
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const rgba = pixelFn(x, y);
      const idx = 1 + x * 4;
      row[idx] = rgba[0] ?? 0;
      row[idx + 1] = rgba[1] ?? 0;
      row[idx + 2] = rgba[2] ?? 0;
      row[idx + 3] = rgba[3] ?? 255;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Texture generators (16x16 / 64x64)
const TEXTURES = {
  // Pack Icon 64x64
  packIcon: createPng(64, 64, (x, y) => {
    // Dark radial gradient background with emerald/cyan accent
    const dx = x - 32;
    const dy = y - 32;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 30) return [10, 14, 22, 255];
    if (x === 0 || y === 0 || x === 63 || y === 63) return [16, 185, 129, 255];

    // Diagonal blade across icon
    if (Math.abs(x - y) <= 2 && x > 14 && x < 50) {
      return [45, 226, 230, 255]; // Cyan diamond blade
    }
    if (Math.abs(x - y) <= 4 && x > 14 && x < 50) {
      return [20, 160, 180, 255]; // Edge
    }

    // Emerald gradient bg
    const factor = Math.max(0, 1 - dist / 32);
    return [
      Math.floor(15 + 15 * factor),
      Math.floor(25 + 60 * factor),
      Math.floor(35 + 45 * factor),
      255
    ];
  }),

  // Diamond Sword (16x16)
  diamondSword: createPng(16, 16, (x, y) => {
    // Diagonal sword from (2,13) to (13,2)
    const diff = (15 - y) - x;
    if (x >= 2 && x <= 4 && y >= 11 && y <= 13) {
      return [101, 67, 33, 255]; // Wood hilt
    }
    if ((x === 4 && y === 10) || (x === 5 && y === 11) || (x === 3 && y === 11)) {
      return [70, 70, 75, 255]; // Guard
    }
    if (diff === 0 && x >= 5 && x <= 14) {
      return [45, 230, 230, 255]; // Blade center
    }
    if (Math.abs(diff) === 1 && x >= 5 && x <= 13) {
      return [20, 180, 190, 255]; // Blade edge
    }
    return [0, 0, 0, 0]; // Transparent
  }),

  // Custom Ruby Blade (CustomModelData 1001)
  rubyBlade: createPng(16, 16, (x, y) => {
    const diff = (15 - y) - x;
    if (x >= 2 && x <= 4 && y >= 11 && y <= 13) {
      return [35, 35, 40, 255]; // Netherite hilt
    }
    if ((x === 4 && y === 10) || (x === 5 && y === 11) || (x === 3 && y === 11)) {
      return [220, 180, 50, 255]; // Gold guard
    }
    if (diff === 0 && x >= 5 && x <= 14) {
      return [255, 40, 70, 255]; // Ruby red core
    }
    if (Math.abs(diff) === 1 && x >= 5 && x <= 13) {
      return [180, 20, 45, 255]; // Ruby edge
    }
    return [0, 0, 0, 0];
  }),

  // Netherite Sword (16x16)
  netheriteSword: createPng(16, 16, (x, y) => {
    const diff = (15 - y) - x;
    if (x >= 2 && x <= 4 && y >= 11 && y <= 13) {
      return [60, 40, 30, 255];
    }
    if ((x === 4 && y === 10) || (x === 5 && y === 11)) {
      return [40, 35, 40, 255];
    }
    if (diff === 0 && x >= 5 && x <= 14) {
      return [75, 68, 74, 255]; // Netherite gray
    }
    if (Math.abs(diff) === 1 && x >= 5 && x <= 13) {
      return [49, 44, 48, 255];
    }
    return [0, 0, 0, 0];
  }),

  // Golden Apple (16x16)
  goldenApple: createPng(16, 16, (x, y) => {
    if (x === 8 && y === 2) return [120, 80, 30, 255]; // Stem
    if (x === 9 && y === 2) return [50, 180, 50, 255]; // Leaf
    const dx = x - 7.5;
    const dy = y - 8.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 5.5) {
      if (x <= 6 && y <= 6) return [255, 255, 180, 255]; // Shiny highlight
      if (dist <= 4.2) return [255, 215, 0, 255]; // Gold
      return [218, 165, 32, 255]; // Gold dark edge
    }
    return [0, 0, 0, 0];
  }),

  // Cooked Beef (16x16)
  cookedBeef: createPng(16, 16, (x, y) => {
    if (x >= 4 && x <= 12 && y >= 5 && y <= 11) {
      if ((x + y) % 3 === 0) return [90, 45, 25, 255]; // Grill mark
      if (x === 4 || y === 5 || x === 12 || y === 11) return [120, 60, 35, 255];
      return [160, 75, 45, 255]; // Meat brown
    }
    return [0, 0, 0, 0];
  }),

  // Diamond Pickaxe (16x16)
  diamondPickaxe: createPng(16, 16, (x, y) => {
    // Handle
    if ((15 - y) === x && x >= 2 && x <= 10) return [105, 75, 40, 255];
    // Pickaxe head
    if ((x === 11 && y <= 5) || (y === 4 && x >= 10 && x <= 14) || (x === 13 && y === 2)) {
      return [45, 230, 230, 255];
    }
    if ((x === 6 && y === 9) || (x === 7 && y === 8) || (x === 8 && y === 7)) {
      return [30, 180, 190, 255];
    }
    return [0, 0, 0, 0];
  }),

  // Diamond Chestplate (16x16)
  diamondChestplate: createPng(16, 16, (x, y) => {
    if (y >= 4 && y <= 12 && x >= 3 && x <= 12) {
      if (y === 4 && (x === 7 || x === 8)) return [0, 0, 0, 0]; // Neck hole
      if (y >= 9 && (x <= 4 || x >= 11)) return [0, 0, 0, 0]; // Arms cut
      if (x === 3 || x === 12 || y === 12) return [20, 160, 170, 255]; // Dark edge
      if (x <= 6 && y <= 6) return [120, 255, 255, 255]; // Highlight
      return [45, 220, 230, 255]; // Diamond cyan
    }
    return [0, 0, 0, 0];
  }),

  // Diamond Helmet (16x16)
  diamondHelmet: createPng(16, 16, (x, y) => {
    if (y >= 4 && y <= 11 && x >= 4 && x <= 11) {
      if (y >= 8 && x >= 6 && x <= 9) return [0, 0, 0, 0]; // Face opening
      if (x === 4 || x === 11 || y === 4) return [20, 160, 170, 255];
      return [45, 220, 230, 255];
    }
    return [0, 0, 0, 0];
  }),

  // Diamond Block (16x16 texture)
  diamondBlock: createPng(16, 16, (x, y) => {
    if (x === 0 || y === 0) return [120, 255, 255, 255]; // Bevel light
    if (x === 15 || y === 15) return [15, 140, 150, 255]; // Bevel dark
    if (x === 1 || y === 1 || x === 14 || y === 14) return [30, 180, 190, 255];
    if ((x >= 4 && x <= 11) && (y >= 4 && y <= 11)) {
      if ((x + y) % 2 === 0) return [60, 240, 250, 255];
      return [45, 225, 235, 255];
    }
    return [40, 205, 215, 255];
  }),

  // Obsidian (16x16 texture)
  obsidian: createPng(16, 16, (x, y) => {
    const noise = ((x * 17 + y * 23) % 11);
    if (noise < 2) return [60, 30, 80, 255]; // Purple speckle
    if (noise < 4) return [35, 20, 50, 255];
    if (noise < 7) return [20, 12, 28, 255];
    return [15, 10, 22, 255]; // Deep dark
  }),

  // Animated Magma Cream (16x64: 4 animated frames)
  magmaCreamAnimated: createPng(16, 64, (x, y) => {
    const frame = Math.floor(y / 16);
    const localY = y % 16;
    const dx = x - 7.5;
    const dy = localY - 7.5;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 5.5) {
      // Pulsing brightness by frame
      const pulse = [0, 25, 50, 25][frame];
      if (dist <= 2.5) return [255, 240, Math.min(255, 80 + pulse), 255]; // Core glow
      if (dist <= 4.2) return [255, Math.min(255, 120 + pulse), 10, 255]; // Orange
      return [180, 40 + pulse, 5, 255]; // Deep magma red
    }
    return [0, 0, 0, 0];
  }),

  // 3D Player Armor Layer 1 (64x32 for Helmet, Chestplate, Boots)
  diamondArmorLayer1: createPng(64, 32, (x, y) => {
    // Head / Helmet area: x: 0..31, y: 0..15
    if (x >= 0 && x < 32 && y >= 0 && y < 16) {
      if (x % 4 === 0 || y % 4 === 0) return [20, 160, 175, 255];
      return [45, 225, 235, 255];
    }
    // Chest / Arms area: x: 16..47, y: 16..31
    if (x >= 16 && x < 48 && y >= 16 && y < 32) {
      if ((x + y) % 3 === 0) return [20, 170, 185, 255];
      return [45, 220, 230, 255];
    }
    return [0, 0, 0, 0];
  }),

  // 3D Player Armor Layer 2 (64x32 for Leggings)
  diamondArmorLayer2: createPng(64, 32, (x, y) => {
    // Leggings area: x: 0..31, y: 16..31
    if (x >= 0 && x < 32 && y >= 16 && y < 32) {
      if ((x + y) % 2 === 0) return [25, 175, 190, 255];
      return [40, 215, 225, 255];
    }
    return [0, 0, 0, 0];
  })
};

// 2. Build the ZIP archive
async function buildSamplePack() {
  const zip = new JSZip();

  // pack.mcmeta with Minecraft section formatting (§)
  const mcmeta = {
    pack: {
      pack_format: 34,
      min_format: 15,
      max_format: 46,
      description: '§bBarley Pack §7- §aModuł Review 3D §e[PvP & Survival]'
    }
  };
  zip.file('pack.mcmeta', JSON.stringify(mcmeta, null, 2));
  zip.file('pack.png', TEXTURES.packIcon);

  // --- WEAPONS ---
  // Diamond sword texture & JSON with CustomModelData override
  zip.file('assets/minecraft/textures/item/diamond_sword.png', TEXTURES.diamondSword);
  zip.file('assets/minecraft/models/item/diamond_sword.json', JSON.stringify({
    parent: 'minecraft:item/handheld',
    textures: {
      layer0: 'minecraft:item/diamond_sword'
    },
    overrides: [
      {
        predicate: { custom_model_data: 1001 },
        model: 'minecraft:item/custom_ruby_blade'
      }
    ]
  }, null, 2));

  // Custom Ruby Blade (CMD 1001)
  zip.file('assets/minecraft/textures/item/custom_ruby_blade.png', TEXTURES.rubyBlade);
  zip.file('assets/minecraft/models/item/custom_ruby_blade.json', JSON.stringify({
    parent: 'minecraft:item/handheld',
    textures: {
      layer0: 'minecraft:item/custom_ruby_blade'
    }
  }, null, 2));

  // Netherite sword
  zip.file('assets/minecraft/textures/item/netherite_sword.png', TEXTURES.netheriteSword);
  zip.file('assets/minecraft/models/item/netherite_sword.json', JSON.stringify({
    parent: 'minecraft:item/handheld',
    textures: {
      layer0: 'minecraft:item/netherite_sword'
    }
  }, null, 2));

  // --- FOOD ---
  zip.file('assets/minecraft/textures/item/golden_apple.png', TEXTURES.goldenApple);
  zip.file('assets/minecraft/models/item/golden_apple.json', JSON.stringify({
    parent: 'minecraft:item/generated',
    textures: {
      layer0: 'minecraft:item/golden_apple'
    }
  }, null, 2));

  zip.file('assets/minecraft/textures/item/cooked_beef.png', TEXTURES.cookedBeef);
  zip.file('assets/minecraft/models/item/cooked_beef.json', JSON.stringify({
    parent: 'minecraft:item/generated',
    textures: {
      layer0: 'minecraft:item/cooked_beef'
    }
  }, null, 2));

  // --- TOOLS ---
  zip.file('assets/minecraft/textures/item/diamond_pickaxe.png', TEXTURES.diamondPickaxe);
  zip.file('assets/minecraft/models/item/diamond_pickaxe.json', JSON.stringify({
    parent: 'minecraft:item/handheld',
    textures: {
      layer0: 'minecraft:item/diamond_pickaxe'
    }
  }, null, 2));

  // --- ARMOR ICONS & 3D MODELS ---
  zip.file('assets/minecraft/textures/item/diamond_helmet.png', TEXTURES.diamondHelmet);
  zip.file('assets/minecraft/models/item/diamond_helmet.json', JSON.stringify({
    parent: 'minecraft:item/generated',
    textures: {
      layer0: 'minecraft:item/diamond_helmet'
    }
  }, null, 2));

  zip.file('assets/minecraft/textures/item/diamond_chestplate.png', TEXTURES.diamondChestplate);
  zip.file('assets/minecraft/models/item/diamond_chestplate.json', JSON.stringify({
    parent: 'minecraft:item/generated',
    textures: {
      layer0: 'minecraft:item/diamond_chestplate'
    }
  }, null, 2));

  // 3D Armor textures for skinview3d inspector
  zip.file('assets/minecraft/textures/models/armor/diamond_layer_1.png', TEXTURES.diamondArmorLayer1);
  zip.file('assets/minecraft/textures/models/armor/diamond_layer_2.png', TEXTURES.diamondArmorLayer2);

  // --- BLOCKS ---
  // Diamond block
  zip.file('assets/minecraft/textures/block/diamond_block.png', TEXTURES.diamondBlock);
  zip.file('assets/minecraft/models/block/diamond_block.json', JSON.stringify({
    parent: 'minecraft:block/cube_all',
    textures: {
      all: 'minecraft:block/diamond_block'
    }
  }, null, 2));
  zip.file('assets/minecraft/blockstates/diamond_block.json', JSON.stringify({
    variants: {
      '': { model: 'minecraft:block/diamond_block' }
    }
  }, null, 2));

  // Obsidian block
  zip.file('assets/minecraft/textures/block/obsidian.png', TEXTURES.obsidian);
  zip.file('assets/minecraft/models/block/obsidian.json', JSON.stringify({
    parent: 'minecraft:block/cube_all',
    textures: {
      all: 'minecraft:block/obsidian'
    }
  }, null, 2));
  zip.file('assets/minecraft/blockstates/obsidian.json', JSON.stringify({
    variants: {
      '': { model: 'minecraft:block/obsidian' }
    }
  }, null, 2));

  // --- ANIMATED TEXTURE (with .png.mcmeta) ---
  zip.file('assets/minecraft/textures/item/magma_cream.png', TEXTURES.magmaCreamAnimated);
  zip.file('assets/minecraft/textures/item/magma_cream.png.mcmeta', JSON.stringify({
    animation: {
      frametime: 4,
      interpolate: true
    }
  }, null, 2));
  zip.file('assets/minecraft/models/item/magma_cream.json', JSON.stringify({
    parent: 'minecraft:item/generated',
    textures: {
      layer0: 'minecraft:item/magma_cream'
    }
  }, null, 2));

  // Generate buffer
  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  // Save to both workspace root and public folder
  const publicPath = path.resolve(__dirname, '../public/sample-review-pack.zip');
  const rootPath = path.resolve(__dirname, '../sample-review-pack.zip');

  fs.writeFileSync(publicPath, content);
  fs.writeFileSync(rootPath, content);

  console.log(`Successfully generated sample pack (${content.length} bytes):`);
  console.log(`- ${publicPath}`);
  console.log(`- ${rootPath}`);
}

buildSamplePack().catch((err) => {
  console.error('Error generating sample pack:', err);
  process.exit(1);
});
