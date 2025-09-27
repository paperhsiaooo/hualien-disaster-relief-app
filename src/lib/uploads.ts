import { sha256Hex } from "@/lib/hash";

export type Presign = {
  uploadUrl: string;
  publicUrl: string;
};

/**
 * 向本地 API 請求 R2 PUT 預簽名 URL。
 */
export async function requestPresignedUrl(filename: string, contentType: string, hashHex: string): Promise<Presign> {
  const ext = filename.split(".").pop() || "bin";
  const key = `${hashHex}.${ext}`;
  const res = await fetch("/api/r2/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, contentType }),
  });
  if (!res.ok) throw new Error("無法取得預簽名 URL");
  return res.json();
}

/**
 * 以 PUT 直傳至 R2。
 */
export async function directUpload(presign: Presign, file: File): Promise<string> {
  const put = await fetch(presign.uploadUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
  if (!put.ok) throw new Error("直傳 R2 失敗");
  return presign.publicUrl;
}

/**
 * 封裝：計算檔案 hash → 預簽名 → 直傳 → 回傳 public URL
 */
export async function uploadFilesAndGetUrls(files: File[]): Promise<string[]> {
  const results: string[] = [];
  for (const f of files) {
    const hashHex = await sha256Hex(f);
    const presign = await requestPresignedUrl(f.name, f.type, hashHex);
    const url = await directUpload(presign, f);
    results.push(url);
  }
  return results;
}


