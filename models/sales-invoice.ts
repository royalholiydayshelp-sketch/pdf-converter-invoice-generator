import { z } from "zod";
import { format } from "date-fns";

export function generateDefaultInvoiceNumber(date = new Date()): string {
  return format(date, "ddMMyyyyHHmmss");
}

export function resolveInvoiceNumber(value: string, date = new Date()): string {
  const trimmed = value.trim();
  return trimmed || generateDefaultInvoiceNumber(date);
}

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

export const paymentModeSchema = z.enum(["upi", "credit_card", "debit_card"]);

export type PaymentMode = z.infer<typeof paymentModeSchema>;

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  upi: "UPI",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
};

export const paymentStatusSchema = z.enum(["paid", "unpaid", "nil"]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  nil: "Nil",
};

export const salesInvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  status: salesInvoiceStatusSchema,
  invoiceDate: z.string(),
  paymentStatus: paymentStatusSchema,
  referenceNumber: z.string(),
  billToName: z.string(),
  billToPhone: z.string(),
  billToAddress: z.string(),
  billToEmail: z.string(),
  shipToDescription: z.string(),
  lineItems: z.array(salesInvoiceLineItemSchema).min(1),
  paymentMode: paymentModeSchema,
  upiTransactionId: z.string(),
  remarks: z.string(),
  discount: z.number().min(0),
  taxRatePercent: z.number().min(0),
  roundAdjustment: z.number(),
  subtotal: z.number(),
  subtotalLessDiscount: z.number(),
  totalTax: z.number(),
  balanceDue: z.number(),
  showShipTo: z.boolean(),
  showTax: z.boolean(),
  showGst: z.boolean(),
  templateId: salesInvoiceTemplateSchema,
  pdfBlobKey: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;

export const salesInvoiceFormSchema = z
  .object({
    invoiceNumber: z.string(),
    invoiceDate: z.string().min(1),
    paymentStatus: paymentStatusSchema,
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
    paymentMode: paymentModeSchema,
    upiTransactionId: z.string(),
    remarks: z.string(),
    discount: z.number().min(0),
    taxRatePercent: z.number().min(0),
    autoRound: z.boolean(),
    roundAdjustment: z.number(),
    showShipTo: z.boolean(),
    showTax: z.boolean(),
    showGst: z.boolean(),
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
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  paymentStatus: "nil",
  referenceNumber: "",
  billToName: "",
  billToPhone: "",
  billToAddress: "",
  billToEmail: "",
  shipToDescription: "",
  lineItems: [DEFAULT_LINE_ITEM()],
  paymentMode: "upi",
  upiTransactionId: "",
  remarks: "",
  discount: 0,
  taxRatePercent: 18,
  autoRound: true,
  roundAdjustment: 0,
  showShipTo: true,
  showTax: true,
  showGst: true,
};
