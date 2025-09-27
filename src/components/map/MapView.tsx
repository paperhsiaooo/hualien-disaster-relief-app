"use client";

import { useCallback, useMemo, useState } from "react";
import { Map, AdvancedMarker, MapCameraChangedEvent, useMap } from "@vis.gl/react-google-maps";

export type LatLng = { lat: number; lng: number };

type MapViewProps = {
  initialCenter?: LatLng;
  markers?: LatLng[];
  onMapClick?: (coord: LatLng) => void;
};

/**
 * Google Map 容器：
 * - 點擊地圖可回傳座標
 * - 支援外部傳入 markers 顯示
 */
export function MapView({ initialCenter = { lat: 23.991, lng: 121.601 }, markers = [], onMapClick }: MapViewProps) {
  const [center, setCenter] = useState<LatLng>(initialCenter);
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "greedy" as const,
    }),
    []
  );

  const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat && lng && onMapClick) onMapClick({ lat, lng });
  }, [onMapClick]);

  const handleCameraChanged = useCallback((e: MapCameraChangedEvent) => {
    if (e.detail.center) setCenter(e.detail.center as LatLng);
  }, []);

  return (
    <Map
      defaultCenter={initialCenter}
      defaultZoom={12}
      onClick={handleClick}
      onCameraChanged={handleCameraChanged}
      mapId={undefined}
      style={{ width: "100%", height: "100%" }}
      gestureHandling={mapOptions.gestureHandling}
      disableDefaultUI={mapOptions.disableDefaultUI}
      clickableIcons={mapOptions.clickableIcons}
    >
      {markers.map((m, idx) => (
        <AdvancedMarker key={idx} position={{ lat: m.lat, lng: m.lng }} />
      ))}
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


