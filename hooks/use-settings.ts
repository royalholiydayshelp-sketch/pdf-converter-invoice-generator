"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/models/settings";
import { getSettings, saveSettings } from "@/lib/database/repository";
import { ensureDefaultSettings } from "@/lib/database/db";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await ensureDefaultSettings();
      const data = await getSettings();
      setSettings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (next: AppSettings) => {
    await saveSettings(next);
    setSettings(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { settings, loading, refresh, update };
}
