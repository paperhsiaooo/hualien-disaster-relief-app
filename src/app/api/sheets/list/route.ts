import { google } from "googleapis";
import type { CaseItem } from "@/types/case";

const COLUMN_COUNT = 15;

/**
 * 讀取 Google Sheets 中的案件清單，回傳陣列。
 * 欄位順序與 /api/sheets/append 寫入一致：
 * [createdAtISO, reporterName, description, latitude, longitude, status, urgency, reinforcementFlag, imagesCSV, claimedByCSV, completionDescription, completionImagesCSV, completedBy, completedAtISO, caseId]
 */
export async function GET() {
  try {
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
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });

    const values = res.data.values || [];
    const items = values
      .map((row, idx) => {
        if (row.length < 9) {
          // 舊版欄位：createdAt, description, latitude, longitude, status, urgency, images
          const createdAt = Date.parse(row[0] || "") || Date.now();
          const description = (row[1] || "").toString();
          const latitude = parseFloat(row[2]);
          const longitude = parseFloat(row[3]);
          const status = (row[4] || "").toString();
          const urgency = (row[5] || "").toString();
          const imagesCSV = (row[6] || "").toString();
          const images = imagesCSV ? imagesCSV.split(/\s*,\s*/).filter(Boolean) : [];
          const isEmergency = urgency === "emergency" || urgency === "both";
          const needsReinforcement = urgency === "reinforcement" || urgency === "both";
          const combinedUrgency = isEmergency && needsReinforcement ? "both" : urgency || "normal";
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
          return {
            id: `sheet-${idx}-${createdAt}`,
            description,
            latitude,
            longitude,
            status,
            urgency: combinedUrgency,
            reinforcement: needsReinforcement,
            images,
            reporterName: "",
            claimedBy: [],
            isEmergency,
            needsReinforcement,
            createdAt,
            updatedAt: createdAt,
            sheetRow: idx + 1,
          } as CaseItem;
        }

        const filled = new Array<string>(COLUMN_COUNT).fill("");
        for (let i = 0; i < Math.min(COLUMN_COUNT, row.length); i += 1) {
          filled[i] = row[i] ?? "";
        }

        const createdAt = Date.parse(filled[0]) || Date.now();
        const reporterName = filled[1];
        const description = filled[2];
        const latitude = parseFloat(filled[3]);
        const longitude = parseFloat(filled[4]);
        const status = filled[5];
        const emergencyFlag = filled[6].toLowerCase() === "true";
        const reinforcementFlag = filled[7].toLowerCase() === "true";
        const imagesCSV = filled[8];
        const claimedByCSV = filled[9];
        const completionDescription = filled[10];
        const completionImagesCSV = filled[11];
        const completedBy = filled[12];
        const completedAtValue = filled[13] ? Date.parse(filled[13]) : NaN;
        const caseIdCell = filled[14];

        const images = imagesCSV ? imagesCSV.split(/\s*,\s*/).filter(Boolean) : [];
        const claimedBy = claimedByCSV ? claimedByCSV.split(/\s*;\s*/).filter(Boolean) : [];
        const completionImages = completionImagesCSV ? completionImagesCSV.split(/\s*,\s*/).filter(Boolean) : [];

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

        const combinedUrgency = emergencyFlag && reinforcementFlag ? "both" : emergencyFlag ? "emergency" : reinforcementFlag ? "reinforcement" : "normal";

        return {
          id: caseIdCell || `sheet-${idx}-${createdAt}`,
          description,
          latitude,
          longitude,
          status,
          urgency: combinedUrgency,
          reinforcement: reinforcementFlag,
          images,
          reporterName,
          claimedBy,
          completion:
            completionDescription || completionImages.length || completedBy || Number.isFinite(completedAtValue)
              ? {
                  description: completionDescription || undefined,
                  images: completionImages.length ? completionImages : undefined,
                  completedBy: completedBy || undefined,
                  completedAt: Number.isFinite(completedAtValue) ? completedAtValue : undefined,
                }
              : undefined,
          sheetRow: idx + 1,
          isEmergency: emergencyFlag,
          needsReinforcement: reinforcementFlag,
          createdAt,
          updatedAt: createdAt,
        } as CaseItem;
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
