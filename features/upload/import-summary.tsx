import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportSummary } from "@/types";

export function ImportSummaryCard({ summary }: { summary: ImportSummary }) {
  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardHeader>
        <CardTitle className="text-base">Import Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">Imported</p>
          <p className="text-2xl font-bold text-green-600">{summary.imported}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Skipped Duplicate</p>
          <p className="text-2xl font-bold text-amber-600">
            {summary.skippedDuplicates}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Records</p>
          <p className="text-2xl font-bold">{summary.totalRecords}</p>
        </div>
        {summary.errors.length > 0 && (
          <div className="col-span-full mt-2 text-sm text-destructive">
            {summary.errors.slice(0, 5).map((err) => (
              <p key={err}>{err}</p>
            ))}
            {summary.errors.length > 5 && (
              <p>...and {summary.errors.length - 5} more errors</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
