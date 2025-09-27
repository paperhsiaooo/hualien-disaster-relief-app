# 花蓮災情即時通報平台

花蓮災情即時通報平台是一個開源專案，協助志工、地方救援單位與一般民眾在災害發生時回報現場狀況、追蹤進度並整合資源。系統提供地圖標記、案件流程、照片直傳與快取同步，讓資訊透明可追溯。

## ✨ 特色亮點

- **即時地圖與篩選**：Leaflet 自訂標記與徽章，依狀態與緊急程度過濾顯示。
- **完整案件流程**：提交案件、更新狀況、我要認領、標記完成，皆支援描述與照片。
- **照片體驗最佳化**：
  - 前端壓縮 + R2 預簽名直傳，顯示使用 CDN 網域。
  - 上傳預覽右上有「x」刪除按鈕（紅底圓形、較高 z-index、具 padding）。
  - 既有照片亦可個別移除。
- **地圖選點提示**：點「在地圖上點選位置」後，頂端顯示常駐提示「請在地圖上點選位置」，直到確認座標才消失。
- **即時狀態反映**：標記完成或更新案件後，地圖標記立即更新（本地 store + React Query 失效）。
- **行動優先**：Next.js App Router + Tailwind CSS v4 + shadcn-ui，針對手機操作優化。

## 🧱 技術與架構

| 區塊 | 技術 | 說明 |
| --- | --- | --- |
| 前端框架 | Next.js 15 (App Router) | CSR/SSR 混合、動態載入地圖元件 |
| UI/動畫 | Tailwind CSS v4, shadcn-ui, Framer Motion | 現代化 UI 與互動 |
| 表單驗證 | React Hook Form, Zod | 表單驗證與錯誤提示 |
| 資料快取 | @tanstack/react-query | 快速同步遠端狀態 + 本地化暫存 |
| 地圖 | react-leaflet, Leaflet | 標記渲染、點擊事件、置中控制 |
| 圖片上傳 | Cloudflare R2 + 預簽名 URL | 前端壓縮、直傳、回傳公開連結 |
| 資料持久化 | Google Sheets API | 以 `/api/sheets/*` 處理 append/list/update |

> 備註：目前主資料來源為 Google Sheets。若需改為 DB（例如 MySQL），可於後端 Route Handlers 另行實作。

## 🔌 API 路由（App Router）

- `POST /api/r2/presign`：取得 R2 預簽名上傳資訊。
- `POST /api/sheets/append`：新增一筆案件資料至試算表。
- `GET  /api/sheets/list`：取得案件列表。
- `POST /api/sheets/update`：更新案件（內容、狀態、圖片等）。

## ⚙️ 安裝與開發

### 1) 取得原始碼

```bash
git clone https://github.com/<your-org>/hualien-disaster-relief-app.git
cd hualien-disaster-relief-app
```

### 2) 安裝相依

```bash
yarn install
```

### 3) 設定環境變數（.env.local）

```bash
# 地圖定位（選用範例）
NEXT_PUBLIC_GEOLOCATION_FALLBACK=23.6539,121.4231

# Cloudflare R2（圖片直傳）
R2_ACCOUNT_ID=yourAccountId
R2_ACCESS_KEY_ID=yourAccessKey
R2_SECRET_ACCESS_KEY=yourSecretKey
R2_BUCKET=yourBucketName
# 公開讀取用的 CDN 網域（顯示圖片時會使用）
R2_PUBLIC_BASE=https://hualien-disaster-relief-app.cdn.liwei-cup.com

# Google Sheets（主資料來源）
GOOGLE_SHEETS_CLIENT_EMAIL=bot@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=sheetId
GOOGLE_SHEETS_SHEET_NAME=Sheet1
```

> 提醒：請將服務帳戶 email 加入 Google Sheet 共享權限。

### 4) 啟動開發伺服器

```bash
yarn dev
```

開啟 <http://localhost:3000> 進行開發。

## 🧪 品質檢查

```bash
yarn lint
# 若專案加入測試，可再執行
# yarn test
```

## 🚀 部署指引

1. Vercel/Netlify/自架 Node.js 皆可。
2. 將 `.env.local` 內容配置到平台環境變數。
3. R2 與 Google Sheets 權限採最小化原則；R2 建議開啟 CDN 快取。

## 📁 專案結構（節錄）

```text
src/
├── app/
│   ├── layout.tsx          # 全域 metadata 與 React Query Provider
│   ├── page.tsx            # 主頁：地圖、篩選、各流程 Dialog 與表單
│   └── api/
│       ├── r2/
│       │   └── presign/route.ts   # 產生 R2 預簽名
│       └── sheets/                 # 與 Google Sheets 互動
│           ├── append/route.ts
│           ├── list/route.ts
│           └── update/route.ts
├── components/
│   ├── map/                # MapView、浮動按鈕 FAB
│   ├── report/             # ReportForm、UploadArea（含刪除 x 按鈕）
│   └── ui/                 # shadcn-ui 封裝
├── hooks/                  # 例如 useCurrentLocation、useLocalCaseStore
├── lib/                    # uploads（R2）、sheets（Google）、hash
└── types/                  # 型別定義（案件、地圖）
```

## 📝 使用重點

- 上傳照片只保留「選擇照片」按鈕，移除「拍照」。
- 預覽縮圖右上角固定顯示「x」刪除（紅底圓形、`z-10`、`p-1`）。
- 更新/詳情對話框顯示圖片時，會將來源統一解析為 CDN 網域（避免 localhost）。
- 點「在地圖上點選位置」後，頂部出現藍底提示，直到點選並確認座標。
- 完成/更新案件後，立即更新地圖標記並關閉對話框（本地 store + React Query 失效）。

## 🤝 貢獻

1. Fork 並建立分支：`git checkout -b feature/my-feature`
2. 撰寫並提交變更（附清楚摘要）
3. 若改動核心流程，建議補齊測試或手動驗證步驟
4. 建立 PR，描述變更、測試方式與可能影響

### Issue 回報

- 請提供重現步驟、截圖/錯誤日誌、瀏覽器/裝置資訊。
- 也歡迎提出 UX、資料結構與流程優化建議。

## 📄 授權

本專案以 [MIT License](LICENSE) 授權。

---

若你正在災區或協助救援，請優先確保自身安全，並於情況允許時再回報資訊。感謝所有協助花蓮的志工與夥伴，讓救援資訊更即時、更透明。