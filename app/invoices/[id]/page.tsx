"use client";

import { use } from "react";
import { SalesInvoiceEditor } from "@/features/sales-invoices/sales-invoice-editor";

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SalesInvoiceEditor invoiceId={id} />;
}
