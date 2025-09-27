/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { query } from "@/lib/db";

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

const COLUMN_COUNT = 15; // A-O

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdatePayload;
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
    } = body;

    if (!caseId) {
      return new Response(JSON.stringify({ error: "缺少 caseId" }), { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: "缺少 Sheets 環境變數" }), { status: 500 });
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const getRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const values = getRes.data.values || [];

    let targetRowIndex = -1;
    let targetRow: string[] | undefined;

    for (let i = 0; i < values.length; i += 1) {
      const row = values[i];
      const existingId = (row[14] || "").toString();
      if (existingId === caseId) {
        targetRowIndex = i;
        targetRow = row as string[];
        break;
      }
    }

    if (!targetRow || targetRowIndex === -1) {
      // Sheets 找不到，嘗試改走 DB 更新（相容 DB-only 案件）
      const rows = await query<any[]>("SELECT * FROM cases WHERE id = ?", [caseId]);
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

      const sql = `UPDATE cases SET ${updates.join(", ")} WHERE id = ?`;
      params.push(caseId);
      await query(sql, params);

      return new Response(JSON.stringify({ ok: true, source: "db" }), { status: 200 });
    }

    const fullRow = new Array<string>(COLUMN_COUNT).fill("");
    for (let i = 0; i < Math.min(COLUMN_COUNT, targetRow.length); i += 1) {
      fullRow[i] = targetRow[i] ?? "";
    }

    if (claimedBy) {
      fullRow[9] = claimedBy.join("; ");
    }
    if (status) {
      fullRow[5] = status;
    }
    if (typeof emergency === "boolean") {
      fullRow[6] = emergency ? "true" : "";
    }
    if (typeof reinforcement === "boolean") {
      fullRow[7] = reinforcement ? "true" : "";
    }
    if (description !== undefined) {
      fullRow[2] = description;
    }
    if (images) {
      fullRow[8] = images.join(", ");
    }
    // 若 Sheet 有保留類別欄位，可在此指定對應欄位索引
    // 目前不更新 Sheet 類別欄，僅於 DB fallback 時處理
    if (completionDescription !== undefined) {
      fullRow[10] = completionDescription;
    }
    if (completionImages) {
      fullRow[11] = completionImages.join(", ");
    }
    if (completedBy !== undefined) {
      fullRow[12] = completedBy;
    }
    if (completedAt !== undefined) {
      fullRow[13] = completedAt ? new Date(completedAt).toISOString() : "";
    }
    fullRow[14] = caseId;

    const rowNumber = targetRowIndex + 1;
    const range = `${sheetName}!A${rowNumber}:O${rowNumber}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [fullRow],
      },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
