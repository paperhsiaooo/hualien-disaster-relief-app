# 花蓮災情即時通報平台

花蓮災情即時通報平台是一個開源專案，協助志工、救援單位與民眾在災害發生時回報現場狀況、追蹤進度並整合資源。系統提供地圖標記、案件流程、圖片直傳與快取同步，讓資訊透明可追溯。

## ✨ 特色亮點（最新版）

- 地圖與篩選
  - Leaflet 自訂標記：緊急案件白框改紅色、需要增援顯示手掌符號。
  - 叢集顯示與點擊聚焦，底部左側顯示「- / +」縮放控制。
  - 以 `?case=ID` 連結直接定位（自動置中並放大，不會自動彈出彈窗）。
- 完整案件流程
  - 新增案件（Pending/Completed）、更新狀況、我要認領、標記完成。
  - 支援文字描述、緊急/需要增援旗標、圖片上傳與既有圖片保留/刪除。
  - 新增「災情類別」下拉選單（必填）：
    - 其他災情、環境污染、基礎設施、淹水災情、路樹災情、橋樑災情、土石災情、廣告招牌災情、道路災情
- 照片體驗
  - Cloudflare R2 預簽名直傳，前端壓縮，顯示以 CDN 網域。
  - 上傳預覽右上有「x」刪除按鈕（紅底圓形、較高 z-index、具 padding）。
- 共享連結
  - 案件詳情提供「分享連結」欄位（唯讀文字框）與複製圖示按鈕。
- 即時狀態反映
  - 完成/更新案件後，地圖標記立即更新（本地 store + React Query 失效）。
- 行動優先
  - Next.js App Router + Tailwind CSS v4 + shadcn-ui，針對手機操作優化。

## 🧱 技術與架構

| 區塊 | 技術 | 說明 |
| --- | --- | --- |
| 前端框架 | Next.js 15 (App Router) | CSR/SSR 混合，地圖元件動態載入 |
| UI/樣式 | Tailwind CSS v4, shadcn-ui | 現代化 UI 與樣式封裝 |
| 表單驗證 | React Hook Form, Zod | 表單驗證與錯誤提示 |
| 資料快取 | @tanstack/react-query | 快速同步遠端狀態 + 本地化暫存 |
| 地圖 | react-leaflet, Leaflet, markercluster | 標記渲染、叢集、置中/縮放控制 |
| 圖片上傳 | Cloudflare R2 + 預簽名 URL | 前端壓縮、直傳、回傳公開連結 |
| 持久化 | MySQL（主）、Google Sheets（相容層） | `/api/cases/*` 走 DB；`/api/sheets/*` 兼容與外部整合 |

> 註：專案以 MySQL 為主要資料來源。`/api/sheets/*` 提供 Google Sheets 整合與相容更新（找不到對應列時會回退至 DB 更新）。

## 🔌 API 路由（App Router）

- 上傳
  - `POST /api/r2/presign`：取得 R2 PUT 預簽名與公開網址。
- 案件（MySQL）
  - `GET  /api/cases`：讀取所有案件。
  - `POST /api/cases`：建立案件（含座標、內容、旗標、圖片、通報者與災情類別）。
  - `POST /api/cases/[id]/claim`：認領。
  - `POST /api/cases/[id]/complete`：標記完成（完成描述、圖片、完成者/時間）。
  - `POST /api/cases/[id]/update`：更新案件（描述、狀態、旗標、圖片、類別）。
- Sheets（整合/相容）
  - `GET  /api/sheets/list?id=...`：依 ID 讀取或列出所有案件（內部走 DB）。
  - `POST /api/sheets/update`：更新試算表；找不到時回退更新 DB。

## ⚙️ 開發環境

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
# MySQL（必要）
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=myuser
MYSQL_PASSWORD=mypassword
MYSQL_DATABASE=disaster

# Cloudflare R2（圖片直傳）
R2_ACCOUNT_ID=yourAccountId
R2_ACCESS_KEY_ID=yourAccessKey
R2_SECRET_ACCESS_KEY=yourSecretKey
R2_BUCKET=yourBucketName
# 公開讀取用的 CDN 網域（顯示圖片時會使用）
R2_PUBLIC_BASE=https://your-cdn-domain.example.com

# Google Sheets（選用：整合/相容層）
GOOGLE_SHEETS_CLIENT_EMAIL=bot@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=sheetId
GOOGLE_SHEETS_SHEET_NAME=Sheet1
```

> 提醒：若啟用 Sheets，請將服務帳戶 email 加入 Google Sheet 共享權限。

### 4) 建立資料表與欄位

最小化 `cases` 資料表結構（範例）：

```sql
CREATE TABLE `cases` (
  `id` VARCHAR(36) PRIMARY KEY,
  `reporter_name` VARCHAR(100) NULL,
  `category` VARCHAR(50) NULL,
  `description` TEXT NOT NULL,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `is_emergency` TINYINT(1) NOT NULL DEFAULT 0,
  `needs_reinforcement` TINYINT(1) NOT NULL DEFAULT 0,
  `images` TEXT NULL,
  `claimed_by` TEXT NULL,
  `completion_description` TEXT NULL,
  `completion_images` TEXT NULL,
  `completed_by` VARCHAR(100) NULL,
  `completed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL
);
```

若既有資料表缺少 `category` 欄位，可執行：`sql/20250927_add_category_to_cases.sql`。

### 5) 啟動開發伺服器

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

1. Vercel/自架 Node.js 皆可（Node 18+）。
2. 將 `.env.local` 內容配置到平台環境變數（特別是 MySQL 與 R2）。
3. R2 採最小權限；建議前綴 CDN 快取公開讀取。

## 📁 專案結構（節錄）

```text
src/
├── app/
│   ├── layout.tsx                 # 全域 metadata、React Query Provider
│   ├── page.tsx                   # 主頁：地圖、篩選、Dialog、表單、連結分享
│   └── api/
│       ├── r2/presign/route.ts    # 產生 R2 預簽名
│       ├── cases/route.ts         # GET/POST 案件（MySQL）
│       └── cases/[id]/            # 認領/完成/更新（POST）
│           ├── claim/route.ts
│           ├── complete/route.ts
│           └── update/route.ts
│       └── sheets/                # 整合/相容層（內部多使用 DB）
│           ├── list/route.ts
│           └── update/route.ts
├── components/
│   ├── map/                       # MapView、FAB、Leaflet 樣式
│   ├── report/                    # ReportForm、UploadArea（刪除按鈕）
│   └── ui/                        # shadcn-ui 封裝組件
├── hooks/                         # useCurrentLocation、useLocalCaseStore、useCases、useSheets
├── lib/                           # db（MySQL）、cases（轉換器）、uploads（R2）、hash
└── types/                         # 型別定義（案件、地圖）；含 leaflet.markercluster 宣告檔
```

## 📝 使用重點

- 新增案件：需選擇「災情類別」。
- 共享連結：在詳情視窗顯示唯讀連結欄位與複製圖示。
- 深連結：打開 `?case=ID` 會自動置中並放大到該案件，不自動開啟詳情。
- 縮放控制：`- / +` 控制位於地圖左下角，避免被上方篩選列遮擋。
- 圖片來源：顯示前會正規化為 CDN 網域（避免 localhost）。
- 名稱輸入視窗：僅一組「關閉 / 確認」按鈕，置於同一排。

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

——

若你正在災區或協助救援，請優先確保自身安全，並於情況允許時再回報資訊。感謝所有協助花蓮的志工與夥伴，讓救援資訊更即時、更透明。

