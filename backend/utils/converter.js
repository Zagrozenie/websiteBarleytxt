const JSZip = require('jszip');
const { createCanvas, loadImage } = require('canvas');

class TexturePackConverter {
    constructor(mappings) {
        this.mappings = mappings;
    }

    getConversionSteps(srcVer, destVer, direction) {
        const mappingVersions = ['1_13', '1_14', '1_17', '1_19', '1_20_3'];
        const toNum = v => {
            const parts = v.split('.');
            while (parts.length < 3) parts.push('0');
            return parts.map(n => n.padStart(3, '0')).join('');
        };
        const srcNum = toNum(srcVer);
        const destNum = toNum(destVer);

        let steps = [];
        if (direction === 'forward') {
            steps = mappingVersions.filter(mv => {
                const mvClean = mv.replace(/_/g, '.');
                return toNum(mvClean) > srcNum && toNum(mvClean) <= destNum;
            });
        } else {
            steps = mappingVersions.filter(mv => {
                const mvClean = mv.replace(/_/g, '.');
                return toNum(mvClean) <= srcNum && toNum(mvClean) > destNum;
            }).reverse();
        }
        return steps;
    }

    async convert(fileBuffer, srcVer, destVer) {
        const srcFormat = this.mappings.protocol[srcVer].pack_format;
        const destFormat = this.mappings.protocol[destVer].pack_format;

        if (srcVer === destVer) throw new Error('Wersja źródłowa i docelowa są takie same!');

        const zip = new JSZip();
        await zip.loadAsync(fileBuffer);
        
        const direction = destFormat >= srcFormat ? 'forward' : 'backward';
        const steps = this.getConversionSteps(srcVer, destVer, direction);

        await this.processZip(zip, steps, direction, destFormat, srcFormat);

        return await zip.generateAsync({ type: 'nodebuffer' });
    }

