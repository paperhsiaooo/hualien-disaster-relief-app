# 花蓮災情即時通報平台

花蓮災情即時通報平台是一個開源專案，目標是協助志工、地方救援單位與一般民眾，在災害發生時快速回報現場狀況、掌握救援進度並統整資源。系統提供地圖標記、案件追蹤、直傳照片與即時協作功能，讓災害資訊能夠透明且可驗證地流通。

## ✨ 特色亮點

- **即時地圖標記**：使用 Leaflet 自訂標記顏色與徽章，即時顯示案件狀態（待處理、已認領、已完成）與緊急程度。
- **多階段案件流程**：從案件回報、狀態更新到完成標記，皆支援補充描述與上傳現場照片。
- **志工協作機制**：使用者可認領案件、同步更新進度；前端使用 React Query 與本地快取即時反映狀態。
- **雲端照片直傳**：透過預先簽名 URL 直接上傳至 Cloudflare R2，搭配瀏覽器端圖片壓縮，大幅降低檔案大小。
- **Google Sheets 整合**：可選擇把案件紀錄寫入試算表，方便後端團隊或地方單位進行二次整理與備份。
- **行動優先介面**：採用 Next.js App Router、Tailwind CSS v4 與 shadcn-ui，針對手機操作優化。

## 🧱 架構總覽

| 區塊 | 技術 | 功能說明 |
| --- | --- | --- |
| 前端框架 | Next.js 15 (App Router) | 混合 CSR/SSR，支援動態載入地圖元件 |
| UI / UX | Tailwind CSS v4, shadcn-ui, Framer Motion | 建立一致的 UI 與互動動畫 |
| 表單驗證 | React Hook Form, Zod | 案件回報、更新與完成表單驗證 |
| 資料管理 | @tanstack/react-query | 快速同步遠端狀態、整合本地儲存 |
| 地圖系統 | react-leaflet, Leaflet | 顯示案件、切換狀態、自訂標記樣式 |
| 檔案處理 | browser-image-compression, Cloudflare R2 | 前端壓縮 + 預簽 URL 直傳，取得 CDN 公開連結 |
| 後端整合 | Next.js Route Handlers | `/api/cases/*` (MySQL CRUD) 與 `/api/r2/*` API 處理資料持久化 |

## ⚙️ 安裝與開發流程

### 1. 取得原始碼

```bash
git clone https://github.com/<your-org>/hualien-disaster-relief-app.git
cd hualien-disaster-relief-app
```

### 2. 安裝相依套件

```bash
yarn install
```

### 3. 設定環境變數

建立 `.env.local`，根據需求填入下列設定：

```bash
# 地圖/定位來源
NEXT_PUBLIC_MAPBOX_TOKEN=yourMapToken
NEXT_PUBLIC_GEOLOCATION_FALLBACK=23.6539,121.4231

# Cloudflare R2 物件儲存（圖片直傳）
R2_ACCOUNT_ID=yourAccountId
R2_ACCESS_KEY_ID=yourAccessKey
R2_SECRET_ACCESS_KEY=yourSecretKey
R2_BUCKET=yourBucketName
R2_PUBLIC_BASE=https://hualien-disaster-relief-app.cdn.liwei-cup.com

# Google Sheets（選用）
GOOGLE_SHEETS_CLIENT_EMAIL=bot@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=sheetId
GOOGLE_SHEETS_SHEET_NAME=Sheet1

# MySQL (案件資料)
MYSQL_HOST=yourMysqlHost
MYSQL_PORT=3306
MYSQL_USER=yourUser
MYSQL_PASSWORD=yourPassword
MYSQL_DATABASE=hualien_cases

# 案件預設參數（選用）
DEFAULT_CASE_EXPIRY_DAYS=7
```

> 📌 若啟用 Google Sheets，請先在該試算表共享清單中授權服務帳戶 email。

### 4. 啟動開發伺服器

```bash
yarn dev
```

開啟 <http://localhost:3000> 進行開發。

## 🧪 測試與 Lint

```bash
yarn lint
# 若有測試設定，可再執行
# yarn test
```

## 🚀 部署建議

1. Vercel、Netlify 或任何支援 Node.js 的平台皆可部署。
2. 將 `.env.local` 內容移至平台的環境變數管理。
3. Cloudflare R2、Google Sheets 與任何外部服務請採用最小權限原則。
4. 建議為圖片 CDN 設定快取，提升前端載入效率。

## 📁 目錄結構

```text
src/
├── app/
│   ├── layout.tsx          # 全域 metadata 與 React Query Provider
│   ├── page.tsx            # 主頁，含地圖、篩選、案件流程
│   └── api/
│       ├── cases/          # 案件 CRUD API（MySQL）
│       └── r2/             # R2 預簽名 URL API routes
├── components/
│   ├── map/                # 地圖元件、浮動按鈕
│   ├── report/             # 案件表單、上傳區與 UI 顯示
│   └── ui/                 # shadcn-ui 元件封裝
├── hooks/                  # 自訂 hooks（定位、案件 store 等）
├── lib/                    # 上傳、hash、db 連線等工具方法
└── types/                  # TypeScript 型別定義
```

## 🤝 貢獻指南

1. Fork 本專案並建立新分支：`git checkout -b feature/my-feature`
2. 撰寫並提交 commits（請附上清楚的摘要）
3. 若牽涉核心流程，建議同步新增或更新測試案例
4. 建立 Pull Request，說明變更內容、測試方式與可能的影響

### Issue 回報

- 使用 GitHub Issues 與 Template 回報 bug 或提需求。
- 請提供重現步驟、截圖或錯誤日誌，以及使用的瀏覽器／裝置資訊。
- 歡迎提供 UX、資料結構或救援流程方面的改善建議。

## 📄 授權條款

本專案以 [MIT License](LICENSE) 授權。你可以自由使用、修改與散布，但請保留原始授權聲明。

---

若你正在災區或協助救援，請優先確保自身安全，並於情況允許時使用此平台回報資訊。感謝所有協助花蓮的志工與夥伴，讓救援資訊能更即時、更透明。 