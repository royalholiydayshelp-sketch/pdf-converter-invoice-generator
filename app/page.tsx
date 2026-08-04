"use client";

import { StatCards } from "@/components/charts/stat-cards";
import { MonthlyCharts } from "@/components/charts/monthly-charts";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight, Receipt, FileText } from "lucide-react";

export default function DashboardPage() {
  const { stats, monthly, loading, refresh } = useDashboardStats();
  const { settings } = useSettings();

  const largestDebit = monthly.reduce(
    (max, m) => (m.debit > max ? m.debit : max),
    0,
  );
  const largestCredit = monthly.reduce(
    (max, m) => (m.credit > max ? m.credit : max),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your bank transactions and statements
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
          <Link
            href="/invoices/create"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            <Receipt className="h-4 w-4" />
            Create Invoice
          </Link>
          <Link
            href="/upload"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Link>
        </div>
      </div>

      <StatCards
        stats={stats}
        loading={loading}
        currency={settings?.currency}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/invoices/create" className="group">
          <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold group-hover:text-primary">Create Invoice</p>
                <p className="text-xs text-muted-foreground">
                  New sales invoice with PDF
                </p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/invoices" className="group">
          <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold group-hover:text-primary">Invoice History</p>
                <p className="text-xs text-muted-foreground">
                  View drafts and finalized invoices
                </p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/upload" className="group sm:col-span-2 lg:col-span-1">
          <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold group-hover:text-primary">Upload CSV</p>
                <p className="text-xs text-muted-foreground">
                  Import bank transactions
                </p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {!loading && stats && stats.totalTransactions === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              No transactions yet. Upload a bank statement CSV to get started.
            </p>
            <Link
              href="/upload"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Upload your first CSV
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      <MonthlyCharts data={monthly} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Monthly Debit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(
                monthly.length
                  ? monthly.reduce((s, m) => s + m.debit, 0) / monthly.length
                  : 0,
                settings?.currency,
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Monthly Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(
                monthly.length
                  ? monthly.reduce((s, m) => s + m.credit, 0) / monthly.length
                  : 0,
                settings?.currency,
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Largest Debit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(largestDebit, settings?.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Largest Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(largestCredit, settings?.currency)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
