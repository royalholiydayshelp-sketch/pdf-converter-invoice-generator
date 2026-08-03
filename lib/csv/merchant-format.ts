import type { ColumnMapping } from "@/models/transaction";
import { sanitizeCsvValue, parseFlexibleDate, parseAmount } from "@/lib/utils/format";

/** Paytm / PTYES merchant settlement export format */
export const MERCHANT_FORMAT_MARKERS = [
  "Transaction_ID",
  "Transaction_Date",
  "Merchant_Name",
  "Amount",
] as const;

export function isMerchantPaymentCsv(headers: string[]): boolean {
  const normalized = new Set(headers.map((h) => h.trim()));
  return MERCHANT_FORMAT_MARKERS.every((marker) => normalized.has(marker));
}

export function detectMerchantColumnMapping(headers: string[]): ColumnMapping {
  const find = (...names: string[]) =>
    headers.find((h) => names.includes(h.trim()));

  return {
    date: find("Transaction_Date"),
    transactionId: find("Transaction_ID"),
    credit: find("Amount", "Settled_Amount"),
    reference: find("RRN", "Bank_Transaction_ID", "Order_ID", "UTR_No."),
    description: find("Payment_Mode"), // placeholder; description built below
  };
}

export function merchantMappingIsComplete(mapping: ColumnMapping): boolean {
  return Boolean(mapping.date && mapping.transactionId && mapping.credit);
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = sanitizeCsvValue(row[key]);
    if (value) return value;
  }
  return "";
}

export function buildMerchantDescription(row: Record<string, string>): string {
  const paymentMode = pick(row, "Payment_Mode");
  const customerVpa = pick(row, "Customer_VPA");
  const merchantName = pick(row, "Merchant_Name");
  const response = pick(row, "Response_message");
  const orderId = pick(row, "Order_ID");

  const parts = [
    paymentMode,
    customerVpa,
    merchantName,
    response,
    orderId ? `Order ${orderId}` : "",
  ].filter(Boolean);

  return parts.join(" · ") || "Payment received";
}

export function normalizeMerchantRow(
  row: Record<string, string>,
  sourceFile: string,
): Omit<
  import("@/models/transaction").Transaction,
  "id" | "uploadedAt" | "invoiceGenerated" | "balance"
> | null {
  const status = pick(row, "Status");
  if (status && status.toUpperCase() !== "SUCCESS") {
    return null;
  }

  const dateRaw = pick(row, "Transaction_Date", "Settled_Date", "Payout_Date");
  const date = parseFlexibleDate(dateRaw);
  if (!date) return null;

  const amount = parseAmount(pick(row, "Amount", "Settled_Amount", "Total_Bill_Amount"));
  if (Number.isNaN(amount) || amount <= 0) return null;

  const txType = pick(row, "Transaction_Type").toUpperCase();
  const isDebit = txType.includes("REFUND") || txType.includes("DEBIT");

  return {
    date,
    description: buildMerchantDescription(row),
    debit: isDebit ? amount : 0,
    credit: isDebit ? 0 : amount,
    reference: pick(row, "RRN", "Bank_Transaction_ID", "Order_ID", "UTR_No."),
    transactionId: pick(row, "Transaction_ID"),
    sourceFile,
  };
}

export function applyRunningBalances<
  T extends { date: string; debit: number; credit: number; balance: number },
>(transactions: T[]): T[] {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;

  return sorted.map((tx) => {
    running += tx.credit - tx.debit;
    return { ...tx, balance: Math.round(running * 100) / 100 };
  });
}
