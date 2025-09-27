"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Map, AdvancedMarker, Marker, MapCameraChangedEvent, useMap, type MapMouseEvent } from "@vis.gl/react-google-maps";

export type LatLng = { lat: number; lng: number };

type MapViewProps = {
  initialCenter?: LatLng;
  center?: LatLng; // 若提供，會在變更時自動移動地圖中心
  markers?: LatLng[];
  onMapClick?: (coord: LatLng) => void;
};

/**
 * Google Map 容器：
 * - 點擊地圖可回傳座標
 * - 支援外部傳入 markers 顯示
 */
export function MapView({ initialCenter = { lat: 23.991, lng: 121.601 }, center: externalCenter, markers = [], onMapClick }: MapViewProps) {
  const [mapCenter, setMapCenter] = useState<LatLng>(initialCenter);
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const map = useMap();
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "greedy" as const,
    }),
    []
  );

  const handleClick = useCallback((e: MapMouseEvent) => {
    const lat = e.detail.latLng?.lat;
    const lng = e.detail.latLng?.lng;
    if (typeof lat === "number" && typeof lng === "number" && onMapClick) onMapClick({ lat, lng });
  }, [onMapClick]);

  const handleCameraChanged = useCallback((e: MapCameraChangedEvent) => {
    if (e.detail.center) setMapCenter(e.detail.center as LatLng);
  }, []);

  // 外部傳入 center 時，主動移動地圖中心
  useEffect(() => {
    if (externalCenter && map) {
      map.setCenter(externalCenter as google.maps.LatLngLiteral);
    }
  }, [externalCenter, map]);

  return (
    <Map
      defaultCenter={initialCenter}
      defaultZoom={12}
      onClick={handleClick}
      onCameraChanged={handleCameraChanged}
      mapId={mapId || undefined}
      style={{ width: "100%", height: "100%" }}
      gestureHandling={mapOptions.gestureHandling}
      disableDefaultUI={mapOptions.disableDefaultUI}
      clickableIcons={mapOptions.clickableIcons}
    >
      {markers.map((m, idx) => {
        // 若沒有 mapId，退回使用一般 Marker，避免 Advanced Marker 警告
        return mapId ? (
          <AdvancedMarker key={idx} position={{ lat: m.lat, lng: m.lng }} />
        ) : (
          <Marker key={idx} position={{ lat: m.lat, lng: m.lng }} />
        );
      })}
    </Map>
  );
}

/**
 * 取用使用者目前位置。回傳座標或錯誤。
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


