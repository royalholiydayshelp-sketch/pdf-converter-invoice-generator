import { z } from "zod";

export const salesInvoiceLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  qty: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export type SalesInvoiceLineItem = z.infer<typeof salesInvoiceLineItemSchema>;

export const salesInvoiceStatusSchema = z.enum(["draft", "finalized"]);

export type SalesInvoiceStatus = z.infer<typeof salesInvoiceStatusSchema>;

export const salesInvoiceTemplateSchema = z.literal("default");

export type SalesInvoiceTemplate = z.infer<typeof salesInvoiceTemplateSchema>;

export const salesInvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  status: salesInvoiceStatusSchema,
  invoiceDate: z.string(),
  referenceNumber: z.string(),
  billToName: z.string(),
  billToPhone: z.string(),
  billToAddress: z.string(),
  billToEmail: z.string(),
  shipToDescription: z.string(),
  lineItems: z.array(salesInvoiceLineItemSchema).min(1),
  remarks: z.string(),
  discount: z.number().min(0),
  taxRatePercent: z.number().min(0),
  roundAdjustment: z.number(),
  subtotal: z.number(),
  subtotalLessDiscount: z.number(),
  totalTax: z.number(),
  balanceDue: z.number(),
  templateId: salesInvoiceTemplateSchema,
  pdfBlobKey: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;

export const salesInvoiceFormSchema = z.object({
  invoiceDate: z.string().min(1),
  referenceNumber: z.string(),
  billToName: z.string().min(1, "Customer name is required"),
  billToPhone: z.string(),
  billToAddress: z.string(),
  billToEmail: z.string(),
  shipToDescription: z.string(),
  lineItems: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      qty: z.number().min(0),
      unitPrice: z.number().min(0),
    }),
  ).min(1),
  remarks: z.string(),
  discount: z.number().min(0),
  taxRatePercent: z.number().min(0),
  autoRound: z.boolean(),
  roundAdjustment: z.number(),
});

export type SalesInvoiceFormValues = z.infer<typeof salesInvoiceFormSchema>;

export const DEFAULT_LINE_ITEM = (): SalesInvoiceLineItem => ({
  id: crypto.randomUUID(),
  description: "",
  qty: 1,
  unitPrice: 0,
  total: 0,
});

export const DEFAULT_SALES_INVOICE_FORM: SalesInvoiceFormValues = {
  invoiceDate: new Date().toISOString().slice(0, 10),
  referenceNumber: "",
  billToName: "",
  billToPhone: "",
  billToAddress: "",
  billToEmail: "",
  shipToDescription: "",
  lineItems: [DEFAULT_LINE_ITEM()],
  remarks: "",
  discount: 0,
  taxRatePercent: 18,
  autoRound: true,
  roundAdjustment: 0,
};
