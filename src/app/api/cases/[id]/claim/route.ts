import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { transformToCaseItem, type CaseRow } from "@/lib/cases";

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

    const body = await req.json();
    const { name } = body as { name?: string };
    if (!name) {
      return Response.json({ error: "缺少認領者姓名" }, { status: 400 });
    }
    const rows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [caseId]);
    if (!rows.length) {
      return Response.json({ error: "案件不存在" }, { status: 404 });
    }
    const item = transformToCaseItem(rows[0]);
    const claimedBy = item.claimedBy ?? [];
    if (claimedBy.includes(name)) {
      return Response.json({ item }, { status: 200 });
    }
    claimedBy.push(name);
    await query("UPDATE cases SET claimed_by = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [JSON.stringify(claimedBy), caseId]);
    const updatedRows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [caseId]);
    const updated = transformToCaseItem(updatedRows[0]);
    return Response.json({ item: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return Response.json({ error: message }, { status: 500 });
  }
}
