"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={[
        "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  containerClassName?: string;
  overlayClassName?: string;
  hideOverlay?: boolean;
  preventOutsideClose?: boolean;
};

/**
 * 對話框內容，集中處理樣式與動畫。
 */
export function DialogContent({ children, className, containerClassName, overlayClassName, hideOverlay, preventOutsideClose, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      {!hideOverlay && <DialogOverlay className={overlayClassName} />}
      <DialogPrimitive.Content
        className={[
          // 手機：靠下的 bottom sheet；桌面：置中視窗
          "fixed z-50 inset-x-2 bottom-2 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 w-[calc(100%-16px)] sm:w-auto sm:max-w-lg sm:rounded-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          "data-[state=open]:slide-in-from-bottom-8 sm:data-[state=open]:slide-in-from-top-0",
          "p-4 sm:p-6",
          className ?? "",
        ].join(" ")}
        onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={["mb-3 sm:mb-4", className ?? ""].join(" ")}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  // 使用 Radix 的 Title，讓 Content 能正確被 aria-labelledby
  return (
    <DialogPrimitive.Title className={["text-lg font-semibold", className ?? ""].join(" ")}>
      {children}
    </DialogPrimitive.Title>
  );
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  // 使用 Radix 的 Description，讓 Content 能正確被 aria-describedby
  return (
    <DialogPrimitive.Description className={["text-sm text-neutral-600 dark:text-neutral-400", className ?? ""].join(" ")}>
      {children}
    </DialogPrimitive.Description>
  );
}


