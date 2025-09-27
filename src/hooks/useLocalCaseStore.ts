"use client";

import { useEffect, useMemo, useState } from "react";
import { CaseItem } from "@/types/case";

const STORAGE_KEY = "hualien_cases_v1";

/**
 * 以 localStorage 暫存案件清單，無後端時可離線瀏覽。
 */
export function useLocalCaseStore() {
  const [items, setItems] = useState<CaseItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const actions = useMemo(
    () => ({
      upsert: (item: CaseItem) => {
        setItems((prev) => {
          const idx = prev.findIndex((x) => x.id === item.id);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = item;
            return next;
          }
          return [item, ...prev];
        });
      },
    }),
    []
  );

  return { items, setItems, actions } as const;
}


