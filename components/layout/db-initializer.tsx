"use client";

import { useEffect } from "react";
import { ensureDefaultSettings } from "@/lib/database/db";

export function DbInitializer() {
  useEffect(() => {
    void ensureDefaultSettings();
  }, []);
  return null;
}
