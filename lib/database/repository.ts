import { db } from "@/lib/database/db";
import type { Transaction } from "@/models/transaction";
import type { ImportRecord } from "@/models/import-record";
import type { Invoice } from "@/models/invoice";
import type { AppSettings } from "@/models/settings";
import type { DashboardStats, MonthlyStats, TransactionFilters } from "@/types";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";

function normalizeDescription(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildDuplicateKey(transaction: Pick<
  Transaction,
  "transactionId" | "reference" | "date" | "debit" | "credit" | "description"
>): string {
  if (transaction.transactionId.trim()) {
    return `tid:${transaction.transactionId.trim()}`;
  }
  const amount = transaction.debit > 0 ? transaction.debit : transaction.credit;
  return [
    transaction.reference.trim(),
    transaction.date,
    amount.toFixed(2),
    normalizeDescription(transaction.description),
  ].join("|");
}

function getDateRange(filters: TransactionFilters): { from?: Date; to?: Date } {
  const now = new Date();
  switch (filters.datePreset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "thisWeek":
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "lastMonth": {
      const last = subMonths(now, 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    }
    case "custom":
      return {
        from: filters.dateFrom ? startOfDay(parseISO(filters.dateFrom)) : undefined,
        to: filters.dateTo ? endOfDay(parseISO(filters.dateTo)) : undefined,
      };
    default:
      return {};
  }
}

export function matchesFilters(
  transaction: Transaction,
  filters: TransactionFilters,
): boolean {
  const { from, to } = getDateRange(filters);
  const txDate = parseISO(transaction.date);

  if (from && txDate < from) return false;
  if (to && txDate > to) return false;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    const haystack = [
      transaction.description,
      transaction.reference,
      transaction.transactionId,
      transaction.sourceFile,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.descriptionContains) {
    if (
      !transaction.description
        .toLowerCase()
        .includes(filters.descriptionContains.toLowerCase())
    ) {
      return false;
    }
  }

  if (filters.reference) {
    if (
      !transaction.reference
        .toLowerCase()
        .includes(filters.reference.toLowerCase())
    ) {
      return false;
    }
  }

  const amount = Math.max(transaction.debit, transaction.credit);
  if (filters.amountMin !== undefined && amount < filters.amountMin) return false;
  if (filters.amountMax !== undefined && amount > filters.amountMax) return false;

  if (filters.typeFilter === "credit" && transaction.credit <= 0) return false;
  if (filters.typeFilter === "debit" && transaction.debit <= 0) return false;

  return true;
}

export async function getExistingDuplicateKeys(): Promise<Set<string>> {
  const all = await db.transactions.toArray();
  return new Set(all.map(buildDuplicateKey));
}

export async function bulkImportTransactions(
  transactions: Transaction[],
  importRecord: Omit<ImportRecord, "records" | "duplicates">,
): Promise<{ imported: number; duplicates: number }> {
  const existingKeys = await getExistingDuplicateKeys();
  const newRecords: Transaction[] = [];
  let duplicates = 0;

  for (const tx of transactions) {
    const key = buildDuplicateKey(tx);
    if (existingKeys.has(key)) {
      duplicates++;
      continue;
    }
    existingKeys.add(key);
    newRecords.push(tx);
  }

  const batchSize = 500;
  for (let i = 0; i < newRecords.length; i += batchSize) {
    await db.transactions.bulkAdd(newRecords.slice(i, i + batchSize));
  }

  await db.imports.add({
    ...importRecord,
    records: newRecords.length,
    duplicates,
  });
  return { imported: newRecords.length, duplicates };
}

export async function queryTransactions(
  filters: TransactionFilters,
  sortField: keyof Transaction = "date",
  sortDesc = true,
  page = 0,
  pageSize = 50,
): Promise<{ rows: Transaction[]; total: number }> {
  let collection = db.transactions.orderBy(sortField as "date");
  if (sortDesc) collection = collection.reverse();

  const all = await collection.toArray();
  const filtered = all.filter((tx) => matchesFilters(tx, filters));
  const start = page * pageSize;
  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
  };
}

export async function getFilteredTransactions(
  filters: TransactionFilters,
): Promise<Transaction[]> {
  const all = await db.transactions.toArray();
  return all.filter((tx) => matchesFilters(tx, filters));
}

export async function getTransactionsByIds(ids: string[]): Promise<Transaction[]> {
  const results = await Promise.all(ids.map((id) => db.transactions.get(id)));
  return results.filter((tx): tx is Transaction => Boolean(tx));
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  await db.transactions.bulkDelete(ids);
}

export async function markTransactionsInvoiced(ids: string[]): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    for (const id of ids) {
      await db.transactions.update(id, { invoiceGenerated: true });
    }
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [transactions, imports, invoices] = await Promise.all([
    db.transactions.toArray(),
    db.imports.toArray(),
    db.invoices.toArray(),
  ]);

  const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
  const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
  const currentBalance = totalCredit - totalDebit;

  return {
    totalTransactions: transactions.length,
    totalCredit,
    totalDebit,
    currentBalance,
    importedFiles: imports.length,
    generatedPdfs: invoices.length,
  };
}

