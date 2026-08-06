import type { SalesInvoiceLineItem } from "@/models/sales-invoice";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface SalesInvoiceTotalsInput {
  lineItems: Array<
    Pick<SalesInvoiceLineItem, "id" | "description" | "qty" | "unitPrice">
  >;
  discount: number;
  taxRatePercent: number;
  autoRound: boolean;
  roundAdjustment: number;
  showTax: boolean;
}

export interface SalesInvoiceTotals {
  lineItems: SalesInvoiceLineItem[];
  subtotal: number;
  discount: number;
  subtotalLessDiscount: number;
  taxRatePercent: number;
  totalTax: number;
  roundAdjustment: number;
  balanceDue: number;
}

export function calculateSalesInvoiceTotals(
  input: SalesInvoiceTotalsInput,
): SalesInvoiceTotals {
  const lineItems: SalesInvoiceLineItem[] = input.lineItems.map((item) => {
    const total = roundMoney(item.qty * item.unitPrice);
    return {
      id: item.id,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      total,
    };
  });

  const subtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + item.total, 0),
  );
  const discount = roundMoney(Math.min(input.discount, subtotal));
  const subtotalLessDiscount = roundMoney(subtotal - discount);
  const effectiveTaxRate = input.showTax ? input.taxRatePercent : 0;
  const totalTax = roundMoney(
    subtotalLessDiscount * (effectiveTaxRate / 100),
  );
  const preRoundTotal = roundMoney(subtotalLessDiscount + totalTax);

  let roundAdjustment = input.roundAdjustment;
  if (input.autoRound) {
    const rounded = Math.round(preRoundTotal);
    roundAdjustment = roundMoney(rounded - preRoundTotal);
  }

  const balanceDue = roundMoney(preRoundTotal + roundAdjustment);

  return {
    lineItems,
    subtotal,
    discount,
    subtotalLessDiscount,
    taxRatePercent: input.taxRatePercent,
    totalTax,
    roundAdjustment,
    balanceDue,
  };
}
