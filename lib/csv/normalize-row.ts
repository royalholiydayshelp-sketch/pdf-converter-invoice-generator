import type { Transaction } from "@/models/transaction";
import type { ColumnMapping, CanonicalField } from "@/models/transaction";
import { CANONICAL_FIELDS } from "@/models/transaction";
import { parseFlexibleDate, parseAmount, sanitizeCsvValue } from "@/lib/utils/format";
import {
  isMerchantPaymentCsv,
  detectMerchantColumnMapping,
  merchantMappingIsComplete,
  normalizeMerchantRow,
} from "@/lib/csv/merchant-format";

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  date: [
    "date",
    "transaction date",
    "transaction_date",
    "txn date",
    "value date",
  ],
  description: [
    "description",
    "narration",
    "particulars",
    "details",
    "memo",
    "response_message",
    "merchant_name",
  ],
  debit: ["debit", "withdrawal", "dr", "debit amount"],
  credit: ["credit", "deposit", "cr", "credit amount", "amount", "settled_amount"],
  balance: ["balance", "running balance", "closing balance"],
  reference: [
    "reference",
    "ref",
    "cheque no",
    "utr",
    "utr_no.",
    "rrn",
    "bank_transaction_id",
    "order_id",
  ],
  transactionId: [
    "transaction id",
    "transaction_id",
    "transactionid",
    "txn id",
    "txn_id",
  ],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  if (isMerchantPaymentCsv(headers)) {
    return detectMerchantColumnMapping(headers);
  }

  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const field of CANONICAL_FIELDS) {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader);
    const index = normalizedHeaders.findIndex((header) =>
      aliases.some((alias) => header === alias || header.includes(alias)),
    );
    if (index >= 0) {
      mapping[field] = headers[index];
    }
  }

  return mapping;
}

export function mappingIsComplete(
  mapping: ColumnMapping,
  headers?: string[],
): boolean {
  if (headers && isMerchantPaymentCsv(headers)) {
    return merchantMappingIsComplete(mapping);
  }

  return (
    Boolean(mapping.date) &&
    Boolean(mapping.description) &&
    Boolean(mapping.debit || mapping.credit)
  );
}

export function normalizeRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
  sourceFile: string,
  headers?: string[],
): Omit<Transaction, "id" | "uploadedAt" | "invoiceGenerated"> | null {
  if (headers && isMerchantPaymentCsv(headers)) {
    const merchant = normalizeMerchantRow(row, sourceFile);
    if (!merchant) return null;
    return { ...merchant, balance: 0 };
  }

  const getValue = (field: CanonicalField) => {
    const header = mapping[field];
    return header ? sanitizeCsvValue(row[header]) : "";
  };

  const dateRaw = getValue("date");
  const date = parseFlexibleDate(dateRaw);
  if (!date) return null;

  const debit = parseAmount(getValue("debit"));
  const credit = parseAmount(getValue("credit"));
  if (Number.isNaN(debit) || Number.isNaN(credit)) return null;

  const balanceRaw = getValue("balance");
  const balance = balanceRaw ? parseAmount(balanceRaw) : 0;

  const description = getValue("description") || "No description";

  return {
    date,
    description,
    debit: Number.isNaN(debit) ? 0 : debit,
    credit: Number.isNaN(credit) ? 0 : credit,
    balance: Number.isNaN(balance) ? 0 : balance,
    reference: getValue("reference"),
    transactionId: getValue("transactionId"),
    sourceFile,
  };
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const headers = [
    "Date",
    "Description",
    "Debit",
    "Credit",
    "Balance",
    "Reference",
    "Transaction ID",
    "Source File",
    "Invoice Generated",
  ];
  const rows = transactions.map((tx) =>
    [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.debit || "",
      tx.credit || "",
      tx.balance,
      tx.reference,
      tx.transactionId,
      tx.sourceFile,
      tx.invoiceGenerated ? "Yes" : "No",
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function transactionsToJson(transactions: Transaction[]): string {
  return JSON.stringify(transactions, null, 2);
}
