import { db } from "@/lib/database/db";
import { getSettings } from "@/lib/database/repository";
import type { SalesInvoice } from "@/models/sales-invoice";

export async function reserveSalesInvoiceNumber(): Promise<string> {
  return db.transaction("rw", db.settings, async () => {
    const settings = await getSettings();
    const next = settings.salesInvoiceCounter + 1;
    const padded = String(next).padStart(7, "0");
    const invoiceNumber = `${settings.salesInvoicePrefix}${padded}`;
    await db.settings.put({ ...settings, salesInvoiceCounter: next });
    return invoiceNumber;
  });
}

export async function saveSalesInvoice(
  invoice: SalesInvoice,
  pdfData?: ArrayBuffer,
): Promise<void> {
  await db.transaction("rw", db.salesInvoices, db.pdfBlobs, async () => {
    await db.salesInvoices.put(invoice);
    if (pdfData && invoice.pdfBlobKey) {
      await db.pdfBlobs.put({ key: invoice.pdfBlobKey, data: pdfData });
    }
  });
}

export async function getSalesInvoices(): Promise<SalesInvoice[]> {
  return db.salesInvoices.orderBy("updatedAt").reverse().toArray();
}

export async function getSalesInvoice(id: string): Promise<SalesInvoice | undefined> {
  return db.salesInvoices.get(id);
}

export async function deleteSalesInvoice(id: string): Promise<void> {
  const invoice = await db.salesInvoices.get(id);
  if (!invoice) return;
  await db.transaction("rw", db.salesInvoices, db.pdfBlobs, async () => {
    await db.salesInvoices.delete(id);
    if (invoice.pdfBlobKey) {
      await db.pdfBlobs.delete(invoice.pdfBlobKey);
    }
  });
}

export async function getSalesInvoicePdf(key: string): Promise<ArrayBuffer | null> {
  const blob = await db.pdfBlobs.get(key);
  return blob?.data ?? null;
}
