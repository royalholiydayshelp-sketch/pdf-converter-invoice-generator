"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getFilteredTransactions,
  getTransactionsByIds,
  getSettings,
  reserveInvoiceNumber,
  saveInvoice,
  markTransactionsInvoiced,
} from "@/lib/database/repository";
import { renderInvoicePdf } from "@/lib/pdf/render-invoice";
import { downloadBlob } from "@/lib/utils/format";
import { useFilterStore } from "@/store";
import type { Transaction } from "@/models/transaction";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface GenerateInvoiceMenuProps {
  selectedIds: string[];
  onGenerated?: () => void;
  /** Hide selection-based options (for Invoices page). */
  createOnly?: boolean;
}

export function GenerateInvoiceMenu({
  selectedIds,
  onGenerated,
  createOnly = false,
}: GenerateInvoiceMenuProps) {
  const { filters } = useFilterStore();
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [generating, setGenerating] = useState(false);

  const generatePdf = async (transactions: Transaction[]) => {
    if (transactions.length === 0) {
      toast.error("No transactions match the selected criteria");
      return;
    }

    setGenerating(true);
    try {
      const settings = await getSettings();
      const invoiceNumber = await reserveInvoiceNumber();
      const pdfBytes = await renderInvoicePdf(
        transactions,
        invoiceNumber,
        settings,
      );

      const sorted = [...transactions].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      const totals = {
        debit: sorted.reduce((s, tx) => s + tx.debit, 0),
        credit: sorted.reduce((s, tx) => s + tx.credit, 0),
        balance:
          sorted.length > 0 ? sorted[sorted.length - 1].balance : 0,
      };

      const pdfBlobKey = crypto.randomUUID();
      const pdfFileName = `${invoiceNumber}.pdf`;
      const invoice = {
        id: crypto.randomUUID(),
        invoiceNumber,
        generatedDate: new Date().toISOString(),
        generatedBy: settings.preparedBy,
        transactionIds: transactions.map((tx) => tx.id),
        pdfBlobKey,
        pdfFileName,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        closingBalance: totals.balance,
      };

      await saveInvoice(invoice, pdfBytes.buffer as ArrayBuffer);
      await markTransactionsInvoiced(transactions.map((tx) => tx.id));

      downloadBlob(
        new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
        pdfFileName,
      );
      toast.success(`Generated ${pdfFileName} with ${transactions.length} transactions`);
      onGenerated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelected = async () => {
    const transactions = await getTransactionsByIds(selectedIds);
    await generatePdf(transactions);
  };

  const handleAllFiltered = async () => {
    const transactions = await getFilteredTransactions(filters);
    await generatePdf(transactions);
  };

  const handleDateWise = async () => {
    if (!singleDate) {
      toast.error("Select a date");
      return;
    }
    const all = await getFilteredTransactions({
      search: "",
      datePreset: "custom",
      dateFrom: singleDate,
      dateTo: singleDate,
      descriptionContains: "",
      reference: "",
      typeFilter: "all",
    });
    setDateDialogOpen(false);
    await generatePdf(all);
  };

  const handleRange = async () => {
    if (!rangeFrom || !rangeTo) {
      toast.error("Select both start and end dates");
      return;
    }
    const all = await getFilteredTransactions({
      search: "",
      datePreset: "custom",
      dateFrom: rangeFrom,
      dateTo: rangeTo,
      descriptionContains: "",
      reference: "",
      typeFilter: "all",
    });
    setRangeDialogOpen(false);
    await generatePdf(all);
  };

  const handleMonthWise = async () => {
    const now = new Date();
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(endOfMonth(now), "yyyy-MM-dd");
    const all = await getFilteredTransactions({
      search: "",
      datePreset: "custom",
      dateFrom: from,
      dateTo: to,
      descriptionContains: "",
      reference: "",
      typeFilter: "all",
    });
    await generatePdf(all);
  };

  const handleSingle = async () => {
    if (selectedIds.length !== 1) {
      toast.error("Select exactly one transaction for single statement");
      return;
    }
    const transactions = await getTransactionsByIds(selectedIds);
    await generatePdf(transactions);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <FileText className="h-4 w-4" />
          {generating ? "Generating..." : "Generate PDF"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {!createOnly && (
            <>
              <DropdownMenuItem onClick={handleSingle}>
                Single Transaction PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSelected}>
                Selected Transactions PDF
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => setDateDialogOpen(true)}>
            Date Wise PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMonthWise}>
            Month Wise PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRangeDialogOpen(true)}>
            Custom Date Range PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAllFiltered}>
            All Filtered PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Date Wise PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
              />
            </div>
            <Button onClick={handleDateWise}>Generate PDF</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Date Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleRange}>Generate PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
