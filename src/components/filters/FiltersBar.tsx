"use client";

import { Badge } from "@/components/ui/badge";

type StatusSelection = { pending: boolean; claimed: boolean; completed: boolean };
type UrgencySelection = { emergency: boolean; reinforcement: boolean };

type FiltersBarProps = {
  value: { status: StatusSelection; urgency: UrgencySelection };
  onChange: (v: { status: StatusSelection; urgency: UrgencySelection }) => void;
};

const DEFAULT_STATUS: StatusSelection = { pending: false, claimed: false, completed: false };
const DEFAULT_URGENCY: UrgencySelection = { emergency: false, reinforcement: false };

/**
 * 頂部篩選列：狀態與緊急度。
 */
export function FiltersBar({ value, onChange }: FiltersBarProps) {
  const status = value.status;
  const urgency = value.urgency;

  const setStatus = (next: StatusSelection) => onChange({ ...value, status: next });
  const setUrgency = (next: UrgencySelection) => onChange({ ...value, urgency: next });

  const isStatusAll = !status.pending && !status.claimed && !status.completed;
  const isUrgencyAll = !urgency.emergency && !urgency.reinforcement;

  const toggleStatus = (key: keyof StatusSelection) => {
    setStatus({ ...status, [key]: !status[key] });
  };

  const toggleUrgency = (key: keyof UrgencySelection) => {
    setUrgency({ ...urgency, [key]: !urgency[key] });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-white/85 dark:bg-neutral-950/85 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-screen-sm px-3 py-2 flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">狀態：</span>
          <button onClick={() => setStatus({ ...DEFAULT_STATUS })}>
            <Badge className="text-sm px-3 py-1" variant={isStatusAll ? "default" : "secondary"}>全部</Badge>
          </button>
          <button onClick={() => toggleStatus("pending")}>
            <Badge className="text-sm px-3 py-1" variant={status.pending ? "default" : "secondary"}>待處理</Badge>
          </button>
          <button onClick={() => toggleStatus("claimed")}>
            <Badge className="text-sm px-3 py-1" variant={status.claimed ? "default" : "secondary"}>已認領</Badge>
          </button>
          <button onClick={() => toggleStatus("completed")}>
            <Badge className="text-sm px-3 py-1" variant={status.completed ? "default" : "secondary"}>已完成</Badge>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">緊急度：</span>
          <button onClick={() => setUrgency({ ...DEFAULT_URGENCY })}>
            <Badge className="text-sm px-3 py-1" variant={isUrgencyAll ? "default" : "secondary"}>全部</Badge>
          </button>
          <button onClick={() => toggleUrgency("emergency")}>
            <Badge className="text-sm px-3 py-1" variant={urgency.emergency ? "default" : "secondary"}>緊急</Badge>
          </button>
          <button onClick={() => toggleUrgency("reinforcement")}>
            <Badge className="text-sm px-3 py-1" variant={urgency.reinforcement ? "default" : "secondary"}>需要增援</Badge>
          </button>
        </div>
      </div>
    </div>
  );
}
