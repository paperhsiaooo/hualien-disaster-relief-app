"use client";

import { Button } from "@/components/ui/button";

type FABProps = {
  onClick?: () => void;
  children?: React.ReactNode;
  offsetY?: number;
};

/**
 * 右下角浮動按鈕容器，預設為新增 (+)。
 */
export function FAB({ onClick, children, offsetY = 0 }: FABProps) {
  return (
    <div
      className="fixed right-4 bottom-4 z-[2000]"
      style={offsetY ? { transform: `translateY(-${offsetY}px)` } : undefined}
    >
      {children ?? (
        <Button
          size="icon"
          className="h-10 w-10 min-w-[40px] rounded-full bg-blue-400 text-base text-white shadow-lg hover:bg-blue-500"
          onClick={onClick}
          aria-label="新增"
        >
          +
        </Button>
      )}
    </div>
  );
}
