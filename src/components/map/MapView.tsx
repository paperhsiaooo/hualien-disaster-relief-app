"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvent, useMap } from "react-leaflet";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

// 修正預設 Marker 圖示在打包環境的路徑問題
// 使用 import.meta.url 生成絕對路徑
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
});

export type LatLng = { lat: number; lng: number };
export type MapMarker = { id: string; position: LatLng };

type MapViewProps = {
  initialCenter?: LatLng;
  center?: LatLng; // 若提供，會在變更時自動移動地圖中心
  markers?: MapMarker[];
  onMapClick?: (coord: LatLng) => void;
  onMarkerClick?: (id: string) => void;
};

/**
 * Google Map 容器：
 * - 點擊地圖可回傳座標
 * - 支援外部傳入 markers 顯示
 */
export function MapView({ initialCenter = { lat: 23.6539, lng: 121.4231 }, center: externalCenter, markers = [], onMapClick, onMarkerClick }: MapViewProps) {
  const [mapCenter, setMapCenter] = useState<LatLng>(initialCenter);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "greedy" as const,
    }),
    []
  );

  const MapEvents = () => {
    useMapEvent("click", (e: L.LeafletMouseEvent) => {
      if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return null;
  };

  // 由子元件存取 Leaflet map 並在 center 改變時移動
  const CenterController = ({ center }: { center?: LatLng }) => {
    const map = useMap();
    useEffect(() => {
      if (center) map.setView([center.lat, center.lng]);
    }, [center, map]);
    return null;
  };

  return (
    <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={12} style={{ width: "100%", height: "100%" }} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CenterController center={externalCenter} />
      <MapEvents />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.position.lat, m.position.lng]} eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m.id) }} />
      ))}
    </MapContainer>
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


