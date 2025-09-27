import type { CaseItem, CaseStatus, CaseUrgency } from "@/types/case";

export type CaseRow = {
  id: string;
  reporter_name: string | null;
  category: string | null;
  description: string;
  latitude: number;
  longitude: number;
  status: CaseStatus;
  is_emergency: 0 | 1;
  needs_reinforcement: 0 | 1;
  images: string | null;
  claimed_by: string | null;
  completion_description: string | null;
  completion_images: string | null;
  completed_by: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const normalizeArray = (input: unknown) => {
  if (input === null || input === undefined) return [] as string[];
  if (Array.isArray(input)) {
    return input.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (Buffer.isBuffer(input)) {
    return normalizeArray(input.toString("utf8"));
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeArray(parsed);
    } catch {
      // 如果不是合法 JSON，就將逗號/分號/直線視為分隔符
      return trimmed.split(/\s*[|;,]\s*/).filter((item) => item.length > 0);
    }
  }
  return [];
};

export function computeUrgency(isEmergency: boolean, needsReinforcement: boolean): CaseUrgency {
  if (isEmergency && needsReinforcement) return "both";
  if (isEmergency) return "emergency";
  if (needsReinforcement) return "reinforcement";
  return "normal";
}

export function transformToCaseItem(row: CaseRow): CaseItem {
  const isEmergency = row.is_emergency === 1;
  const needsReinforcement = row.needs_reinforcement === 1;
  const completionImages = normalizeArray(row.completion_images);
  const completionDescription = row.completion_description ?? undefined;
  const completion: CaseItem["completion"] =
    completionDescription || completionImages.length || row.completed_by || row.completed_at
      ? {
          description: completionDescription,
          images: completionImages.length ? completionImages : undefined,
          completedBy: row.completed_by ?? undefined,
          completedAt: row.completed_at ? row.completed_at.getTime() : undefined,
        }
      : undefined;

  return {
    id: row.id,
    description: row.description,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status,
    urgency: computeUrgency(isEmergency, needsReinforcement),
    images: normalizeArray(row.images),
    reporterName: row.reporter_name ?? undefined,
    category: row.category ?? undefined,
    reinforcement: needsReinforcement,
    claimedBy: normalizeArray(row.claimed_by),
    completion,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
    isEmergency,
    needsReinforcement,
  };
}
