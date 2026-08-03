"use client";

import { TransactionsTable } from "@/features/transactions/transactions-table";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          Search, filter, export, and generate invoices from your transactions.
        </p>
      </div>
      <TransactionsTable />
    </div>
  );
}
