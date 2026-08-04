"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Save, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
import {
  DEFAULT_LINE_ITEM,
  DEFAULT_SALES_INVOICE_FORM,
  resolveInvoiceNumber,
  PAYMENT_MODE_LABELS,
  PAYMENT_STATUS_LABELS,
  salesInvoiceFormSchema,
  type PaymentMode,
  type PaymentStatus,
  type SalesInvoice,
  type SalesInvoiceFormValues,
} from "@/models/sales-invoice";
import { calculateSalesInvoiceTotals } from "@/lib/sales-invoices/calculate-totals";
import { SalesInvoicePreview } from "@/features/sales-invoices/sales-invoice-preview";
import { renderSalesInvoicePdf } from "@/lib/pdf/render-sales-invoice";
import {
  getSalesInvoice,
  saveSalesInvoice,
} from "@/lib/database/sales-invoice-repository";
import { getSettings } from "@/lib/database/repository";
import { downloadBlob } from "@/lib/utils/format";

interface SalesInvoiceEditorProps {
  invoiceId?: string;
}

function formToSalesInvoice(
  values: SalesInvoiceFormValues,
  totals: ReturnType<typeof calculateSalesInvoiceTotals>,
  existing: Partial<SalesInvoice> = {},
): SalesInvoice {
  const now = new Date().toISOString();
  return {
    id: existing.id ?? crypto.randomUUID(),
    invoiceNumber: resolveInvoiceNumber(values.invoiceNumber),
    status: existing.status ?? "draft",
    invoiceDate: values.invoiceDate,
    paymentStatus: values.paymentStatus,
    referenceNumber: values.referenceNumber,
    billToName: values.billToName,
    billToPhone: values.billToPhone,
    billToAddress: values.billToAddress,
    billToEmail: values.billToEmail,
    shipToDescription: values.shipToDescription,
    lineItems: totals.lineItems,
    paymentMode: values.paymentMode,
    upiTransactionId:
      values.paymentMode === "upi" ? values.upiTransactionId : "",
    remarks: values.remarks,
    discount: totals.discount,
    taxRatePercent: totals.taxRatePercent,
    roundAdjustment: totals.roundAdjustment,
    subtotal: totals.subtotal,
    subtotalLessDiscount: totals.subtotalLessDiscount,
    totalTax: totals.totalTax,
    balanceDue: totals.balanceDue,
    templateId: "default",
    pdfBlobKey: existing.pdfBlobKey,
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
  };
}

function salesInvoiceToForm(invoice: SalesInvoice): SalesInvoiceFormValues {
  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    paymentStatus: invoice.paymentStatus ?? "nil",
    referenceNumber: invoice.referenceNumber,
    billToName: invoice.billToName,
    billToPhone: invoice.billToPhone,
    billToAddress: invoice.billToAddress,
    billToEmail: invoice.billToEmail,
    shipToDescription: invoice.shipToDescription,
    lineItems: invoice.lineItems.map(({ id, description, qty, unitPrice }) => ({
      id,
      description,
      qty,
      unitPrice,
    })),
    remarks: invoice.remarks,
    paymentMode: invoice.paymentMode ?? "upi",
    upiTransactionId: invoice.upiTransactionId ?? "",
    discount: invoice.discount,
    taxRatePercent: invoice.taxRatePercent,
    autoRound: invoice.roundAdjustment !== 0,
    roundAdjustment: invoice.roundAdjustment,
  };
}

