"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UploadArea } from "@/components/report/UploadArea";
import type { CaseReportType } from "@/types/case";

const formSchema = z.object({
  reportType: z.enum(["pending", "completed"]),
  content: z
    .string()
    .min(1, "請輸入內容")
    .max(150, "最多 150 字"),
  emergency: z.boolean(),
  reinforcement: z.boolean(),
});

export type ReportFormValues = z.infer<typeof formSchema> & {
  files: File[];
  retainedExistingImages?: string[];
};

type ReportFormProps = {
  latitude: number;
  longitude: number;
  onSubmitReport: (values: ReportFormValues) => Promise<void>;
  onCancel?: () => void;
  initialValues?: Partial<Omit<ReportFormValues, "files" | "retainedExistingImages">>;
  submitLabel?: string;
  loading?: boolean;
  existingImages?: string[];
  resolveImageSrc?: (url: string) => string;
};

/**
 * 回報表單：
 * - 回報類型（Pending/Completed）
 * - 內容輸入
 * - 緊急勾選
 * - 上傳最多 3 張
 */
export function ReportForm({ latitude, longitude, onSubmitReport, onCancel, initialValues, submitLabel, loading, existingImages, resolveImageSrc }: ReportFormProps) {
  type FormValues = z.infer<typeof formSchema>;
  const {
    handleSubmit,
    setValue,
    register,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { reportType: "pending", content: "", emergency: false, reinforcement: false },
  });

  const [files, setFiles] = useState<File[]>([]);
  const [retainedExisting, setRetainedExisting] = useState<string[]>(existingImages ?? []);
  const reportType = watch("reportType");
  const emergencyValue = watch("emergency");
  const reinforcementValue = watch("reinforcement");
  const canUploadNew = retainedExisting.length === 0;

  useEffect(() => {
    register("emergency");
    register("reinforcement");
  }, [register]);

  useEffect(() => {
    if (initialValues) {
      reset({
        reportType: initialValues.reportType ?? "pending",
        content: initialValues.content ?? "",
        emergency: initialValues.emergency ?? false,
        reinforcement: initialValues.reinforcement ?? false,
      });
      setRetainedExisting(existingImages ?? []);
      setFiles([]);
    }
  }, [initialValues, reset, existingImages]);

  useEffect(() => {
    setRetainedExisting(existingImages ?? []);
  }, [existingImages]);

  const removeExistingAt = (idx: number) => {
    setRetainedExisting((prev) => {
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
  };

  const resolveExistingSrc = useCallback((src: string) => {
    const internalFallback = (input: string) => {
      if (!input) return input;
      const trimmed = input.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      if (trimmed.startsWith("//")) {
        if (typeof window !== "undefined" && window.location) {
          return `${window.location.protocol}${trimmed}`;
        }
        return `https:${trimmed}`;
      }
      return `https://${trimmed.replace(/^\/+/, "")}`;
    };

    if (resolveImageSrc) {
      try {
        const resolved = resolveImageSrc(src);
        if (resolved) return resolved;
      } catch {
        // ignore, fallback to internal
      }
    }
    return internalFallback(src);
  }, [resolveImageSrc]);

  const submit = async (data: z.infer<typeof formSchema>) => {
    await onSubmitReport({ ...data, files, retainedExistingImages: retainedExisting });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div>
        <Label className="mb-1 block">回報類型</Label>
        <Select value={reportType} onValueChange={(v) => setValue("reportType", v as CaseReportType)}>
          <SelectTrigger>
            <SelectValue placeholder="選擇回報類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">待處理</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
          </SelectContent>
        </Select>
        {errors.reportType && <p className="mt-1 text-sm text-red-600">{errors.reportType.message as string}</p>}
      </div>

      <div>
        <Label className="mb-1 block">回報內容</Label>
        <Input placeholder="請描述情形…" {...register("content")} />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox checked={!!emergencyValue} onCheckedChange={(v) => setValue("emergency", v === true, { shouldDirty: true })} id="emergency" />
          <Label htmlFor="emergency">緊急</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={!!reinforcementValue} onCheckedChange={(v) => setValue("reinforcement", v === true, { shouldDirty: true })} id="reinforcement" />
          <Label htmlFor="reinforcement">需要增援</Label>
        </div>
      </div>

      <div>
        <Label className="mb-1 block">上傳照片</Label>
        {canUploadNew ? (
          <UploadArea value={files} onChange={setFiles} />
        ) : (
          <p className="text-xs text-neutral-500">已有現場照片，若要新增，請先移除既有照片。</p>
        )}
      </div>

      {existingImages && existingImages.length > 0 && (
        <div>
          <Label className="mb-1 block">既有照片</Label>
          {retainedExisting.length === 0 ? (
            <p className="text-xs text-neutral-500">你已移除所有既有照片。</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {retainedExisting.map((url, idx) => {
                const displaySrc = resolveExistingSrc(url);
                return (
                  <div key={`${url}-${idx}`} className="relative">
                    <div className="relative aspect-[4/3] overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                      <Image src={displaySrc} alt="已上傳照片" fill className="object-cover" sizes="(max-width: 640px) 33vw, 120px" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingAt(idx)}
                      className="absolute top-1 right-1 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 p-1 text-xs text-white shadow transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      aria-label="刪除此張既有照片"
                      title="刪除此張照片"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            取消
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || loading}>
          {loading ? "處理中…" : submitLabel || "送出"}
        </Button>
      </div>

      <p className="text-xs text-neutral-500">座標：{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
    </form>
  );
}
