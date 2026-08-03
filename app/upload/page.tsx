"use client";

import { CsvDropzone } from "@/features/upload/csv-dropzone";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload CSV</h1>
        <p className="text-muted-foreground">
          Import bank statement CSV files. Duplicates are automatically skipped.
        </p>
      </div>
      <CsvDropzone />
    </div>
  );
}
