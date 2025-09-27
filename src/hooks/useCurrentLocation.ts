"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/types/map";

/**
 * 取得使用者目前位置（client-only）。
 */
export function useCurrentLocation() {
  const [coord, setCoord] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  const get = useCallback(() => {
    if (!navigator.geolocation) {
      setError("此裝置不支援定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
      },
      (err) => {
        setError(err.message || "無法取得定位");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  return { coord, error, get } as const;
}


