import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { AppSettings } from "@/models/settings";
import type { SalesInvoice } from "@/models/sales-invoice";
import { PAYMENT_MODE_LABELS, PAYMENT_STATUS_LABELS } from "@/models/sales-invoice";
import {
  formatCurrencyForPdf,
  formatDisplayDate,
  toPdfText,
} from "@/lib/utils/format";
import {
  drawWatermark,
  loadWatermarkImage,
  type WatermarkLayout,
} from "@/lib/pdf/pdf-watermark";

const MARGIN = 48;
const LOGO_MAX = 56;
const SECTION_GAP = 24;
const TABLE_FOOTER_GAP = 40;
const TABLE_ROW_HEIGHT = 22;
const TOTALS_ROW_HEIGHT = 16;
const TOTALS_BLOCK_WIDTH = 210;
const FOOTER_MIN_Y = 200;

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  return rgb(
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  );
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

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

interface DrawContext {
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  width: number;
  height: number;
  settings: AppSettings;
  primary: ReturnType<typeof rgb>;
}

function drawRightAlignedText(
  page: PDFPage,
  text: string,
  xRight: number,
  y: number,
  size: number,
  font: PDFFont,
  color?: ReturnType<typeof rgb>,
) {
  const safe = toPdfText(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, {
    x: xRight - textWidth,
    y,
    size,
    font,
    color,
  });
}

