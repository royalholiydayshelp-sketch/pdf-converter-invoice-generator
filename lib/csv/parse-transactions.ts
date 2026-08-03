import Papa from "papaparse";
import type { Transaction, ColumnMapping } from "@/models/transaction";
import {
  detectColumnMapping,
  mappingIsComplete,
  normalizeRow,
} from "@/lib/csv/normalize-row";
import {
  applyRunningBalances,
  isMerchantPaymentCsv,
} from "@/lib/csv/merchant-format";

export interface ParseCsvResult {
  headers: string[];
  mapping: ColumnMapping;
  rows: Record<string, string>[];
  needsMapping: boolean;
  format: "merchant" | "bank";
}

export interface ParsedTransactionsResult {
  transactions: Transaction[];
  errors: string[];
  mapping: ColumnMapping;
}

export function parseCsvText(text: string): ParseCsvResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(result.errors[0]?.message ?? "Invalid CSV file");
  }

  const headers = result.meta.fields ?? [];
  const mapping = detectColumnMapping(headers);
  const merchant = isMerchantPaymentCsv(headers);

  return {
    headers,
    mapping,
    rows: result.data,
    needsMapping: !mappingIsComplete(mapping, headers),
    format: merchant ? "merchant" : "bank",
  };
}

export function convertRowsToTransactions(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  sourceFile: string,
  headers: string[] = [],
): ParsedTransactionsResult {
  const transactions: Transaction[] = [];
  const errors: string[] = [];
  const merchant = isMerchantPaymentCsv(headers);

  rows.forEach((row, index) => {
    const normalized = normalizeRow(row, mapping, sourceFile, headers);
    if (!normalized) {
      errors.push(`Row ${index + 2}: invalid or skipped row`);
      return;
    }
    transactions.push({
      ...normalized,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
      invoiceGenerated: false,
    });
  });

  const withBalances = merchant
    ? applyRunningBalances(transactions)
    : transactions;

  return { transactions: withBalances, errors, mapping };
}

export async function parseCsvFile(file: File): Promise<ParseCsvResult> {
  const text = await file.text();
  if (!text.trim()) {
    throw new Error("Empty CSV file");
  }
  return parseCsvText(text);
}
