"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadArea } from "@/components/report/UploadArea";
import type { CaseReportType } from "@/types/case";

const formSchema = z.object({
  reportType: z.enum(["pending", "completed"]).default("pending"),
  content: z.string().min(1, "請輸入內容"),
  emergency: z.boolean().default(false),
});

export type ReportFormValues = z.infer<typeof formSchema> & {
  files: File[];
};

type ReportFormProps = {
  latitude: number;
  longitude: number;
  onSubmitReport: (values: ReportFormValues) => void;
  onCancel?: () => void;
};

/**
 * 回報表單：
 * - 回報類型（Pending/Completed）
 * - 內容輸入
 * - 緊急勾選
 * - 上傳最多 3 張
 */
export function ReportForm({ latitude, longitude, onSubmitReport, onCancel }: ReportFormProps) {
  const {
    handleSubmit,
    setValue,
    register,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { reportType: "pending", content: "", emergency: false } });

  const [files, setFiles] = useState<File[]>([]);

  const submit = (data: z.infer<typeof formSchema>) => {
    onSubmitReport({ ...data, files });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div>
        <Label className="mb-1 block">回報類型</Label>
        <Select onValueChange={(v) => setValue("reportType", v as CaseReportType)}>
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

      <div className="flex items-center gap-2">
        <Checkbox onCheckedChange={(v) => setValue("emergency", Boolean(v))} id="emergency" />
        <Label htmlFor="emergency">緊急</Label>
      </div>

      <div>
        <Label className="mb-1 block">上傳佐證</Label>
        <UploadArea value={files} onChange={setFiles} />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            取消
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          送出
        </Button>
      </div>

      <p className="text-xs text-neutral-500">座標：{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
    </form>
  );
}


