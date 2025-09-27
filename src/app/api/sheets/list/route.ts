import type { CaseItem } from "@/types/case";
import { query } from "@/lib/db";
import { transformToCaseItem, type CaseRow } from "@/lib/cases";
import { NextRequest } from "next/server";

// Use shared CaseRow + transformer to include category and keep logic consistent

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const rows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [id]);
      if (!rows.length) {
        return new Response(JSON.stringify({ error: "案件不存在" }), { status: 404 });
      }
      const row = rows[0] as CaseRow;
      const item: CaseItem = transformToCaseItem(row);
      return new Response(JSON.stringify({ item }), { status: 200 });
    }

    const rows = await query<CaseRow[]>("SELECT * FROM cases ORDER BY created_at DESC");
    const items: CaseItem[] = rows.map((row) => transformToCaseItem(row));

    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
