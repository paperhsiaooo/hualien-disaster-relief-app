"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalCaseStore } from "@/hooks/useLocalCaseStore";
import { CaseItem } from "@/types/case";
import { uploadFilesAndGetUrls } from "@/lib/uploads";

const KEY = {
  list: ["cases"] as const,
};

export function useCasesQuery() {
  const store = useLocalCaseStore();
  const query = useQuery({
    queryKey: KEY.list,
    queryFn: async (): Promise<CaseItem[]> => {
      const res = await fetch("/api/cases", { cache: "no-store" });
      if (!res.ok) throw new Error("無法讀取案件資料");
      const data = (await res.json()) as { items: CaseItem[] };
      store.setItems(data.items);
      return data.items;
    },
    initialData: store.items,
  });
  return { ...query, store } as const;
}

type CreateCaseArgs = {
  latitude: number;
  longitude: number;
  reportType: "pending" | "completed";
  content: string;
  emergency: boolean;
  reinforcement: boolean;
  files: File[];
  reporterName: string;
  category: string;
};

type LocalCaseStore = ReturnType<typeof useLocalCaseStore>;

export function useCreateCaseMutation(store: LocalCaseStore) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateCaseArgs) => {
      const urls = await uploadFilesAndGetUrls(args.files);

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          latitude: args.latitude,
          longitude: args.longitude,
          reportType: args.reportType,
          content: args.content,
          emergency: args.emergency,
          reinforcement: args.reinforcement,
          images: urls,
          reporterName: args.reporterName,
          category: args.category,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "建立案件失敗");
      }
      const { item } = (await res.json()) as { item: CaseItem };
      item.category = args.category;
      store.actions.upsert(item);
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.list });
    },
  });
}
