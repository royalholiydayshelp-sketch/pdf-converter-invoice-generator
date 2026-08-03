"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseCsvFile, convertRowsToTransactions } from "@/lib/csv/parse-transactions";
import { bulkImportTransactions } from "@/lib/database/repository";
import type { ColumnMapping } from "@/models/transaction";
import type { ImportSummary } from "@/types";
import { ColumnMapper } from "@/features/upload/column-mapper";
import { ImportSummaryCard } from "@/features/upload/import-summary";
import { Button } from "@/components/ui/button";

interface PendingFile {
  file: File;
  headers: string[];
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  needsMapping: boolean;
}

export function CsvDropzone({ onImported }: { onImported?: () => void }) {
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  const processFile = useCallback(async (file: File) => {
    try {
      const parsed = await parseCsvFile(file);
      if (parsed.rows.length === 0) {
        toast.error("CSV file has no data rows");
        return;
      }
      setPending({
        file,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping: parsed.mapping,
        needsMapping: parsed.needsMapping,
      });
      setSummary(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse CSV");
    }
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        await processFile(file);
      }
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: true,
  });

  const handleImport = async () => {
    if (!pending) return;
    setImporting(true);
    try {
      const { transactions, errors } = convertRowsToTransactions(
        pending.rows,
        pending.mapping,
        pending.file.name,
        pending.headers,
      );

      if (transactions.length === 0) {
        toast.error("No valid transactions found in CSV");
        return;
      }

      const { imported, duplicates } = await bulkImportTransactions(
        transactions,
        {
          id: crypto.randomUUID(),
          fileName: pending.file.name,
          importDate: new Date().toISOString(),
        },
      );

      const result: ImportSummary = {
        imported,
        skippedDuplicates: duplicates,
        totalRecords: imported + duplicates,
        errors,
      };

      setSummary(result);
      setPending(null);
      onImported?.();

      toast.success(
        `Imported ${imported}, skipped ${duplicates} duplicates`,
      );

      if (errors.length > 0) {
        toast.warning(`${errors.length} rows had validation errors`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Drag & drop CSV files here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse — supports multiple files
        </p>
      </div>

      {pending && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{pending.file.name}</h3>
            <span className="text-sm text-muted-foreground">
              ({pending.rows.length} rows)
            </span>
          </div>

          {pending.needsMapping && (
            <ColumnMapper
              headers={pending.headers}
              mapping={pending.mapping}
              onChange={(mapping) => setPending({ ...pending, mapping })}
            />
          )}

          <Button
            className="mt-4"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? "Importing..." : "Import Transactions"}
          </Button>
        </div>
      )}

      {summary && <ImportSummaryCard summary={summary} />}
    </div>
  );
}
