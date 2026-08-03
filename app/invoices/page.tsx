"use client";

import { InvoiceHistory } from "@/features/invoices/invoice-history";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice History</h1>
        <p className="text-muted-foreground">
          View, preview, download, and manage generated invoices.
        </p>
      </div>
      <InvoiceHistory />
    </div>
  );
}
