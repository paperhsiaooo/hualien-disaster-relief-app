"use client";

import { useQuery } from "@tanstack/react-query";
import { CaseItem } from "@/types/case";

// 已不再從 Sheets 讀資料，保留文件以避免 import 失敗。
export function useSheetsCases() {
  return useQuery<{ items: CaseItem[] }>({
    queryKey: ["sheets", "cases"],
    queryFn: async () => {
      const res = await fetch("/api/sheets/list", { cache: "no-store" });
      if (!res.ok) throw new Error("讀取資料失敗");
      return res.json();
    },
    staleTime: 0,
  });
}


