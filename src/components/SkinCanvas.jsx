import React, { useEffect, useState } from 'react';
import { SkinViewer } from 'skinview3d';

const skinFileMap = {
  shogyy: '/assets/img/creators/shogyy.png',
  glock18kulawleb: '/assets/img/creators/glock18kulawleb.png',
  xraxenikk: '/assets/img/creators/xRaxenikk.png',
  rzabek: '/assets/img/creators/rzabek.png',
  dziadekwedkarz: '/assets/img/creators/DziadekWedkarz.png',
  endereg: '/assets/img/creators/Endereg.png',
  enderegg: '/assets/img/creators/Endereg.png',
  zombiaczekkk: '/assets/img/creators/Zombiaczekkk.png',
  a5b1ss: '/assets/img/creators/A5B1SS.png',
  nitro798: '/assets/img/creators/nitro798.png',
};

const skinRenderCache = new Map();
let renderQueuePromise = Promise.resolve();

async function renderSkinSequentially(skinUrl) {
  renderQueuePromise = renderQueuePromise.then(async () => {
    if (skinRenderCache.has(skinUrl)) return skinRenderCache.get(skinUrl);

    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 180;
      offCanvas.height = 220;

      const viewer = new SkinViewer({
        canvas: offCanvas,
        width: 180,
        height: 220,
        preserveDrawingBuffer: true,
        renderPaused: true
      });

      viewer.zoom = 0.95;
      viewer.globalLight.intensity = 2.4;
      viewer.cameraLight.intensity = 1.6;
      viewer.controls.enableRotate = false;
      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;

      // Await skin texture load completely
      await viewer.loadSkin(skinUrl);

      // Natural Minecraft 3D standing/walking pose with slight perspective angle
      viewer.playerWrapper.rotation.y = -0.32;
      viewer.playerObject.skin.leftArm.rotation.x = 0.25;
      viewer.playerObject.skin.rightArm.rotation.x = -0.25;
      viewer.playerObject.skin.leftLeg.rotation.x = -0.2;
      viewer.playerObject.skin.rightLeg.rotation.x = 0.2;
      viewer.playerObject.skin.head.rotation.y = 0.12;
      viewer.playerObject.skin.head.rotation.x = 0.05;

      viewer.render();

      const dataUrl = offCanvas.toDataURL('image/png');
      skinRenderCache.set(skinUrl, dataUrl);

      try {
        viewer.dispose();
      } catch (_) {}

      return dataUrl;
    } catch (err) {
      console.warn('SkinCanvas render fallback:', err);
      skinRenderCache.set(skinUrl, skinUrl);
      return skinUrl;
    }
  });

  return renderQueuePromise;
}

export const SkinCanvas = ({ skinName }) => {
  const key = skinName?.toLowerCase();
  const skinUrl = skinFileMap[key] || `/assets/img/creators/${skinName}.png`;
  const [renderedUrl, setRenderedUrl] = useState(() => skinRenderCache.get(skinUrl) || null);

  useEffect(() => {
    if (!skinUrl) return;
    if (skinRenderCache.has(skinUrl)) {
      setRenderedUrl(skinRenderCache.get(skinUrl));
      return;
    }

    let isMounted = true;
    renderSkinSequentially(skinUrl).then((url) => {
      if (isMounted) setRenderedUrl(url);
    });

    return () => {
      isMounted = false;
    };
  }, [skinUrl]);

  return (
    <img
      src={renderedUrl || skinUrl}
      className="partners-skin"
      data-name={skinName}
      width={180}
      height={220}
      alt={skinName}
      loading="lazy"
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
    />
  );
};
