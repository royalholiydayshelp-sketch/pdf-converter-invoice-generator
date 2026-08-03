"use client";

import { useCallback, useState } from "react";
import { InvoiceHistory } from "@/features/invoices/invoice-history";
import { GenerateInvoiceMenu } from "@/features/invoices/generate-invoice-menu";

export default function StatementsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleGenerated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statement History</h1>
          <p className="text-muted-foreground">
            Create new PDFs and manage previously generated statements.
          </p>
        </div>
        <GenerateInvoiceMenu
          selectedIds={[]}
          createOnly
          onGenerated={handleGenerated}
        />
      </div>
      <InvoiceHistory refreshToken={refreshKey} />
    </div>
  );
}
