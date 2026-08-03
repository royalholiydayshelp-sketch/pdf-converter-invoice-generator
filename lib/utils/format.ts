import { parse, isValid, format } from "date-fns";

const DATE_FORMATS = [
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "MM/dd/yyyy",
  "yyyy-MM-dd",
  "dd-MM-yyyy",
  "d-M-yyyy",
];

export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^'+|'+$/g, "");
}

export function parseFlexibleDate(value: string): string | null {
  const trimmed = sanitizeCsvValue(value);
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  for (const fmt of DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  const fallback = new Date(trimmed);
  if (isValid(fallback)) {
    return format(fallback, "yyyy-MM-dd");
  }

  return null;
}

export function parseAmount(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : NaN;
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** WinAnsi-safe currency for pdf-lib StandardFonts (no ₹, etc.). */
const PDF_CURRENCY_PREFIX: Record<string, string> = {
  INR: "Rs.",
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
};

export function formatCurrencyForPdf(amount: number, currency = "INR"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const prefix = PDF_CURRENCY_PREFIX[currency];
  if (prefix) {
    return currency === "INR" ? `${prefix} ${number}` : `${prefix}${number}`;
  }
  return `${currency} ${number}`;
}

/** Replace characters that StandardFonts (WinAnsi) cannot encode. */
export function toPdfText(text: string): string {
  return text
    .replace(/\u20B9/g, "Rs.")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, "?");
}

export function formatDisplayDate(
  isoDate: string,
  dateFormat = "dd/MM/yyyy",
): string {
  const parsed = parse(isoDate, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return isoDate;
  return format(parsed, dateFormat);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
