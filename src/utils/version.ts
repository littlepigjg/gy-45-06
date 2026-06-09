import type { VersionDiffResult, IconVersion } from '../types';
import { dataUrlToBlob } from './db';

export async function computeDataUrlHash(dataUrl: string): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl);
  return computeBlobHash(blob);
}

export async function computeBlobHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function getImageData(dataUrl: string): Promise<{ data: ImageData; width: number; height: number }> {
  return loadImage(dataUrl).then((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return {
      data: ctx.getImageData(0, 0, img.width, img.height),
      width: img.width,
      height: img.height,
    };
  });
}

export async function computeImageDiff(
  dataUrlA: string,
  dataUrlB: string,
  versionA: IconVersion,
  versionB: IconVersion
): Promise<VersionDiffResult> {
  const [imgA, imgB] = await Promise.all([getImageData(dataUrlA), getImageData(dataUrlB)]);

  const maxWidth = Math.max(imgA.width, imgB.width);
  const maxHeight = Math.max(imgA.height, imgB.height);

  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.globalAlpha = 0.5;
  ctx.drawImage(
    await loadImage(dataUrlA),
    0,
    0,
    imgA.width,
    imgA.height,
    0,
    0,
    imgA.width,
    imgA.height
  );
  ctx.globalAlpha = 0.5;
  ctx.drawImage(
    await loadImage(dataUrlB),
    0,
    0,
    imgB.width,
    imgB.height,
    0,
    0,
    imgB.width,
    imgB.height
  );
  ctx.globalAlpha = 1;

  const resultData = ctx.getImageData(0, 0, maxWidth, maxHeight);
  const pixels = resultData.data;

  let changedPixels = 0;
  const tolerance = 10;

  for (let y = 0; y < maxHeight; y++) {
    for (let x = 0; x < maxWidth; x++) {
      const idx = (y * maxWidth + x) * 4;

      const inA = x < imgA.width && y < imgA.height;
      const inB = x < imgB.width && y < imgB.height;

      let rA = 0, gA = 0, bA = 0, aA = 0;
      let rB = 0, gB = 0, bB = 0, aB = 0;

      if (inA) {
        const idxA = (y * imgA.width + x) * 4;
        rA = imgA.data.data[idxA];
        gA = imgA.data.data[idxA + 1];
        bA = imgA.data.data[idxA + 2];
        aA = imgA.data.data[idxA + 3];
      }
      if (inB) {
        const idxB = (y * imgB.width + x) * 4;
        rB = imgB.data.data[idxB];
        gB = imgB.data.data[idxB + 1];
        bB = imgB.data.data[idxB + 2];
        aB = imgB.data.data[idxB + 3];
      }

      const dr = Math.abs(rA - rB);
      const dg = Math.abs(gA - gB);
      const db = Math.abs(bA - bB);
      const da = Math.abs(aA - aB);
      const isDifferent = inA !== inB || dr > tolerance || dg > tolerance || db > tolerance || da > tolerance;

      if (isDifferent) {
        changedPixels++;
        pixels[idx] = 255;
        pixels[idx + 1] = 63;
        pixels[idx + 2] = 94;
        pixels[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(resultData, 0, 0);

  const totalPixels = maxWidth * maxHeight;
  const changePercent = totalPixels > 0 ? (changedPixels / totalPixels) * 100 : 0;

  return {
    versionA,
    versionB,
    diffDataUrl: canvas.toDataURL('image/png'),
    changedPixels,
    totalPixels,
    changePercent,
    width: maxWidth,
    height: maxHeight,
  };
}

export function formatVersionChangeType(type: string): string {
  switch (type) {
    case 'replace':
      return '替换';
    case 'edit':
      return '编辑';
    case 'rollback':
      return '回滚';
    default:
      return type;
  }
}
