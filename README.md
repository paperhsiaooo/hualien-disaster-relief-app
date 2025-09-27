此專案為行動優先的地圖資源整合頁面，實作需求包含：Google Maps、右下角浮動 + 按鈕、三段彈窗（選點方式 → 座標確認 → 案件回報）、頂部篩選列、前端檔案限制與直傳介面。

## Getting Started

準備環境變數：

1) 建立 `.env.local`：

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=你的GoogleMapsAPIKey
```

2) 啟動開發伺服器：

```bash
yarn dev
```

打開 `http://localhost:3000` 查看。

主要頁面：`src/app/page.tsx`。

技術棧：Next.js 15、Tailwind v4、Radix UI、React Hook Form + Zod、@tanstack/react-query、Framer Motion、@vis.gl/react-google-maps。

上傳策略：前端限制檔案型別（jpg/jpeg/png/webp/avif）、大小（≤5MB/檔）、數量（最多3）；實際上傳請以預先簽名 URL 直傳物件儲存（如 Cloudflare R2/S3/Cloudinary）。

Google Sheets 後送（可選）：

```
GOOGLE_SHEETS_CLIENT_EMAIL=...@....gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_SHEETS_SPREADSHEET_ID=你的sheetId
# 可選，預設 Sheet1
GOOGLE_SHEETS_SHEET_NAME=Sheet1
```

注意：請在 Google 試算表中把服務帳戶 email 加入共享（可編輯）。

R2 物件儲存（上傳直傳）：

```
R2_ACCOUNT_ID=你的 Cloudflare 帳號 ID
R2_ACCESS_KEY_ID=你的 R2 存取金鑰識別碼
R2_SECRET_ACCESS_KEY=你的 R2 秘密金鑰
R2_BUCKET=你的 R2 bucket 名稱
R2_PUBLIC_BASE=你的公開讀取 URL 前綴（例如 https://r2.cdn.example.com）
```

流程：前端計算檔案雜湊 → 取得預簽名 URL → 以 PUT 直傳到 R2 → 取回公開 URL → 與案件 metadata 一起寫入 Google Sheet。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
