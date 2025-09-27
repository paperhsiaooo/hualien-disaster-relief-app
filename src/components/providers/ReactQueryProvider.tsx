"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

type ReactQueryProviderProps = {
  children: ReactNode;
};

/**
 * 全域的 React Query Provider，提供 QueryClient 給整個應用使用。
 * 以 useState 確保在 Client Component 中只建立一次 QueryClient 實例。
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}


