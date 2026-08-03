import { z } from "zod";

export const importRecordSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  importDate: z.string(),
  records: z.number(),
  duplicates: z.number(),
});

export type ImportRecord = z.infer<typeof importRecordSchema>;
