"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalCaseStore } from "@/hooks/useLocalCaseStore";
import { CaseItem, CaseUrgency } from "@/types/case";
import { uploadFilesAndGetUrls } from "@/lib/uploads";
import { appendToSheet } from "@/lib/sheets";

const KEY = {
  list: ["cases"] as const,
};

export function useCasesQuery() {
  const store = useLocalCaseStore();
  const query = useQuery({
    queryKey: KEY.list,
    queryFn: async () => store.items,
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
  files: File[];
};

export function useCreateCaseMutation() {
  const qc = useQueryClient();
  const { store } = useCasesQuery();

  return useMutation({
    mutationFn: async (args: CreateCaseArgs) => {
      const now = Date.now();
      const urls = await uploadFilesAndGetUrls(args.files);

      const item: CaseItem = {
        id: crypto.randomUUID(),
        description: args.content,
        latitude: args.latitude,
        longitude: args.longitude,
        status: args.reportType === "completed" ? "completed" : "pending",
        urgency: args.emergency ? "emergency" : ("normal" as CaseUrgency),
        images: urls,
        createdAt: now,
        updatedAt: now,
      };
      store.actions.upsert(item);
      // 後送 Google Sheets（最佳努力，不阻塞本地）
      appendToSheet(item).catch(() => {});
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.list });
    },
  });
}


