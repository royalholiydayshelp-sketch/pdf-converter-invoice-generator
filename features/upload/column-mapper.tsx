"use client";

import type { ColumnMapping, CanonicalField } from "@/models/transaction";
import { CANONICAL_FIELDS } from "@/models/transaction";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELD_LABELS: Record<CanonicalField, string> = {
  date: "Date",
  description: "Description",
  debit: "Debit",
  credit: "Credit",
  balance: "Balance",
  reference: "Reference",
  transactionId: "Transaction ID",
};

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

export function ColumnMapper({ headers, mapping, onChange }: ColumnMapperProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <p className="col-span-full text-sm text-muted-foreground">
        Map your CSV columns to the required fields:
      </p>
      {CANONICAL_FIELDS.map((field) => (
        <div key={field} className="space-y-2">
          <Label>{FIELD_LABELS[field]}</Label>
          <Select
            value={mapping[field] ?? "__none__"}
            onValueChange={(value) =>
              onChange({
                ...mapping,
                [field]: value === "__none__" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Not mapped —</SelectItem>
              {headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