export async function getMonthlyStats(): Promise<MonthlyStats[]> {
  const transactions = await db.transactions.toArray();
  const map = new Map<string, MonthlyStats>();

  for (const tx of transactions) {
    const month = format(parseISO(tx.date), "yyyy-MM");
    const existing = map.get(month) ?? {
      month,
      debit: 0,
      credit: 0,
      count: 0,
    };
    existing.debit += tx.debit;
    existing.credit += tx.credit;
    existing.count += 1;
    map.set(month, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get("singleton");
  return settings ?? (await import("@/lib/database/db").then((m) => m.ensureDefaultSettings()));
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put(settings);
}

export async function reserveInvoiceNumber(): Promise<string> {
  return db.transaction("rw", db.settings, async () => {
    const settings = await getSettings();
    const next = settings.invoiceCounter + 1;
    const year = new Date().getFullYear();
    const invoiceNumber = `${settings.invoicePrefix}-${year}-${String(next).padStart(5, "0")}`;
    await db.settings.put({ ...settings, invoiceCounter: next });
    return invoiceNumber;
  });
}

export async function saveInvoice(
  invoice: Invoice,
  pdfData: ArrayBuffer,
): Promise<void> {
  await db.transaction("rw", db.invoices, db.pdfBlobs, async () => {
    await db.invoices.add(invoice);
    await db.pdfBlobs.put({ key: invoice.pdfBlobKey, data: pdfData });
  });
}

export async function getInvoices(): Promise<Invoice[]> {
  return db.invoices.orderBy("generatedDate").reverse().toArray();
}

export async function getInvoicePdf(key: string): Promise<ArrayBuffer | null> {
  const blob = await db.pdfBlobs.get(key);
  return blob?.data ?? null;
}

export async function deleteInvoice(id: string): Promise<void> {
  const invoice = await db.invoices.get(id);
  if (!invoice) return;
  await db.transaction("rw", db.invoices, db.pdfBlobs, async () => {
    await db.invoices.delete(id);
    await db.pdfBlobs.delete(invoice.pdfBlobKey);
  });
}

export async function exportDatabase() {
  const [transactions, imports, invoices, salesInvoices, settings, pdfBlobRecords] =
    await Promise.all([
      db.transactions.toArray(),
      db.imports.toArray(),
      db.invoices.toArray(),
      db.salesInvoices.toArray(),
      getSettings(),
      db.pdfBlobs.toArray(),
    ]);

  const pdfBlobs: Record<string, string> = {};
  for (const blob of pdfBlobRecords) {
    const bytes = new Uint8Array(blob.data);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    pdfBlobs[blob.key] = btoa(binary);
  }

  return {
    version: 2 as const,
    exportedAt: new Date().toISOString(),
    transactions,
    imports,
    invoices,
    salesInvoices,
    settings,
    pdfBlobs,
  };
}

export async function importDatabase(data: {
  transactions?: Transaction[];
  imports?: ImportRecord[];
  invoices?: Invoice[];
  salesInvoices?: import("@/models/sales-invoice").SalesInvoice[];
  settings?: AppSettings;
  pdfBlobs?: Record<string, string>;
}): Promise<void> {
  await db.transaction(
    "rw",
    db.transactions,
    db.imports,
    db.invoices,
    db.settings,
    db.pdfBlobs,
    async () => {
      if (data.settings) await db.settings.put(data.settings);
      if (data.imports?.length) await db.imports.bulkPut(data.imports);
      if (data.invoices?.length) await db.invoices.bulkPut(data.invoices);
      if (data.pdfBlobs) {
        for (const [key, base64] of Object.entries(data.pdfBlobs)) {
          const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          await db.pdfBlobs.put({ key, data: buffer.buffer });
        }
      }
      if (data.transactions?.length) {
        const existingKeys = await getExistingDuplicateKeys();
        const newRecords = data.transactions.filter((tx) => {
          const key = buildDuplicateKey(tx);
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });
        await db.transactions.bulkPut(newRecords);
      }
    },
  );

  if (data.salesInvoices?.length) {
    await db.salesInvoices.bulkPut(data.salesInvoices);
  }
}
