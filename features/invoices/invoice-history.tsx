"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteInvoice,
  getInvoicePdf,
  getInvoices,
  getTransactionsByIds,
} from "@/lib/database/repository";
import type { Invoice } from "@/models/invoice";
import { formatCurrency, formatDisplayDate, downloadBlob } from "@/lib/utils/format";
import { format } from "date-fns";

export function InvoiceHistory({ refreshToken = 0 }: { refreshToken?: number }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshToken]);

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.pdfFileName.toLowerCase().includes(q) ||
      format(new Date(inv.generatedDate), "yyyy-MM-dd").includes(q)
    );
  });

  const handleDownload = async (invoice: Invoice) => {
    const pdf = await getInvoicePdf(invoice.pdfBlobKey);
    if (!pdf) {
      toast.error("PDF not found in storage");
      return;
    }
    downloadBlob(new Blob([pdf], { type: "application/pdf" }), invoice.pdfFileName);
  };

  const handlePreview = async (invoice: Invoice) => {
    const pdf = await getInvoicePdf(invoice.pdfBlobKey);
    if (!pdf) {
      toast.error("PDF not found in storage");
      return;
    }
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    setPreviewUrl(url);
  };

  const handleDelete = async (id: string) => {
    await deleteInvoice(id);
    refresh();
    toast.success("Statement deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by statement number or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statement Number</TableHead>
              <TableHead>Generated Date</TableHead>
              <TableHead>Transactions</TableHead>
              <TableHead>Total Debit</TableHead>
              <TableHead>Total Credit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading statements...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No statements generated yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {formatDisplayDate(invoice.generatedDate.slice(0, 10))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {invoice.transactionIds.length} txns
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.totalDebit)}</TableCell>
                  <TableCell>{formatCurrency(invoice.totalCredit)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(invoice)}
                      >
                        <Eye className="h-4 w-4" />
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

      <Dialog open={!!previewUrl} onOpenChange={() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Statement Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="h-[70vh] w-full rounded-lg border"
              title="Statement Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
