import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib";
import type { AppSettings } from "@/models/settings";
import { prepareWatermarkPngBytes } from "@/lib/pdf/watermark-image";

export const WATERMARK_OPACITY = 0.15;
export const WATERMARK_MAX_PAGE_RATIO = 0.45;

export interface WatermarkLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getWatermarkBase64(settings: AppSettings): string {
  if (!settings.showWatermark) return "";
  return settings.watermarkBase64 || settings.logoBase64;
}

export function computeWatermarkLayout(
  pageWidth: number,
  pageHeight: number,
  image: PDFImage,
): WatermarkLayout {
  const { width, height } = image.scaleToFit(
    pageWidth * WATERMARK_MAX_PAGE_RATIO,
    pageHeight * WATERMARK_MAX_PAGE_RATIO,
  );

  return {
    x: pageWidth / 2 - width / 2,
    y: pageHeight / 2 - height / 2,
    width,
    height,
  };
}

export function drawWatermark(
  page: PDFPage,
  image: PDFImage,
  layout: WatermarkLayout,
) {
  page.drawImage(image, {
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    opacity: WATERMARK_OPACITY,
  });
}

export async function prepareWatermarkBytes(
  base64: string,
): Promise<Uint8Array | null> {
  if (!base64) return null;
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const isPng = base64.startsWith("iVBOR") || bytes[0] === 0x89;
    const mime = isPng ? "image/png" : "image/jpeg";
    return prepareWatermarkPngBytes(bytes, mime);
  } catch {
    return null;
  }
}

export async function embedWatermarkImage(
  pdfDoc: PDFDocument,
  bytes: Uint8Array,
): Promise<PDFImage | null> {
  try {
    if (bytes[0] === 0x89) {
      return pdfDoc.embedPng(bytes);
    }
    return pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function loadWatermarkImage(
  pdfDoc: PDFDocument,
  settings: AppSettings,
  pageWidth: number,
  pageHeight: number,
): Promise<{ image: PDFImage; layout: WatermarkLayout } | null> {
  const base64 = getWatermarkBase64(settings);
  if (!base64) return null;

  const bytes = await prepareWatermarkBytes(base64);
  if (!bytes) return null;

  const image = await embedWatermarkImage(pdfDoc, bytes);
  if (!image) return null;

  return {
    image,
    layout: computeWatermarkLayout(pageWidth, pageHeight, image),
  };
}
