"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTransactions } from "@/hooks/use-transactions";
import { useFilterStore } from "@/store";
import { formatCurrency, formatDisplayDate, downloadBlob } from "@/lib/utils/format";
import {
  transactionsToCsv,
  transactionsToJson,
} from "@/lib/csv/normalize-row";
import {
  deleteTransactions,
  getFilteredTransactions,
} from "@/lib/database/repository";
import type { Transaction } from "@/models/transaction";
import { toast } from "sonner";
import { Download, Trash2, FileJson, FileSpreadsheet } from "lucide-react";
import { GenerateInvoiceMenu } from "@/features/invoices/generate-invoice-menu";

const PAGE_SIZE = 50;

export function TransactionsTable() {
  const [page, setPage] = useState(0);
  const {
    filters,
    selectedIds,
    setSearch,
    setDatePreset,
    setTypeFilter,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useFilterStore();

  const { rows, total, loading, refresh } = useTransactions(
    filters,
    page,
    PAGE_SIZE,
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getRowModel().rows.length > 0 &&
              table.getRowModel().rows.every((row) =>
                selectedIds.has(row.original.id),
              )
            }
            onCheckedChange={(checked) => {
              if (checked) selectAll(rows.map((r) => r.id));
              else clearSelection();
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleSelection(row.original.id)}
          />
        ),
        size: 40,
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => formatDisplayDate(row.original.date),
      },
      { accessorKey: "description", header: "Description" },
      {
        accessorKey: "debit",
        header: "Debit",
        cell: ({ row }) =>
          row.original.debit ? formatCurrency(row.original.debit) : "—",
      },
      {
        accessorKey: "credit",
        header: "Credit",
        cell: ({ row }) =>
          row.original.credit ? formatCurrency(row.original.credit) : "—",
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => formatCurrency(row.original.balance),
      },
      { accessorKey: "reference", header: "Reference" },
      { accessorKey: "sourceFile", header: "Source File" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.invoiceGenerated ? (
            <Badge variant="secondary">Statement generated</Badge>
          ) : (
            <Badge variant="outline">Pending</Badge>
          ),
      },
    ],
    [selectedIds, rows, selectAll, clearSelection, toggleSelection],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleExport = async (format: "json" | "csv", scope: "selected" | "filtered" | "all") => {
    let data: Transaction[] = [];
    if (scope === "selected") {
      data = rows.filter((r) => selectedIds.has(r.id));
    } else if (scope === "filtered") {
      data = await getFilteredTransactions(filters);
    } else {
      data = await getFilteredTransactions({
        search: "",
        datePreset: "all",
        descriptionContains: "",
        reference: "",
        typeFilter: "all",
      });
    }

    if (data.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const content =
      format === "json" ? transactionsToJson(data) : transactionsToCsv(data);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    downloadBlob(blob, `transactions.${format}`);
    toast.success(`Exported ${data.length} transactions`);
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Select transactions to delete");
      return;
    }
    await deleteTransactions(ids);
    clearSelection();
    refresh();
    toast.success(`Deleted ${ids.length} transactions`);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={filters.datePreset}
            onValueChange={(v) => setDatePreset(v as typeof filters.datePreset)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.typeFilter}
            onValueChange={(v) => setTypeFilter(v as typeof filters.typeFilter)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="credit">Credit Only</SelectItem>
              <SelectItem value="debit">Debit Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <GenerateInvoiceMenu
            selectedIds={Array.from(selectedIds)}
            onGenerated={refresh}
          />
          <Button variant="outline" size="sm" onClick={() => handleExport("json", "selected")}>
            <FileJson className="mr-1 h-4 w-4" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv", "filtered")}>
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json", "all")}>
            <Download className="mr-1 h-4 w-4" /> Export All
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete Selected
          </Button>
        </div>
      </div>

      <div ref={parentRef} className="max-h-[600px] overflow-auto rounded-xl border">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No transactions found. Upload a CSV to get started.
                </TableCell>
              </TableRow>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                return (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total} transactions
          {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