function drawCompanyHeader(
  ctx: DrawContext,
  invoice: SalesInvoice,
  logo: PDFImage | null,
) {
  const { page, font, boldFont, width, height, settings, primary } = ctx;
  const top = height - MARGIN;
  let logoBottom = top;

  if (logo) {
    const dims = logo.scaleToFit(LOGO_MAX, LOGO_MAX);
    page.drawImage(logo, {
      x: MARGIN,
      y: top - dims.height,
      width: dims.width,
      height: dims.height,
    });
    logoBottom = top - dims.height;
  }

  const textX = logo ? MARGIN + LOGO_MAX + 16 : MARGIN;
  let y = top - 12;
  page.drawText(toPdfText(settings.companyName), {
    x: textX,
    y,
    size: 13,
    font: boldFont,
    color: primary,
    maxWidth: width - textX - 130,
  });

  y -= 18;
  const addressLines = wrapText(settings.address, 48);
  for (const line of addressLines.slice(0, 3)) {
    page.drawText(toPdfText(line), {
      x: textX,
      y,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 12;
  }

  if (settings.phone) {
    page.drawText(toPdfText(settings.phone), {
      x: textX,
      y,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 12;
  }

  if (settings.email) {
    page.drawText(toPdfText(settings.email), {
      x: textX,
      y,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 12;
  }

  if (settings.gstVat && (invoice.showGst ?? true)) {
    page.drawText(toPdfText(`GST: ${settings.gstVat}`), {
      x: textX,
      y,
      size: 8,
      font: boldFont,
    });
    y -= 12;
  }

  const metaX = width - MARGIN - 155;
  page.drawText("INVOICE", {
    x: width - MARGIN - 95,
    y: top - 18,
    size: 20,
    font: boldFont,
    color: rgb(0.78, 0.78, 0.78),
  });

  page.drawText(
    toPdfText(`DATE: ${formatDisplayDate(invoice.invoiceDate, settings.dateFormat)}`),
    { x: metaX, y: top - 44, size: 9, font: boldFont },
  );

  if (invoice.invoiceNumber) {
    page.drawText(toPdfText(`INVOICE NO. ${invoice.invoiceNumber}`), {
      x: metaX,
      y: top - 58,
      size: 9,
      font: boldFont,
    });
    page.drawText(
      toPdfText(
        `STATUS: ${PAYMENT_STATUS_LABELS[invoice.paymentStatus ?? "nil"]}`,
      ),
      { x: metaX, y: top - 72, size: 9, font },
    );
  }

  return Math.min(y, logoBottom) - SECTION_GAP;
}

function drawCustomerBlocks(ctx: DrawContext, invoice: SalesInvoice, startY: number) {
  const { page, font, boldFont, width } = ctx;
  const showShipTo = invoice.showShipTo ?? true;
  const colWidth = (width - MARGIN * 2 - 32) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colWidth + 32;
  let y = startY;
  let leftBottom = y;
  let rightBottom = y;

  page.drawText("BILL TO", {
    x: leftX,
    y,
    size: 9,
    font: boldFont,
    color: ctx.primary,
  });
  page.drawLine({
    start: { x: leftX, y: y - 3 },
    end: { x: leftX + 56, y: y - 3 },
    thickness: 1,
    color: ctx.primary,
  });

  if (showShipTo) {
    page.drawText("SHIP TO", {
      x: rightX,
      y,
      size: 9,
      font: boldFont,
      color: ctx.primary,
    });
    page.drawLine({
      start: { x: rightX, y: y - 3 },
      end: { x: rightX + 56, y: y - 3 },
      thickness: 1,
      color: ctx.primary,
    });
  }

  y -= 20;
  page.drawText(toPdfText(invoice.billToName), {
    x: leftX,
    y,
    size: 9,
    font: boldFont,
    maxWidth: colWidth - 8,
  });

  if (showShipTo) {
    page.drawText(toPdfText(invoice.shipToDescription), {
      x: rightX,
      y,
      size: 9,
      font,
      maxWidth: colWidth - 8,
    });
    rightBottom = y - 14;
  }

  leftBottom = y - 14;

  if (invoice.billToPhone) {
    leftBottom -= 14;
    page.drawText(toPdfText(invoice.billToPhone), {
      x: leftX,
      y: leftBottom,
      size: 8.5,
      font,
    });
  }
  if (invoice.billToAddress) {
    for (const line of wrapText(invoice.billToAddress, 36)) {
      leftBottom -= 12;
      page.drawText(toPdfText(line), {
        x: leftX,
        y: leftBottom,
        size: 8.5,
        font,
      });
    }
  }
  if (invoice.billToEmail) {
    leftBottom -= 14;
    page.drawText(toPdfText(invoice.billToEmail), {
      x: leftX,
      y: leftBottom,
      size: 8.5,
      font,
    });
  }

  return Math.min(leftBottom, showShipTo ? rightBottom : leftBottom) - SECTION_GAP;
}

function drawLineItemsTable(
  ctx: DrawContext,
  invoice: SalesInvoice,
  startY: number,
): number {
  const { page, font, boldFont, width, primary } = ctx;
  const tableWidth = width - MARGIN * 2;
  const cols = {
    desc: MARGIN + 8,
    qty: MARGIN + tableWidth * 0.55,
    unit: MARGIN + tableWidth * 0.68,
    total: MARGIN + tableWidth * 0.82,
  };

  let y = startY;
  page.drawRectangle({
    x: MARGIN,
    y: y - 18,
    width: tableWidth,
    height: 20,
    color: primary,
    opacity: 0.12,
  });

  const headers = [
    { label: "DESCRIPTION", x: cols.desc },
    { label: "QTY", x: cols.qty },
    { label: "UNIT PRICE", x: cols.unit },
    { label: "TOTAL", x: cols.total },
  ];
  for (const h of headers) {
    page.drawText(h.label, {
      x: h.x,
      y: y - 13,
      size: 8,
      font: boldFont,
      color: primary,
    });
  }
  y -= 30;

  const activeItems = invoice.lineItems.filter(
    (item) => item.description.trim() || item.qty > 0 || item.unitPrice > 0,
  );

  for (const [index, item] of activeItems.entries()) {
    if (y - TABLE_ROW_HEIGHT < FOOTER_MIN_Y) break;

    if (index % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 16,
        width: tableWidth,
        height: TABLE_ROW_HEIGHT,
        color: rgb(0.96, 0.96, 0.96),
      });
    }

    page.drawText(toPdfText(item.description.slice(0, 44)), {
      x: cols.desc,
      y: y - 13,
      size: 8.5,
      font,
    });
    page.drawText(String(item.qty), {
      x: cols.qty,
      y: y - 13,
      size: 8.5,
      font,
    });
    drawRightAlignedText(
      page,
      formatCurrencyForPdf(item.unitPrice, ctx.settings.currency),
      cols.unit + 52,
      y - 13,
      8.5,
      font,
    );
    drawRightAlignedText(
      page,
      formatCurrencyForPdf(item.total, ctx.settings.currency),
      MARGIN + tableWidth - 8,
      y - 13,
      8.5,
      font,
    );
    y -= TABLE_ROW_HEIGHT;
  }

  return y - TABLE_FOOTER_GAP;
}

function drawFooter(ctx: DrawContext, invoice: SalesInvoice, startY: number) {
  const { page, font, boldFont, width, settings, primary } = ctx;
  const totalsLeft = width - MARGIN - TOTALS_BLOCK_WIDTH;
  const valueRight = width - MARGIN - 6;
  let y = Math.max(startY, FOOTER_MIN_Y + 90);

  if (invoice.referenceNumber) {
    const ref = toPdfText(invoice.referenceNumber);
    const refWidth = boldFont.widthOfTextAtSize(ref, 10);
    page.drawText(ref, {
      x: width / 2 - refWidth / 2,
      y,
      size: 10,
      font: boldFont,
    });
    y -= 28;
  }

  const blockTop = y;
  let infoY = blockTop;
  page.drawText("Payment:", {
    x: MARGIN,
    y: infoY,
    size: 8.5,
    font: boldFont,
  });
  infoY -= 14;
  page.drawText(
    toPdfText(PAYMENT_MODE_LABELS[invoice.paymentMode ?? "upi"]),
    {
      x: MARGIN,
      y: infoY,
      size: 8.5,
      font,
    },
  );
  infoY -= 12;

  page.drawText(
    toPdfText(
      `Payment Status: ${PAYMENT_STATUS_LABELS[invoice.paymentStatus ?? "nil"]}`,
    ),
    { x: MARGIN, y: infoY, size: 8.5, font },
  );
  infoY -= 14;

  if (invoice.paymentMode === "upi" && invoice.upiTransactionId.trim()) {
    page.drawText(
      toPdfText(`Transaction ID: ${invoice.upiTransactionId.trim()}`),
      { x: MARGIN, y: infoY, size: 8.5, font },
    );
    infoY -= 14;
  }

  infoY -= 4;
  page.drawText("Remarks / Payment Instructions:", {
    x: MARGIN,
    y: infoY,
    size: 8.5,
    font: boldFont,
  });
  const remarkLines = wrapText(invoice.remarks || "-", 52);
  let remarkY = infoY - 16;
  for (const line of remarkLines.slice(0, 4)) {
    page.drawText(toPdfText(line), {
      x: MARGIN,
      y: remarkY,
      size: 8.5,
      font,
      maxWidth: totalsLeft - MARGIN - 20,
    });
    remarkY -= 12;
  }

  const showTax = invoice.showTax ?? true;
  const totals: Array<[string, string]> = [
    ["SUBTOTAL", formatCurrencyForPdf(invoice.subtotal, settings.currency)],
    ["DISCOUNT", formatCurrencyForPdf(invoice.discount, settings.currency)],
    [
      "SUBTOTAL LESS DISCOUNT",
      formatCurrencyForPdf(invoice.subtotalLessDiscount, settings.currency),
    ],
    ...(showTax
      ? [
          ["TAX RATE", `${invoice.taxRatePercent.toFixed(2)}%`] as [string, string],
          ["TOTAL TAX", formatCurrencyForPdf(invoice.totalTax, settings.currency)] as [
            string,
            string,
          ],
        ]
      : []),
    ["Round", formatCurrencyForPdf(invoice.roundAdjustment, settings.currency)],
  ];

  let totalsY = blockTop;
  for (const [label, value] of totals) {
    const labelSize = label.length > 16 ? 7.5 : 8.5;
    page.drawText(label, {
      x: totalsLeft,
      y: totalsY,
      size: labelSize,
      font,
      maxWidth: 108,
    });
    drawRightAlignedText(page, value, valueRight, totalsY, 8.5, font);
    totalsY -= TOTALS_ROW_HEIGHT;
  }

  totalsY -= 8;
  page.drawRectangle({
    x: totalsLeft - 6,
    y: totalsY - 20,
    width: TOTALS_BLOCK_WIDTH + 6,
    height: 26,
    color: primary,
    opacity: 0.1,
  });
  drawRightAlignedText(
    page,
    formatCurrencyForPdf(invoice.balanceDue, settings.currency),
    valueRight,
    totalsY - 6,
    10,
    boldFont,
    primary,
  );
  page.drawText("Total Amount", {
    x: totalsLeft,
    y: totalsY - 6,
    size: 10,
    font: boldFont,
    color: primary,
  });

  if (settings.footer) {
    page.drawText(toPdfText(settings.footer), {
      x: MARGIN,
      y: MARGIN,
      size: 7.5,
      font,
      color: rgb(0.45, 0.45, 0.45),
      maxWidth: width - MARGIN * 2,
    });
  }
}

export async function renderSalesInvoicePdf(
  invoice: SalesInvoice,
  settings: AppSettings,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595, 842];
  const page = pdfDoc.addPage(pageSize);
  const { width, height } = page.getSize();

  const watermark = await loadWatermarkImage(pdfDoc, settings, width, height);
  if (watermark) {
    drawWatermark(page, watermark.image, watermark.layout);
  }

  const logo = await embedImage(pdfDoc, settings.logoBase64);
  const primary = hexToRgb(settings.primaryColor);

  const ctx: DrawContext = {
    page,
    font,
    boldFont,
    width,
    height,
    settings,
    primary,
  };

  let y = drawCompanyHeader(ctx, invoice, logo);
  y = drawCustomerBlocks(ctx, invoice, y);
  y = drawLineItemsTable(ctx, invoice, y);
  drawFooter(ctx, invoice, y);

  return pdfDoc.save();
}
