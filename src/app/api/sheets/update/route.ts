import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { CaseRow } from "@/lib/cases";

type UpdatePayload = {
  caseId: string;
  claimedBy?: string[];
  status?: string;
  description?: string;
  emergency?: boolean;
  reinforcement?: boolean;
  images?: string[];
  category?: string;
  completionDescription?: string;
  completionImages?: string[];
  completedBy?: string;
  completedAt?: number;
};

async function updateCaseInDatabase(payload: UpdatePayload) {
  const {
    caseId,
    claimedBy,
    status,
    description,
    emergency,
    reinforcement,
    images,
    category,
    completionDescription,
    completionImages,
    completedBy,
    completedAt,
  } = payload;

  const rows = await query<CaseRow[]>("SELECT * FROM cases WHERE id = ?", [caseId]);
  if (!rows.length) {
    return new Response(JSON.stringify({ error: "找不到對應案件" }), { status: 404 });
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (Array.isArray(claimedBy)) {
    updates.push("claimed_by = ?");
    params.push(JSON.stringify(claimedBy));
  }
  if (status !== undefined) {
    updates.push("status = ?");
    params.push(status);
    if (status === "completed") {
      updates.push("is_emergency = 0");
      updates.push("needs_reinforcement = 0");
    }
  }
  if (typeof emergency === "boolean") {
    updates.push("is_emergency = ?");
    params.push(emergency ? 1 : 0);
  }
  if (typeof reinforcement === "boolean") {
    updates.push("needs_reinforcement = ?");
    params.push(reinforcement ? 1 : 0);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    params.push(description);
  }
  if (Array.isArray(images)) {
    updates.push("images = ?");
    params.push(JSON.stringify(images));
  }
  if (typeof category === "string") {
    updates.push("category = ?");
    params.push(category || null);
  }
  if (completionDescription !== undefined) {
    updates.push("completion_description = ?");
    params.push(completionDescription);
  }
  if (Array.isArray(completionImages)) {
    updates.push("completion_images = ?");
    params.push(JSON.stringify(completionImages));
  }
  if (completedBy !== undefined) {
    updates.push("completed_by = ?");
    params.push(completedBy);
  }
  if (completedAt !== undefined) {
    updates.push("completed_at = ?");
    params.push(completedAt ? new Date(completedAt) : null);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP(3)");

  if (!updates.length) {
    return new Response(JSON.stringify({ ok: true, source: "db", message: "No changes" }), { status: 200 });
  }

  const sql = `UPDATE cases SET ${updates.join(", ")} WHERE id = ?`;
  params.push(caseId);
  await query(sql, params);

  return new Response(JSON.stringify({ ok: true, source: "db" }), { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdatePayload;
    const { caseId } = body;

    if (!caseId) {
      return new Response(JSON.stringify({ error: "缺少 caseId" }), { status: 400 });
    }

    return await updateCaseInDatabase(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

