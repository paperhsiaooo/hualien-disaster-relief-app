"use client";

import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type FiltersBarProps = {
  value: { status: string; urgency: string };
  onChange: (v: { status: string; urgency: string }) => void;
};

/**
 * 頂部篩選列：狀態與緊急度。
 */
export function FiltersBar({ value, onChange }: FiltersBarProps) {
  const setStatus = (status: string) => onChange({ ...value, status });
  const setUrgency = (urgency: string) => onChange({ ...value, urgency });

  const status = value.status;
  const urgency = value.urgency;

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-white/85 dark:bg-neutral-950/85 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-screen-sm px-3 py-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">狀態：</span>
        {[
          { key: "all", label: "全部" },
          { key: "pending", label: "待處理" },
          { key: "claimed", label: "已認領" },
        ].map((opt) => (
          <button key={opt.key} onClick={() => setStatus(opt.key)}>
            <Badge variant={status === opt.key ? "default" : "secondary"}>{opt.label}</Badge>
          </button>
        ))}

        <span className="ml-2 text-xs text-neutral-500">緊急度：</span>
        {[
          { key: "completed", label: "已完成" },
          { key: "reinforcement", label: "需要增援" },
          { key: "emergency", label: "緊急" },
        ].map((opt) => (
          <button key={opt.key} onClick={() => setUrgency(opt.key)}>
            <Badge variant={urgency === opt.key ? "default" : "secondary"}>{opt.label}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}


