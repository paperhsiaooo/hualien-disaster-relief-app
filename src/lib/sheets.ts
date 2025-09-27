import { CaseItem } from "@/types/case";

/**
 * 呼叫本地 API，將資料附加到 Google Sheets。
 * 注意：為了安全，服務帳戶金鑰放在伺服器環境變數，由 API Route 存取。
 */
export async function appendToSheet(item: CaseItem) {
  await fetch("/api/sheets/append", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item),
  });
}


