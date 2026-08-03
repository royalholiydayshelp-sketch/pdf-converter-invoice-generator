import Dexie, { type EntityTable } from "dexie";
import type { Transaction } from "@/models/transaction";
import type { ImportRecord } from "@/models/import-record";
import type { Invoice } from "@/models/invoice";
import type { AppSettings } from "@/models/settings";
import { DEFAULT_SETTINGS } from "@/models/settings";

export interface PdfBlob {
  key: string;
  data: ArrayBuffer;
}

class StatementInvoiceDB extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  imports!: EntityTable<ImportRecord, "id">;
  invoices!: EntityTable<Invoice, "id">;
  settings!: EntityTable<AppSettings, "id">;
  pdfBlobs!: EntityTable<PdfBlob, "key">;

  constructor() {
    super("StatementInvoiceDB");
    this.version(1).stores({
      transactions:
        "id, date, description, reference, transactionId, sourceFile, uploadedAt, invoiceGenerated, [date+description]",
      imports: "id, fileName, importDate",
      invoices: "id, invoiceNumber, generatedDate",
      settings: "id",
      pdfBlobs: "key",
    });
  }
}

export const db = new StatementInvoiceDB();

export async function ensureDefaultSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("singleton");
  if (existing) {
    if (existing.companyName === "My Company") {
      const logoBase64 = existing.logoBase64 || (await loadDefaultLogoBase64());
      const settings = { ...DEFAULT_SETTINGS, logoBase64, invoiceCounter: existing.invoiceCounter };
      await db.settings.put(settings);
      return settings;
    }
    return existing;
  }

  const logoBase64 = await loadDefaultLogoBase64();
  const settings = { ...DEFAULT_SETTINGS, logoBase64 };
  await db.settings.put(settings);
  return settings;
}

async function loadDefaultLogoBase64(): Promise<string> {
  try {
    const response = await fetch("/royal-holidays-logo.jpeg");
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}
