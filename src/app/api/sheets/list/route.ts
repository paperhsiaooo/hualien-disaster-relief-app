import { google } from "googleapis";

/**
 * 讀取 Google Sheets 中的案件清單，回傳陣列。
 * 欄位順序與 /api/sheets/append 寫入一致：
 * [createdAtISO, description, latitude, longitude, status, urgency, imagesCSV]
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
        const createdAt = Date.parse(row[0] || "") || Date.now();
        const description = row[1] || "";
        const latitude = parseFloat(row[2]);
        const longitude = parseFloat(row[3]);
        const status = (row[4] || "").toString();
        const urgency = (row[5] || "").toString();
        const imagesCSV = (row[6] || "").toString();
        const images = imagesCSV ? imagesCSV.split(/\s*,\s*/).filter(Boolean) : [];
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return {
          id: `sheet-${idx}-${createdAt}`,
          description,
          latitude,
          longitude,
          status,
          urgency,
          images,
          createdAt,
          updatedAt: createdAt,
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown" }), { status: 500 });
  }
}


