"use client";

import { useQuery } from "@tanstack/react-query";
import { CaseItem } from "@/types/case";

export function useSheetsCases() {
  return useQuery<{ items: CaseItem[] }>({
    queryKey: ["sheets", "cases"],
    queryFn: async () => {
      const res = await fetch("/api/sheets/list", { cache: "no-store" });
      if (!res.ok) throw new Error("讀取 Sheets 失敗");
      return res.json();
    },
    staleTime: 60_000,
  });
}


