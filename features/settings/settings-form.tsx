"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
import { settingsSchema, type AppSettings } from "@/models/settings";
import { fileToBase64 } from "@/lib/utils/format";
import {
  exportDatabase,
  importDatabase,
} from "@/lib/database/repository";
import { downloadBlob } from "@/lib/utils/format";
import { useTheme } from "next-themes";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";

export function SettingsForm() {
  const { settings, loading, update } = useSettings();
  const { setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AppSettings>({
    resolver: zodResolver(settingsSchema),
    values: settings ?? undefined,
  });

  const onSubmit = async (data: AppSettings) => {
    await update(data);
    setTheme(data.theme);
    toast.success("Settings saved");
  };

  const handleImageUpload = async (
    field: "logoBase64" | "watermarkBase64" | "signatureBase64",
    file: File | undefined,
  ) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    form.setValue(field, base64);
  };

  const handleExportBackup = async () => {
    const data = await exportDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `statement-invoice-backup-${Date.now()}.json`);
    toast.success("Backup exported");
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importDatabase(data);
      toast.success("Backup restored successfully");
      window.location.reload();
    } catch {
      toast.error("Invalid backup file");
    }
  };

  if (loading || !settings) {
    return <div className="text-muted-foreground">Loading settings...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="statement">Statement</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input {...form.register("companyName")} />
              </div>
              <div className="space-y-2">
                <Label>GST/VAT</Label>
                <Input {...form.register("gstVat")} />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Address</Label>
                <Textarea {...form.register("address")} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...form.register("email")} />
              </div>
              <div className="space-y-2">
                <Label>Logo (header, top-left)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageUpload("logoBase64", e.target.files?.[0])
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statement Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Statement Prefix</Label>
                <Input {...form.register("invoicePrefix")} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input {...form.register("currency")} />
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Input {...form.register("dateFormat")} placeholder="dd/MM/yyyy" />
              </div>
              <div className="space-y-2">
                <Label>Tax %</Label>
                <Input
                  type="number"
                  {...form.register("taxPercent", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <Input type="color" {...form.register("primaryColor")} />
              </div>
              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select
                  value={form.watch("orientation")}
                  onValueChange={(v) =>
                    form.setValue("orientation", v as "portrait" | "landscape")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-full space-y-2">
                <Label>Footer Text</Label>
                <Textarea {...form.register("footer")} />
              </div>
              <div className="space-y-2">
                <Label>Prepared By</Label>
                <Input {...form.register("preparedBy")} />
              </div>
              <div className="space-y-2">
                <Label>Signature Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageUpload("signatureBase64", e.target.files?.[0])
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.watch("showWatermark")}
                  onCheckedChange={(v) => form.setValue("showWatermark", v)}
                />
                <Label>Show background watermark</Label>
              </div>
              <div className="col-span-full space-y-2">
                <Label>Watermark image (optional — uses logo if empty)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageUpload("watermarkBase64", e.target.files?.[0])
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={form.watch("theme")}
                onValueChange={(v) =>
                  form.setValue("theme", v as AppSettings["theme"])
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Backup & Restore</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleExportBackup}>
                <Download className="mr-2 h-4 w-4" />
                Export Database JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Database JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportBackup(file);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button type="submit">Save Settings</Button>
    </form>
  );
}
