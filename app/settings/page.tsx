"use client";

import { SettingsForm } from "@/features/settings/settings-form";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Customize company branding, invoice layout, theme, and backup data.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
