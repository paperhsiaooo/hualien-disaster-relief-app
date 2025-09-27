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
      <Button size="icon" className="rounded-full shadow-lg" onClick={onClick} aria-label="新增">
        +
      </Button>
    </Container>
  );
}


