import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  description: z.string(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  balance: z.number(),
  reference: z.string(),
  transactionId: z.string(),
  sourceFile: z.string(),
  uploadedAt: z.string(),
  invoiceGenerated: z.boolean().default(false),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const CANONICAL_FIELDS = [
  "date",
  "description",
  "debit",
  "credit",
  "balance",
  "reference",
  "transactionId",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export type ColumnMapping = Partial<Record<CanonicalField, string>>;
