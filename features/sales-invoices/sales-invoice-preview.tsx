"use client";

import type { AppSettings } from "@/models/settings";
import type { SalesInvoiceTotals } from "@/lib/sales-invoices/calculate-totals";
import type { SalesInvoiceFormValues } from "@/models/sales-invoice";
import { formatCurrency, formatDisplayDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface SalesInvoicePreviewProps {
  form: SalesInvoiceFormValues;
  totals: SalesInvoiceTotals;
  settings: AppSettings | null;
  invoiceNumber?: string;
  className?: string;
}

export function SalesInvoicePreview({
  form,
  totals,
  settings,
  invoiceNumber,
  className,
}: SalesInvoicePreviewProps) {
  const currency = settings?.currency ?? "INR";
  const primary = settings?.primaryColor ?? "#98846c";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm print:shadow-none print:border-none",
        className,
      )}
      id="sales-invoice-preview"
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b pb-6">
        <div className="flex gap-4">
          {settings?.logoBase64 && (
            <img
              src={`data:image/jpeg;base64,${settings.logoBase64}`}
              alt="Logo"
              className="h-16 w-16 rounded-lg object-contain"
            />
          )}
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: primary }}
            >
              {settings?.companyName ?? "Company Name"}
            </h2>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground whitespace-pre-line">
              {settings?.address}
            </p>
            {settings?.gstVat && (
              <p className="mt-1 text-xs font-medium">GST: {settings.gstVat}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-wide text-muted-foreground/40">
            INVOICE
          </p>
          <p className="mt-2 text-xs font-semibold">
            DATE: {formatDisplayDate(form.invoiceDate, settings?.dateFormat)}
          </p>
          {invoiceNumber && (
            <p className="text-xs font-semibold">INVOICE NO. {invoiceNumber}</p>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: primary }}>
            Bill To
          </p>
          <div className="mt-2 h-px w-14 bg-current opacity-30" style={{ color: primary }} />
          <p className="mt-3 text-sm font-semibold">{form.billToName || "—"}</p>
          {form.billToPhone && (
            <p className="text-sm text-muted-foreground">{form.billToPhone}</p>
          )}
          {form.billToAddress && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {form.billToAddress}
            </p>
          )}
          {form.billToEmail && (
            <p className="text-sm text-muted-foreground">{form.billToEmail}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: primary }}>
            Ship To
          </p>
          <div className="mt-2 h-px w-14 bg-current opacity-30" style={{ color: primary }} />
          <p className="mt-3 text-sm">{form.shipToDescription || "—"}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase" style={{ backgroundColor: `${primary}18`, color: primary }}>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {totals.lineItems
              .filter(
                (item) =>
                  item.description.trim() || item.qty > 0 || item.unitPrice > 0,
              )
              .map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 1 ? "bg-muted/40" : undefined}
                >
                  <td className="px-3 py-2">{item.description || "—"}</td>
                  <td className="px-3 py-2 text-right">{item.qty}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(item.unitPrice, currency)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(item.total, currency)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {form.referenceNumber && (
        <p className="my-4 text-center text-sm font-semibold">
          {form.referenceNumber}
        </p>
      )}

      <div className="relative mt-8 grid gap-8 sm:grid-cols-2">
        {settings?.showWatermark && settings.logoBase64 && (
          <img
            src={`data:image/jpeg;base64,${settings.watermarkBase64 || settings.logoBase64}`}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 max-h-64 max-w-xs -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
          />
        )}
        <div className="relative z-10">
          <p className="text-xs font-semibold">Remarks / Payment Instructions:</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {form.remarks || "—"}
          </p>
        </div>
        <div className="relative z-10 min-w-[220px] space-y-2 text-sm sm:ml-auto">
          <div className="flex justify-between gap-6">
            <span className="shrink-0 text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="shrink-0 text-muted-foreground">Discount</span>
            <span className="font-medium tabular-nums">{formatCurrency(totals.discount, currency)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="max-w-[9rem] shrink-0 text-muted-foreground leading-snug">
              Subtotal Less Discount
            </span>
            <span className="font-medium tabular-nums">
              {formatCurrency(totals.subtotalLessDiscount, currency)}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="shrink-0 text-muted-foreground">Tax Rate</span>
            <span className="font-medium tabular-nums">{totals.taxRatePercent.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="shrink-0 text-muted-foreground">Total Tax</span>
            <span className="font-medium tabular-nums">{formatCurrency(totals.totalTax, currency)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="shrink-0 text-muted-foreground">Round</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(totals.roundAdjustment, currency)}
            </span>
          </div>
          <div
            className="mt-2 flex justify-between gap-4 rounded-lg px-3 py-2 font-bold"
            style={{ backgroundColor: `${primary}18`, color: primary }}
          >
            <span>Balance Due</span>
            <span>{formatCurrency(totals.balanceDue, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
