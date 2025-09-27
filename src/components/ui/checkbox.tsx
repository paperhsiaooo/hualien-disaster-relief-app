"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

/**
 * 基本核取方塊，支援狀態樣式。
 */
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    const base = "peer h-5 w-5 shrink-0 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black";
    const classes = [base, className].filter(Boolean).join(" ");
    return (
      <CheckboxPrimitive.Root ref={ref} className={classes} {...props}>
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          {/* 以 CSS 表示勾勾，避免引入 icon 套件 */}
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="none" stroke="currentColor" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);
Checkbox.displayName = "Checkbox";


