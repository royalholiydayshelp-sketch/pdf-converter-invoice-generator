"use client";

import { StatCards } from "@/components/charts/stat-cards";
import { MonthlyCharts } from "@/components/charts/monthly-charts";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight } from "lucide-react";

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
            Overview of your bank transactions and invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
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
