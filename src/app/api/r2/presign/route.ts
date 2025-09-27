import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * 為 Cloudflare R2 產生 PUT 預簽名 URL。
 * 需要環境變數：
 * - R2_ACCOUNT_ID（或 R2 S3 endpoint 域名的一部分）
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET
 * - R2_PUBLIC_BASE（檔案公開讀取 URL 前綴，例：https://<你的自訂網域>）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, contentType } = body ?? {};
    if (!key || !contentType) {
      return new Response(JSON.stringify({ error: "缺少 key 或 contentType" }), { status: 400 });
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const publicBase = process.env.R2_PUBLIC_BASE; // 用於回傳 publicUrl

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
      return new Response(JSON.stringify({ error: "缺少 R2 環境變數" }), { status: 500 });
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });

    const publicUrl = `${publicBase.replace(/\/$/, "")}/${encodeURIComponent(key)}`;
    return new Response(JSON.stringify({ uploadUrl, publicUrl }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}


