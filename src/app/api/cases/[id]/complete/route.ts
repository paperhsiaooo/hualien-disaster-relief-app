import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { transformToCaseItem, type CaseRow } from "@/lib/cases";

type CompletePayload = {
  completionDescription?: string;
  completionImages?: string[];
  completedBy?: string;
  completedAt?: number;
};

// 為符合 Next.js 內部的 Handler 第二參數結構，這裡的 params 需為 Promise 型別且為必填
type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const params = (await context.params) ?? {};
    const rawId = params.id;
    const caseId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
    if (!caseId) {
      return Response.json({ error: "缺少 caseId" }, { status: 400 });
    }

    const body = (await req.json()) as CompletePayload;
    const completionDescription = body.completionDescription ?? null;
    const completionImages = Array.isArray(body.completionImages) ? body.completionImages : [];
    const completedBy = body.completedBy ?? null;
    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();

    const rows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [caseId]);
    if (!rows.length) {
      return Response.json({ error: "案件不存在" }, { status: 404 });
    }

    await query(
      `UPDATE cases
         SET status = 'completed',
             is_emergency = 0,
             needs_reinforcement = 0,
             completion_description = ?,
             completion_images = ?,
             completed_by = ?,
             completed_at = ?,
             updated_at = ?
       WHERE id = ?`,
      [
        completionDescription,
        JSON.stringify(completionImages),
        completedBy,
        completedAt,
        new Date(),
        caseId,
      ]
    );

    const updatedRows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [caseId]);
    const updated = transformToCaseItem(updatedRows[0]);
    return Response.json({ item: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return Response.json({ error: message }, { status: 500 });
  }
}
