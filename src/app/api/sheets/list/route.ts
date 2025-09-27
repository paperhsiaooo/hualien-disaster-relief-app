import type { CaseItem } from "@/types/case";
import { query } from "@/lib/db";
import { NextRequest } from "next/server";

type CaseRow = {
  id: string;
  reporter_name: string | null;
  description: string;
  latitude: number;
  longitude: number;
  status: string;
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

function safeParseArray(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return input.split(/\s*[|;,]\s*/).filter(Boolean);
    }
  }
  return Array.isArray(input) ? input.filter((x) => typeof x === "string") : [];
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const rows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [id]);
      if (!rows.length) {
        return new Response(JSON.stringify({ error: "案件不存在" }), { status: 404 });
      }
      const row = rows[0];
      const isEmergency = row.is_emergency === 1;
      const needsReinforcement = row.needs_reinforcement === 1;
      const urgency = isEmergency && needsReinforcement ? "both" : isEmergency ? "emergency" : needsReinforcement ? "reinforcement" : "normal";
      const images = safeParseArray(row.images);
      const claimedBy = safeParseArray(row.claimed_by);
      const completionImages = safeParseArray(row.completion_images);
      const completionDescription = row.completion_description ?? undefined;
      const item: CaseItem = {
        id: row.id,
        description: row.description,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        status: row.status as CaseItem["status"],
        urgency,
        images,
        reporterName: row.reporter_name ?? undefined,
        reinforcement: needsReinforcement,
        claimedBy,
        completion:
          completionDescription || completionImages.length || row.completed_by || row.completed_at
            ? {
                description: completionDescription,
                images: completionImages.length ? completionImages : undefined,
                completedBy: row.completed_by ?? undefined,
                completedAt: row.completed_at ? row.completed_at.getTime() : undefined,
              }
            : undefined,
        sheetRow: undefined,
        isEmergency,
        needsReinforcement,
        createdAt: row.created_at.getTime(),
        updatedAt: row.updated_at.getTime(),
      };
      return new Response(JSON.stringify({ item }), { status: 200 });
    }

    const rows = await query<CaseRow[]>("SELECT * FROM cases ORDER BY created_at DESC");
    const items: CaseItem[] = rows.map((row) => {
      const isEmergency = row.is_emergency === 1;
      const needsReinforcement = row.needs_reinforcement === 1;
      const urgency = isEmergency && needsReinforcement ? "both" : isEmergency ? "emergency" : needsReinforcement ? "reinforcement" : "normal";
      const images = safeParseArray(row.images);
      const claimedBy = safeParseArray(row.claimed_by);
      const completionImages = safeParseArray(row.completion_images);
      const completionDescription = row.completion_description ?? undefined;
      const completion =
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
        status: row.status as CaseItem["status"],
        urgency,
        images,
        reporterName: row.reporter_name ?? undefined,
        reinforcement: needsReinforcement,
        claimedBy,
        completion,
        sheetRow: undefined,
        isEmergency,
        needsReinforcement,
        createdAt: row.created_at.getTime(),
        updatedAt: row.updated_at.getTime(),
      } satisfies CaseItem;
    });

    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
