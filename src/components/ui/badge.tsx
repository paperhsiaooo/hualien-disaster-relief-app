"use client";

import * as React from "react";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
};

/**
 * 輕量標籤，用於篩選與狀態顯示。
 */
export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
    secondary:
      "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
    destructive: "bg-red-600 text-white",
    outline: "border border-neutral-300 text-neutral-900 dark:border-neutral-700 dark:text-neutral-100",
  };

  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  const classes = [base, variants[variant], className].filter(Boolean).join(" ");
  return <span className={classes} {...props} />;
}


