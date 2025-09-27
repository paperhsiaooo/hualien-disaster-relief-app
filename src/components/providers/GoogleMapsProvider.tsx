"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { ReactNode } from "react";

type GoogleMapsProviderProps = {
  children: ReactNode;
};

/**
 * 封裝 Google Maps 的 APIProvider。需要 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`。
 */
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID; // 用於 Advanced Markers
  if (!apiKey) {
    // 在沒有 API Key 時給予明確提示，避免白屏。
    return (
      <div className="p-4 text-sm text-red-600 dark:text-red-400">
        需要設定環境變數 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 才能載入地圖。
      </div>
    );
  }
  return (
    <APIProvider apiKey={apiKey} libraries={["marker"]}>
      {/* 將 mapId 透過 context 傳遞由子元件取用；這裡先放在 data-attr（簡單），或可用 React Context 擴充 */}
      <div data-map-id={mapId || ""}>{children}</div>
    </APIProvider>
  );
}


