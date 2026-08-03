function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function sampleCornerBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { r: number; g: number; b: number } {
  const points = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const offset of points) {
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
  }
  return { r: r / 4, g: g / 4, b: b / 4 };
}

function floodFillBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number,
): void {
  const bg = sampleCornerBackground(data, width, height);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const alpha = data[i + 3];
    if (alpha < 10) {
      visited[idx] = 1;
      queue.push(idx);
      return;
    }
    if (colorDistance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b) <= tolerance) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const i = idx * 4;
    data[i + 3] = 0;

    const x = idx % width;
    const y = (idx - x) / width;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }
}

function getContentBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 20) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/** Prepare a dedicated watermark image with transparent background. */
export async function prepareWatermarkPngBytes(
  bytes: Uint8Array,
  mimeType: "image/png" | "image/jpeg",
): Promise<Uint8Array> {
  if (typeof document === "undefined") return bytes;

  const blob = new Blob([Uint8Array.from(bytes)], { type: mimeType });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return bytes;

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  floodFillBackground(imageData.data, canvas.width, canvas.height, 48);
  ctx.putImageData(imageData, 0, 0);

  const bounds = getContentBounds(imageData.data, canvas.width, canvas.height);
  const trimmed = document.createElement("canvas");
  trimmed.width = bounds.width;
  trimmed.height = bounds.height;
  const tctx = trimmed.getContext("2d");
  if (!tctx) return bytes;

  tctx.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  const pngBlob = await new Promise<Blob | null>((resolve) =>
    trimmed.toBlob(resolve, "image/png"),
  );
  if (!pngBlob) return bytes;
  return new Uint8Array(await pngBlob.arrayBuffer());
}