    async processZip(zip, steps, direction, destFormat, srcFormat) {
        const mappings = direction === 'forward' ? this.mappings.forwards : this.mappings.backwards;
        
        let rootPath = '';
        let mcmetaFile = zip.file('pack.mcmeta');
        if (!mcmetaFile) {
            const files = zip.file(/pack\.mcmeta$/i);
            if (files.length > 0) {
                mcmetaFile = files[0];
                rootPath = mcmetaFile.name.replace('pack.mcmeta', '');
            }
        }

        if (mcmetaFile) {
            try {
                const content = await mcmetaFile.async('string');
                const cleanContent = content.trim().replace(/^\uFEFF/, '');
                const json = JSON.parse(cleanContent);
                if (!json.pack) json.pack = {};
                
                json.pack.pack_format = parseInt(destFormat);
                
                zip.file(mcmetaFile.name, JSON.stringify(json, null, 4));
            } catch (e) {
                console.warn('Nie udało się przetworzyć pack.mcmeta', e);
            }
        }

        const getZipFile = (path) => zip.file(rootPath + path);

        if (direction === 'backward') {
            const savedOldSheets = [];
            const guiPath = rootPath + 'assets/minecraft/textures/gui/';
            
            zip.forEach((relativePath, file) => {
                if (file.dir) return;
                if (relativePath.startsWith(guiPath)) {
                    const internalPath = relativePath.substring(guiPath.length);
                    const isOldSheet = 
                        internalPath === 'widgets.png' || 
                        internalPath === 'icons.png' || 
                        internalPath.startsWith('container/') || 
                        internalPath.startsWith('advancements/') ||
                        internalPath.startsWith('book/');
                    
                    if (isOldSheet) {
                        savedOldSheets.push({ relativePath, file });
                    }
                }
            });

            const stitchJobs = [
                { mapping: this.mappings.guiMapping, basePath: 'assets/minecraft/textures/gui' },
                { mapping: [this.mappings.particlesMapping], basePath: 'assets/minecraft/textures/particle' }
            ];

            for (const key in this.mappings.forwards) {
                if (!isNaN(key) && this.mappings.forwards[key]?.gui) {
                    stitchJobs.push({ 
                        mapping: [this.mappings.forwards[key].gui], 
                        basePath: 'assets/minecraft/textures/gui' 
                    });
                }
            }

            for (const job of stitchJobs) {
                for (const sheet of job.mapping) {
                    const sheetPath = `${job.basePath}/${sheet.path}`;
                    const existingSheet = getZipFile(sheetPath);
                    
                    if (existingSheet) continue;
                    
                    let scale = 1;
                    let spritesToDraw = [];
                    
                    for (const tex of sheet.textures) {
                        if (tex.remove) continue;
                        
                        const spritePath = `${job.basePath}/${tex.path}`;
                        const spriteFile = getZipFile(spritePath);
                        if (spriteFile) {
                            try {
                                const buffer = await spriteFile.async('nodebuffer');
                                const img = await loadImage(buffer);
                                if (spritesToDraw.length === 0) {
                                    scale = img.width / tex.box.width;
                                }
                                spritesToDraw.push({ img, tex });
                            } catch (e) {
                                console.warn(`Nie udało się załadować sprite ${spritePath}`, e);
                            }
                        }
                    }

                    if (spritesToDraw.length > 0) {
                        const canvas = createCanvas(sheet.width * scale, sheet.height * scale);
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = false;

                        for (const { img, tex } of spritesToDraw) {
                            ctx.drawImage(img, tex.box.x * scale, tex.box.y * scale, tex.box.width * scale, tex.box.height * scale);
                        }

                        const resultBuffer = canvas.toBuffer('image/png');
                        zip.file(rootPath + sheetPath, resultBuffer);
                    }
                }
            }
            
            const guiSpritesPath = rootPath + 'assets/minecraft/textures/gui/sprites';
            const spritesFiles = zip.file(new RegExp('^' + guiSpritesPath.replace(/\//g, '\\/') + '/'));
            spritesFiles.forEach(f => zip.remove(f.name));
            
            const particlesPath = rootPath + 'assets/minecraft/textures/particle/';
            const particleFiles = zip.file(new RegExp('^' + particlesPath.replace(/\//g, '\\/') + '.*\\.png$'));
            particleFiles.forEach(f => {
                if (!f.name.endsWith('particles.png')) {
                    zip.remove(f.name);
                }
            });

            const modelsPath = rootPath + 'assets/minecraft/models';
            const modelFiles = zip.file(new RegExp('^' + modelsPath.replace(/\//g, '\\/') + '/'));
            modelFiles.forEach(f => zip.remove(f.name));

            for (const { relativePath, file } of savedOldSheets) {
                try {
                    const content = await file.async('uint8array');
                    zip.file(relativePath, content);
                } catch (e) {
                    console.warn(`Could not restore old sheet ${relativePath}`, e);
                }
            }
        }

        if (direction === 'forward' && srcFormat < 18 && destFormat >= 18) {
            const splitJobs = [
                { mapping: this.mappings.guiMapping, basePath: 'assets/minecraft/textures/gui' },
                { mapping: [this.mappings.particlesMapping], basePath: 'assets/minecraft/textures/particle' }
            ];

            for (const key in this.mappings.forwards) {
                if (!isNaN(key) && this.mappings.forwards[key]?.gui) {
                    splitJobs.push({ 
                        mapping: [this.mappings.forwards[key].gui], 
                        basePath: 'assets/minecraft/textures/gui' 
                    });
                }
            }

            for (const job of splitJobs) {
                for (const sheet of job.mapping) {
                    const sheetPath = `${job.basePath}/${sheet.path}`;
                    const sheetFile = getZipFile(sheetPath);
                    
                    if (sheetFile) {
                        try {
                            const buffer = await sheetFile.async('nodebuffer');
                            const sheetImg = await loadImage(buffer);
                            const scale = sheetImg.width / sheet.width;

                            if (sheet.path === "container/creative_inventory/tabs.png") continue;
                            
                            for (const tex of sheet.textures) {
                                if (tex.remove) continue;
                                
                                let shouldProcess = true;
                                if (tex.predicate?.protocol) {
                                    const min = tex.predicate.protocol.min_inclusive;
                                    const max = tex.predicate.protocol.max_inclusive;
                                    if (min !== null && destFormat < min) shouldProcess = false;
                                    if (max !== null && destFormat > max) shouldProcess = false;
                                }
                                if (!shouldProcess) continue;
                                
                                try {
                                    const spriteCanvas = createCanvas(tex.box.width * scale, tex.box.height * scale);
                                    const spriteCtx = spriteCanvas.getContext('2d');
                                    spriteCtx.imageSmoothingEnabled = false;

                                    spriteCtx.drawImage(
                                        sheetImg,
                                        tex.box.x * scale,
                                        tex.box.y * scale,
                                        tex.box.width * scale,
                                        tex.box.height * scale,
                                        0,
                                        0,
                                        tex.box.width * scale,
                                        tex.box.height * scale
                                    );

                                    const spriteBuffer = spriteCanvas.toBuffer('image/png');
                                    const spritePath = `${job.basePath}/${tex.path}`;
                                    zip.file(rootPath + spritePath, spriteBuffer);
                                } catch (e) {
                                    console.warn(`Nie udało się podzielić sprite ${tex.path}`, e);
                                }
                            }

                            if (sheet.delete !== false && sheet.path !== "container/creative_inventory/tabs.png") {
                                zip.remove(rootPath + sheetPath);
                            }
                        } catch (e) {
                            console.warn(`Nie udało się załadować ${sheetPath}`, e);
                        }
                    }
                }
            }
        }

        const creativeFilesToKeep = [
            "assets/minecraft/textures/gui/container/creative_inventory/tab_inventory.png",
            "assets/minecraft/textures/gui/container/creative_inventory/tab_items.png",
            "assets/minecraft/textures/gui/container/creative_inventory/tab_item_search.png",
            "assets/minecraft/textures/gui/container/creative_inventory/tabs.png"
        ];

        for (const filePath of creativeFilesToKeep) {
            const file = getZipFile(filePath);
            if (file) {
                try {
                    const content = await file.async('uint8array');
                    zip.file(rootPath + filePath, content);
                    
                    const spritePath = filePath.replace('gui/container', 'gui/sprites/container');
                    zip.file(rootPath + spritePath, content);
                } catch (e) {
                    console.warn(`Could not preserve/copy ${filePath}`, e);
                }
            }
        }

        const creativeSpritesDir = rootPath + 'assets/minecraft/textures/gui/sprites/container/creative_inventory/';
        const allowedSprites = [
            'tab_inventory.png',
            'tab_items.png',
            'tab_item_search.png',
            'tabs.png'
        ];
        zip.forEach((relativePath, file) => {
            if (relativePath.startsWith(creativeSpritesDir)) {
                const fileName = relativePath.substring(creativeSpritesDir.length);
                if (!allowedSprites.includes(fileName) && !file.dir) {
                    zip.remove(relativePath);
                }
            }
        });

        for (const step of steps) {
            const stepMappings = mappings[step] || {};
            const files = [];
            zip.forEach((relativePath, file) => {
                if (relativePath.startsWith(rootPath)) {
                    files.push({ relativePath, file });
                }
            });

            for (const { relativePath, file } of files) {
                if (file.dir) continue;

                let internalPath = relativePath.substring(rootPath.length);
                let newInternalPath = internalPath;

                if (step === '1_13') {
                    if (direction === 'forward') {
                        newInternalPath = newInternalPath.replace('assets/minecraft/textures/blocks/', 'assets/minecraft/textures/block/');
                        newInternalPath = newInternalPath.replace('assets/minecraft/textures/items/', 'assets/minecraft/textures/item/');
                    } else {
                        newInternalPath = newInternalPath.replace('assets/minecraft/textures/block/', 'assets/minecraft/textures/blocks/');
                        newInternalPath = newInternalPath.replace('assets/minecraft/textures/item/', 'assets/minecraft/textures/items/');
                    }
                }

                const pathParts = newInternalPath.split('/');
                const fileNameWithExt = pathParts[pathParts.length - 1];
                const fileName = fileNameWithExt.split('.')[0];
                const extension = fileNameWithExt.split('.')[1];

                let mappedName = null;
                for (const type in stepMappings) {
                    if (type === 'delete') continue;
                    const singularType = type === 'entities' ? 'entity' : type.slice(0, -1);
                    if (newInternalPath.includes(`/${singularType}/`) || newInternalPath.includes(`/${type}/`)) {
                        mappedName = stepMappings[type]?.[fileName];
                        if (mappedName) break;
                    }
                }

                if (mappedName) {
                    pathParts[pathParts.length - 1] = mappedName + (extension ? '.' + extension : '');
                    newInternalPath = pathParts.join('/');
                }

                if (newInternalPath !== internalPath) {
                    const content = await file.async('uint8array');
                    zip.file(rootPath + newInternalPath, content);
                    zip.remove(relativePath);
                }

                if (direction === 'backward' && stepMappings.delete) {
                    const toDelete = stepMappings.delete;
                    let shouldDelete = false;
                    for (const type in toDelete) {
                        const singularType = type === 'entities' ? 'entity' : type.slice(0, -1);
                        if (newInternalPath.includes(`/${singularType}/`) || newInternalPath.includes(`/${type}/`)) {
                            if (toDelete[type].includes(fileName)) {
                                shouldDelete = true;
                                break;
                            }
                        }
                    }
                    if (shouldDelete) {
                        zip.remove(rootPath + newInternalPath);
                    }
                }
            }
        }
    }
}

module.exports = TexturePackConverter;