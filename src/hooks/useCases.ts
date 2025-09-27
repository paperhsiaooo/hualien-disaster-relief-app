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
  reinforcement: boolean;
  files: File[];
  reporterName: string;
};

type LocalCaseStore = ReturnType<typeof useLocalCaseStore>;

export function useCreateCaseMutation(store: LocalCaseStore) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateCaseArgs) => {
      const now = Date.now();
      const urls = await uploadFilesAndGetUrls(args.files);

      const isEmergency = args.emergency;
      const needsReinforcement = args.reinforcement;
      const urgency: CaseUrgency = isEmergency && needsReinforcement ? "both" : isEmergency ? "emergency" : needsReinforcement ? "reinforcement" : "normal";

      const item: CaseItem = {
        id: crypto.randomUUID(),
        description: args.content,
        latitude: args.latitude,
        longitude: args.longitude,
        status: args.reportType === "completed" ? "completed" : "pending",
        urgency,
        images: urls,
        reporterName: args.reporterName,
        reinforcement: needsReinforcement,
        isEmergency,
        needsReinforcement,
        claimedBy: [],
        completion: undefined,
        createdAt: now,
        updatedAt: now,
      };
      store.actions.upsert(item);
      // 後送 Google Sheets（最佳努力）
      await appendToSheet(item).catch(() => {});
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.list });
    },
  });
}
