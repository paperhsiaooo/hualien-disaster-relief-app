import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { CaseItem } from "@/types/case";
import { transformToCaseItem, type CaseRow } from "@/lib/cases";

export async function GET() {
  try {
    const rows = await query<CaseRow[]>("SELECT * FROM cases ORDER BY created_at DESC");
    const items: CaseItem[] = rows.map((row) => transformToCaseItem(row));
    return Response.json({ items }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { latitude, longitude, reportType, content, emergency, reinforcement, images = [], reporterName, category } = body as {
      latitude: number;
      longitude: number;
      reportType: "pending" | "completed";
      content: string;
      emergency: boolean;
      reinforcement: boolean;
      images?: string[];
      reporterName: string;
      category?: string;
      id?: string;
    };
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return Response.json({ error: "缺少座標" }, { status: 400 });
    }
    const id = body.id ?? crypto.randomUUID();
    const createdAt = new Date();
    const status = reportType === "completed" ? "completed" : "pending";
    const isEmergency = emergency === true;
    const needsReinforcement = reinforcement === true;

    await query(
      `INSERT INTO cases (id, reporter_name, category, description, latitude, longitude, status, is_emergency, needs_reinforcement, images, claimed_by, completion_description, completion_images, completed_by, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        id,
        reporterName || null,
        category || null,
        content,
        latitude,
        longitude,
        status,
        isEmergency ? 1 : 0,
        needsReinforcement ? 1 : 0,
        JSON.stringify(images ?? []),
        JSON.stringify([]),
        null,
        null,
        null,
        null,
        createdAt,
        createdAt,
      ]
    );
    const item: CaseItem = {
      id,
      description: content,
      latitude,
      longitude,
      status,
      urgency: isEmergency && needsReinforcement ? "both" : isEmergency ? "emergency" : needsReinforcement ? "reinforcement" : "normal",
      images,
      reporterName,
      reinforcement: needsReinforcement,
      claimedBy: [],
      createdAt: createdAt.getTime(),
      updatedAt: createdAt.getTime(),
      isEmergency,
      needsReinforcement,
      category: category || "其他災情",
    };
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return Response.json({ error: message }, { status: 500 });
  }
}
