import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { transformToCaseItem, type CaseRow } from "@/lib/cases";
import type { CaseStatus } from "@/types/case";

type UpdatePayload = {
  description?: string;
  status?: CaseStatus;
  emergency?: boolean;
  reinforcement?: boolean;
  images?: string[];
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

    const body = (await req.json()) as UpdatePayload;
    const { description, status, emergency, reinforcement, images } = body;
    const rows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [caseId]);
    if (!rows.length) {
      return Response.json({ error: "案件不存在" }, { status: 404 });
    }
    const current = transformToCaseItem(rows[0]);
    const nextStatus = status ?? current.status;
    const nextEmergency = emergency ?? current.isEmergency ?? false;
    const nextReinforcement = reinforcement ?? current.needsReinforcement ?? false;
    const nextImages = Array.isArray(images) ? images : current.images ?? [];

    await query(
      `UPDATE cases
       SET description = ?,
           status = ?,
           is_emergency = ?,
           needs_reinforcement = ?,
           images = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [
        description ?? current.description,
        nextStatus,
        nextStatus === "completed" ? 0 : nextEmergency ? 1 : 0,
        nextStatus === "completed" ? 0 : nextReinforcement ? 1 : 0,
        JSON.stringify(nextImages),
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
