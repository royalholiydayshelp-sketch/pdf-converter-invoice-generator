"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/models/transaction";
import type { TransactionFilters } from "@/types";
import { queryTransactions } from "@/lib/database/repository";

export function useTransactions(
  filters: TransactionFilters,
  page: number,
  pageSize: number,
) {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryTransactions(filters, "date", true, page, pageSize);
      setRows(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, total, loading, refresh };
}
