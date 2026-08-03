"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/format";
import type { DashboardStats } from "@/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileStack,
  FileText,
  Landmark,
  Receipt,
} from "lucide-react";

interface StatCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
  currency?: string;
}

const cards = [
  { key: "totalTransactions", label: "Total Transactions", icon: Receipt },
  { key: "totalCredit", label: "Total Credit", icon: ArrowDownLeft },
  { key: "totalDebit", label: "Total Debit", icon: ArrowUpRight },
  { key: "currentBalance", label: "Current Balance", icon: Landmark },
  { key: "importedFiles", label: "Imported Files", icon: FileStack },
  { key: "generatedPdfs", label: "Generated PDFs", icon: FileText },
] as const;

export function StatCards({ stats, loading, currency = "INR" }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ key, label, icon: Icon }) => (
        <Card key={key} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading || !stats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {key === "totalCredit" ||
                key === "totalDebit" ||
                key === "currentBalance"
                  ? formatCurrency(stats[key], currency)
                  : stats[key].toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
