import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import type { Transaction } from "@/models/transaction";
import type { AppSettings } from "@/models/settings";
import {
  formatCurrencyForPdf,
  formatDisplayDate,
  toPdfText,
} from "@/lib/utils/format";
import { prepareWatermarkPngBytes } from "@/lib/pdf/watermark-image";

interface RenderContext {
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  width: number;
  height: number;
  margin: number;
  settings: AppSettings;
  pageNumber: number;
  totalPages: number;
}

const ROW_HEIGHT = 22;
const HEADER_TABLE_GAP = 20;
const LOGO_MAX_WIDTH = 72;
const LOGO_MAX_HEIGHT = 72;
const LOGO_TEXT_GAP = 12;
const PAGE_NUMBER_HEIGHT = 25;
const SUMMARY_FOOTER_HEIGHT = 90;
const SETTINGS_FOOTER_HEIGHT = 20;
const WATERMARK_OPACITY = 0.15;
const WATERMARK_MAX_PAGE_RATIO = 0.45;

interface WatermarkLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

function computeWatermarkLayout(
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

function drawWatermark(page: PDFPage, image: PDFImage, layout: WatermarkLayout) {
  page.drawImage(image, {
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    opacity: WATERMARK_OPACITY,
  });
}

function getWatermarkBase64(settings: AppSettings): string {
  if (!settings.showWatermark) return "";
  return settings.watermarkBase64 || settings.logoBase64;
}

async function prepareWatermarkBytes(base64: string): Promise<Uint8Array | null> {
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

async function embedImage(pdfDoc: PDFDocument, base64: string) {
  if (!base64) return null;
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (base64.startsWith("iVBOR") || bytes[0] === 0x89) {
      return pdfDoc.embedPng(bytes);
    }
    return pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

async function embedWatermarkImage(
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

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  return rgb(
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  );
}

function drawHeader(
  ctx: RenderContext,
  statementNumber: string,
  statementDate: string,
  logo: PDFImage | null,
): number {
  const { page, font, boldFont, width, height, margin, settings } = ctx;
  const primary = hexToRgb(settings.primaryColor);
  let lowestY = height - margin;

  let textX = margin;
  if (logo) {
    const logoDims = logo.scaleToFit(LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
    page.drawImage(logo, {
      x: margin,
      y: height - margin - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    textX = margin + logoDims.width + LOGO_TEXT_GAP;
    lowestY = Math.min(lowestY, height - margin - logoDims.height);
  }

  let y = height - margin;
  page.drawText(toPdfText(settings.companyName), {
    x: textX,
    y: y - 10,
    size: 18,
    font: boldFont,
    color: primary,
  });

  y -= 28;
  const companyLines = [
    settings.address,
    settings.phone,
    settings.email,
    settings.gstVat ? `GST/VAT: ${settings.gstVat}` : "",
  ].filter(Boolean);

  for (const line of companyLines) {
    page.drawText(toPdfText(line), {
      x: textX,
      y,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 12;
  }
  lowestY = Math.min(lowestY, y);

  const statementNoY = height - margin - 40;
  const dateY = height - margin - 55;
  page.drawText(toPdfText(`Statement No: ${statementNumber}`), {
    x: width - margin - 180,
    y: statementNoY,
    size: 10,
    font: boldFont,
  });
  page.drawText(toPdfText(`Date: ${statementDate}`), {
    x: width - margin - 180,
    y: dateY,
    size: 10,
    font,
  });
  lowestY = Math.min(lowestY, dateY - 12);

  return lowestY - HEADER_TABLE_GAP;
}

function drawTableHeader(ctx: RenderContext, y: number): number {
  const { page, font, boldFont, margin, width, settings } = ctx;
  const primary = hexToRgb(settings.primaryColor);
  const cols = [margin, margin + 70, margin + 220, margin + 340, margin + 400, margin + 460];

  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: width - margin * 2,
    height: 18,
    color: primary,
    opacity: 0.15,
  });

  const headers = ["Date", "Description", "Reference", "Debit", "Credit", "Balance"];
  headers.forEach((header, i) => {
    page.drawText(header, { x: cols[i], y: y - 12, size: 8, font: boldFont });
  });

  return y - ROW_HEIGHT;
}

function drawTableRow(
  ctx: RenderContext,
  tx: Transaction,
  y: number,
): number {
  const { page, font, margin } = ctx;
  const cols = [margin, margin + 70, margin + 220, margin + 340, margin + 400, margin + 460];

  const values = [
    formatDisplayDate(tx.date, ctx.settings.dateFormat),
    tx.description.slice(0, 28),
    tx.reference.slice(0, 14),
    tx.debit ? formatCurrencyForPdf(tx.debit, ctx.settings.currency) : "-",
    tx.credit ? formatCurrencyForPdf(tx.credit, ctx.settings.currency) : "-",
    formatCurrencyForPdf(tx.balance, ctx.settings.currency),
  ];

  values.forEach((value, i) => {
    page.drawText(toPdfText(value), { x: cols[i], y: y - 12, size: 8, font });
  });

  return y - ROW_HEIGHT;
}

function drawSummaryFooter(
  ctx: RenderContext,
  totals: { debit: number; credit: number; balance: number },
) {
  const { page, font, boldFont, margin, settings } = ctx;
  const footerExtra = settings.footer ? SETTINGS_FOOTER_HEIGHT : 0;
  const baseY = margin + PAGE_NUMBER_HEIGHT + footerExtra;

  page.drawLine({
    start: { x: margin, y: baseY + SUMMARY_FOOTER_HEIGHT - 10 },
    end: { x: ctx.width - margin, y: baseY + SUMMARY_FOOTER_HEIGHT - 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(toPdfText(`Total Debit: ${formatCurrencyForPdf(totals.debit, settings.currency)}`), {
    x: margin,
    y: baseY + 60,
    size: 9,
    font: boldFont,
  });
  page.drawText(toPdfText(`Total Credit: ${formatCurrencyForPdf(totals.credit, settings.currency)}`), {
    x: margin,
    y: baseY + 46,
    size: 9,
    font: boldFont,
  });
  page.drawText(
    toPdfText(`Closing Balance: ${formatCurrencyForPdf(totals.balance, settings.currency)}`),
    { x: margin, y: baseY + 32, size: 9, font: boldFont },
  );

  page.drawText(toPdfText(`Prepared By: ${settings.preparedBy}`), {
    x: ctx.width - margin - 160,
    y: baseY + 60,
    size: 9,
    font,
  });
  page.drawText("Signature: ___________________", {
    x: ctx.width - margin - 160,
    y: baseY + 40,
    size: 9,
    font,
  });

  if (settings.footer) {
    page.drawText(toPdfText(settings.footer), {
      x: margin,
      y: margin + PAGE_NUMBER_HEIGHT,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
}

function drawPageNumber(ctx: RenderContext) {
  const { page, font, margin } = ctx;
  page.drawText(`Page ${ctx.pageNumber} of ${ctx.totalPages}`, {
    x: ctx.width / 2 - 30,
    y: margin,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

export async function renderInvoicePdf(
  transactions: Transaction[],
  invoiceNumber: string,
  settings: AppSettings,
): Promise<Uint8Array> {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const isLandscape = settings.orientation === "landscape";
  const pageSize: [number, number] = isLandscape ? [842, 595] : [595, 842];
  const margin = 40;

  const logo = await embedImage(pdfDoc, settings.logoBase64);

  let watermarkImage: PDFImage | null = null;
  let watermarkLayout: WatermarkLayout | null = null;
  const watermarkBase64 = getWatermarkBase64(settings);
  if (watermarkBase64) {
    const watermarkBytes = await prepareWatermarkBytes(watermarkBase64);
    if (watermarkBytes) {
      watermarkImage = await embedWatermarkImage(pdfDoc, watermarkBytes);
      if (watermarkImage) {
        watermarkLayout = computeWatermarkLayout(
          pageSize[0],
          pageSize[1],
          watermarkImage,
        );
      }
    }
  }

  const totals = {
    debit: sorted.reduce((s, tx) => s + tx.debit, 0),
    credit: sorted.reduce((s, tx) => s + tx.credit, 0),
    balance: sorted.length > 0 ? sorted[sorted.length - 1].balance : 0,
  };

  const footerExtra = settings.footer ? SETTINGS_FOOTER_HEIGHT : 0;
  const minYContinuation = margin + PAGE_NUMBER_HEIGHT + 10;
  const minYLastPage =
    margin + PAGE_NUMBER_HEIGHT + SUMMARY_FOOTER_HEIGHT + footerExtra;

  let rowIndex = 0;
  let pageNum = 0;
  const pageContexts: RenderContext[] = [];
  const invoiceDate = formatDisplayDate(
    new Date().toISOString().slice(0, 10),
    settings.dateFormat,
  );

  while (rowIndex < sorted.length || pageNum === 0) {
    pageNum++;
    const page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();

    const ctx: RenderContext = {
      page,
      font,
      boldFont,
      width,
      height,
      margin,
      settings,
      pageNumber: pageNum,
      totalPages: 0,
    };

    if (watermarkImage && watermarkLayout) {
      drawWatermark(page, watermarkImage, watermarkLayout);
    }

    let y: number;
    if (pageNum === 1) {
      y = drawHeader(ctx, invoiceNumber, invoiceDate, logo);
    } else {
      y = height - margin - 20;
    }
    y = drawTableHeader(ctx, y);

    while (rowIndex < sorted.length) {
      const remainingAfterThis = sorted.length - rowIndex - 1;
      const minY = remainingAfterThis === 0 ? minYLastPage : minYContinuation;
      if (y - ROW_HEIGHT < minY) break;

      y = drawTableRow(ctx, sorted[rowIndex], y);
      rowIndex++;
    }

    pageContexts.push(ctx);
  }

  const totalPages = pageContexts.length;
  for (const [index, ctx] of pageContexts.entries()) {
    ctx.pageNumber = index + 1;
    ctx.totalPages = totalPages;
    if (index === totalPages - 1) {
      drawSummaryFooter(ctx, totals);
    }
    drawPageNumber(ctx);
  }

  return pdfDoc.save();
}
