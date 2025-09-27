"use client";

import { Button } from "@/components/ui/button";

type FABProps = {
  onClick?: () => void;
  asChild?: boolean;
  children?: React.ReactNode;
};

/**
 * 右下角浮動 + 按鈕。
 */
export function FAB({ onClick, asChild, children }: FABProps) {
  const Container = ({ children: c }: { children: React.ReactNode }) => (
    <div className="fixed right-4 bottom-4 z-[2000]">{c}</div>
  );
  if (asChild) return <Container>{children}</Container>;
  return (
    <Container>
      <Button size="icon" className="h-12 w-12 rounded-full bg-blue-400 text-3xl text-white shadow-lg hover:bg-blue-500" onClick={onClick} aria-label="新增">
        +
      </Button>
    </Container>
  );
}


