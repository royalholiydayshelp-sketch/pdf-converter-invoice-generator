export type {
  Transaction,
  CanonicalField,
  ColumnMapping,
} from "@/models/transaction";
export type { ImportRecord } from "@/models/import-record";
export type { Invoice, InvoiceGenerationMode } from "@/models/invoice";
export type { SalesInvoice, SalesInvoiceLineItem, SalesInvoiceFormValues, PaymentStatus, PaymentMode } from "@/models/sales-invoice";
export type { AppSettings } from "@/models/settings";

export interface ImportSummary {
  imported: number;
  skippedDuplicates: number;
  totalRecords: number;
  errors: string[];
}

export interface DashboardStats {
  totalTransactions: number;
  totalCredit: number;
  totalDebit: number;
  currentBalance: number;
  importedFiles: number;
  generatedPdfs: number;
}

export interface MonthlyStats {
  month: string;
  debit: number;
  credit: number;
  count: number;
}

export interface TransactionFilters {
  search: string;
  datePreset: DatePreset;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  descriptionContains: string;
  reference: string;
  typeFilter: "all" | "credit" | "debit";
}

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface BackupData {
  version: 1 | 2;
  exportedAt: string;
  transactions: import("@/models/transaction").Transaction[];
  imports: import("@/models/import-record").ImportRecord[];
  invoices: import("@/models/invoice").Invoice[];
  salesInvoices?: import("@/models/sales-invoice").SalesInvoice[];
  settings: import("@/models/settings").AppSettings;
  pdfBlobs: Record<string, string>;
}
