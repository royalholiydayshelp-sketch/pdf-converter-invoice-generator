import { z } from "zod";

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  generatedDate: z.string(),
  generatedBy: z.string(),
  transactionIds: z.array(z.string()),
  pdfBlobKey: z.string(),
  pdfFileName: z.string(),
  totalDebit: z.number(),
  totalCredit: z.number(),
  closingBalance: z.number(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

export type InvoiceGenerationMode =
  | "single"
  | "selected"
  | "date"
  | "dates"
  | "month"
  | "range"
  | "all";
