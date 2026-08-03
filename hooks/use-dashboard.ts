"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardStats, MonthlyStats } from "@/types";
import {
  getDashboardStats,
  getMonthlyStats,
} from "@/lib/database/repository";

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, monthlyData] = await Promise.all([
        getDashboardStats(),
        getMonthlyStats(),
      ]);
      setStats(statsData);
      setMonthly(monthlyData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, monthly, loading, refresh };
}