export function SalesInvoiceEditor({ invoiceId }: SalesInvoiceEditorProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(!!invoiceId);
  const [savedInvoice, setSavedInvoice] = useState<Partial<SalesInvoice>>({});
  const [generating, setGenerating] = useState(false);

  const form = useForm<SalesInvoiceFormValues>({
    resolver: zodResolver(salesInvoiceFormSchema),
    defaultValues: DEFAULT_SALES_INVOICE_FORM,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watched = form.watch();
  const paymentMode = form.watch("paymentMode");
  const totals = useMemo(
    () =>
      calculateSalesInvoiceTotals({
        lineItems: watched.lineItems,
        discount: watched.discount,
        taxRatePercent: watched.taxRatePercent,
        autoRound: watched.autoRound,
        roundAdjustment: watched.autoRound ? 0 : watched.roundAdjustment,
      }),
    [watched],
  );

  useEffect(() => {
    if (!invoiceId && settings?.taxPercent !== undefined) {
      form.setValue("taxRatePercent", settings.taxPercent || 18);
    }
  }, [invoiceId, settings?.taxPercent, form]);

  useEffect(() => {
    if (!invoiceId) return;
    void (async () => {
      setLoading(true);
      try {
        const invoice = await getSalesInvoice(invoiceId);
        if (!invoice) {
          toast.error("Invoice not found");
          router.push("/invoices");
          return;
        }
        setSavedInvoice(invoice);
        form.reset(salesInvoiceToForm(invoice));
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId, form, router]);

  const persist = useCallback(
    async (finalize: boolean) => {
      const valid = await form.trigger();
      if (!valid) {
        toast.error("Please fix the form errors before saving");
        return null;
      }

      const values = form.getValues();
      const invoiceNumber = resolveInvoiceNumber(values.invoiceNumber);
      if (!values.invoiceNumber.trim()) {
        form.setValue("invoiceNumber", invoiceNumber);
      }
      const status = finalize ? "finalized" : (savedInvoice.status ?? "draft");

      const invoice = formToSalesInvoice(values, totals, {
        ...savedInvoice,
        status,
      });

      await saveSalesInvoice(invoice);
      setSavedInvoice(invoice);
      toast.success(finalize ? "Invoice finalized and saved" : "Draft saved");
      return invoice;
    },
    [form, savedInvoice, totals],
  );

  const handleSaveDraft = async () => {
    const invoice = await persist(false);
    if (invoice && !invoiceId) {
      router.replace(`/invoices/${invoice.id}`);
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const invoice = await persist(true);
      if (!invoice) return;

      const appSettings = await getSettings();
      const pdfBytes = await renderSalesInvoicePdf(invoice, appSettings);
      const pdfBlobKey = invoice.pdfBlobKey ?? crypto.randomUUID();
      const updated = { ...invoice, pdfBlobKey, updatedAt: new Date().toISOString() };
      await saveSalesInvoice(updated, pdfBytes.buffer as ArrayBuffer);
      setSavedInvoice(updated);

      const fileName = `${invoice.invoiceNumber || "draft"}.pdf`;
      downloadBlob(
        new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
        fileName,
      );
      toast.success(`Downloaded ${fileName}`);
      if (!invoiceId) router.replace(`/invoices/${updated.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading invoice...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {invoiceId ? "Edit Invoice" : "Create Invoice"}
          </h1>
          <p className="text-muted-foreground">
            Fill in details and preview your invoice before generating PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleSaveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button type="button" onClick={handleGeneratePdf} disabled={generating}>
            <FileDown className="mr-2 h-4 w-4" />
            {generating ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 print:block">
        <div className="space-y-4 no-print">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Invoice No.</Label>
                <Input
                  {...form.register("invoiceNumber")}
                  placeholder="Leave empty for date & time (e.g. 04082026153900)"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input type="date" {...form.register("invoiceDate")} />
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select
                  value={form.watch("paymentStatus")}
                  onValueChange={(v) =>
                    form.setValue("paymentStatus", v as PaymentStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {PAYMENT_STATUS_LABELS[status]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input {...form.register("referenceNumber")} placeholder="Optional" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill To</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Customer Name</Label>
                <Input {...form.register("billToName")} />
                {form.formState.errors.billToName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.billToName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...form.register("billToPhone")} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...form.register("billToEmail")} />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Address</Label>
                <Textarea {...form.register("billToAddress")} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ship To</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Shipping / Delivery Description</Label>
                <Input
                  {...form.register("shipToDescription")}
                  placeholder="e.g. Online sale"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(DEFAULT_LINE_ITEM())}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Row
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input {...form.register(`lineItems.${index}.description`)} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      {...form.register(`lineItems.${index}.qty`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      {...form.register(`lineItems.${index}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <p className="pb-2 text-sm font-medium">
                      {totals.lineItems[index]
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: settings?.currency ?? "INR",
                          }).format(totals.lineItems[index].total)
                        : "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-1 flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select
                  value={paymentMode}
                  onValueChange={(v) => {
                    form.setValue("paymentMode", v as PaymentMode);
                    if (v !== "upi") {
                      form.setValue("upiTransactionId", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map(
                      (mode) => (
                        <SelectItem key={mode} value={mode}>
                          {PAYMENT_MODE_LABELS[mode]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              {paymentMode === "upi" && (
                <div className="space-y-2">
                  <Label>UPI Transaction ID</Label>
                  <Input
                    {...form.register("upiTransactionId")}
                    placeholder="e.g. 123456789012"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals & Notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  {...form.register("discount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  {...form.register("taxRatePercent", { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={form.watch("autoRound")}
                  onCheckedChange={(v) => form.setValue("autoRound", v)}
                />
                <Label>Auto-round balance to nearest whole amount</Label>
              </div>
              {!form.watch("autoRound") && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Round Adjustment</Label>
                  <Input
                    type="number"
                    step={0.01}
                    {...form.register("roundAdjustment", { valueAsNumber: true })}
                  />
                </div>
              )}
              <div className="col-span-full space-y-2">
                <Label>Remarks / Payment Instructions</Label>
                <Textarea {...form.register("remarks")} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="mb-3 text-sm font-medium text-muted-foreground no-print">
            Live Preview
          </p>
          <SalesInvoicePreview
            form={watched}
            totals={totals}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
}
