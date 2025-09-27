"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
};

/**
 * 通用按鈕元件，提供基本樣式變體與大小。
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      asChild,
      variant = "default",
      size = "md",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base = "inline-flex items-center justify-center gap-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default: "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200",
      outline: "border border-neutral-300 hover:bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900",
      ghost: "hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-900",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400 dark:bg-red-500 dark:hover:bg-red-600",
    };
    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-5 text-base",
      icon: "h-10 w-10",
    };

    const classes = [base, variants[variant], sizes[size], className]
      .filter(Boolean)
      .join(" ");

    return <Comp ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";


