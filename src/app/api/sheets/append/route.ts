import { NextRequest } from "next/server";
import { google } from "googleapis";

/**
 * 將案件寫入 Google Sheets：
 * 需要以下環境變數（Server-only）：
 * - GOOGLE_SHEETS_PRIVATE_KEY（JSON 服務帳戶金鑰的 private_key，需將 \n 還原為換行）
 * - GOOGLE_SHEETS_CLIENT_EMAIL（服務帳戶 email）
 * - GOOGLE_SHEETS_SPREADSHEET_ID（Sheet ID）
 * - GOOGLE_SHEETS_SHEET_NAME（可選，預設 Sheet1）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id: caseId,
      description,
      latitude,
      longitude,
      status,
      images,
      createdAt,
      reporterName,
      reinforcement,
      claimedBy,
      completion,
      isEmergency,
      needsReinforcement,
    } = body ?? {};

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
    const emergencyFlag = isEmergency ? "true" : "";
    const reinforcementBool = typeof needsReinforcement === "boolean" ? needsReinforcement : Boolean(reinforcement);
    const reinforcementFlag = reinforcementBool ? "true" : "";
    const claimedByCSV = Array.isArray(claimedBy) ? claimedBy.join("; ") : "";
    const completionImagesCSV = Array.isArray(completion?.images) ? completion?.images.join(", ") : "";
    const completionDescription = completion?.description || "";
    const completedBy = completion?.completedBy || "";
    const completedAtISO = completion?.completedAt ? new Date(completion.completedAt).toISOString() : "";

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            new Date(createdAt || Date.now()).toISOString(),
            reporterName || "",
            description || "",
            latitude,
            longitude,
            status || "",
            emergencyFlag,
            reinforcementFlag,
            Array.isArray(images) ? images.join(", ") : "",
            claimedByCSV,
            completionDescription,
            completionImagesCSV,
            completedBy,
            completedAtISO,
            caseId || "",
          ],
        ],
      },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
