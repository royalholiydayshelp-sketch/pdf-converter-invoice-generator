"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Download, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteSalesInvoice,
  getSalesInvoicePdf,
  getSalesInvoices,
} from "@/lib/database/sales-invoice-repository";
import type { SalesInvoice } from "@/models/sales-invoice";
import { PAYMENT_STATUS_LABELS } from "@/models/sales-invoice";
import { formatCurrency, formatDisplayDate, downloadBlob } from "@/lib/utils/format";

export function SalesInvoiceList() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await getSalesInvoices());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDownload = async (invoice: SalesInvoice) => {
    if (!invoice.pdfBlobKey) {
      toast.error("No PDF saved yet. Open and generate PDF first.");
      return;
    }
    const pdf = await getSalesInvoicePdf(invoice.pdfBlobKey);
    if (!pdf) {
      toast.error("PDF not found in storage");
      return;
    }
    downloadBlob(
      new Blob([pdf], { type: "application/pdf" }),
      `${invoice.invoiceNumber || invoice.id}.pdf`,
    );
  };

  const handleDelete = async (id: string) => {
    await deleteSalesInvoice(id);
    refresh();
    toast.success("Invoice deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage sales invoices independently from bank statements.
          </p>
        </div>
        <Link href="/invoices/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Doc Status</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading invoices...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No invoices yet. Create your first invoice.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber || "—"}
                  </TableCell>
                  <TableCell>
                    {formatDisplayDate(invoice.invoiceDate)}
                  </TableCell>
                  <TableCell>{invoice.billToName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.paymentStatus === "paid"
                          ? "default"
                          : invoice.paymentStatus === "unpaid"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {PAYMENT_STATUS_LABELS[invoice.paymentStatus ?? "nil"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={invoice.status === "finalized" ? "default" : "secondary"}
                    >
                      {invoice.status === "finalized" ? "Finalized" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.balanceDue)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(invoice.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
