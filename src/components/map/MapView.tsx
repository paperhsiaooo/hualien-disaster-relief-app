"use client";

import { useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvent, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, LatLng } from "@/types/map";

// 修正預設 Marker 圖示在打包環境的路徑問題
// 使用 import.meta.url 生成絕對路徑

delete (L.Icon.Default.prototype as { _getIconUrl?: () => string | undefined })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
});

const STATUS_COLORS: Record<string, string> = {
  pending: "#facc15",
  claimed: "#3b82f6",
  completed: "#22c55e",
  default: "#9ca3af",
};

type MapMarkerShape = MapMarker extends infer T ? T : never;
type LatLngShape = LatLng extends infer T ? T : never;

export type MapViewProps = {
  initialCenter?: LatLngShape;
  center?: LatLngShape; // 若提供，會在變更時自動移動地圖中心
  markers?: MapMarkerShape[];
  onMapClick?: (coord: LatLngShape) => void;
  onMarkerClick?: (id: string) => void;
};

/**
 * Google Map 容器：
 * - 點擊地圖可回傳座標
 * - 支援外部傳入 markers 顯示
 */
export function MapView({ initialCenter = { lat: 23.6539, lng: 121.4231 }, center: externalCenter, markers = [], onMapClick, onMarkerClick }: MapViewProps) {
  const iconCache = useRef(new Map<string, L.DivIcon>());

  const getIconFor = useCallback((marker: MapMarker) => {
    const statusKey = marker.status ? String(marker.status) : "";
    const color = STATUS_COLORS[statusKey] ?? STATUS_COLORS.default;

    const fallbackEmergency = marker.urgency === "emergency" || marker.urgency === "both";
    const fallbackReinforcement = marker.urgency === "reinforcement" || marker.urgency === "both";
    const isEmergency = marker.isEmergency ?? fallbackEmergency;
    const needsReinforcement = marker.needsReinforcement ?? fallbackReinforcement;

    const cacheKey = `${color}-${isEmergency ? "E" : ""}${needsReinforcement ? "R" : ""}`;
    const cached = iconCache.current.get(cacheKey);
    if (cached) return cached;

    const overlays: string[] = [];
    if (isEmergency) {
      overlays.push(
        `<span style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:9999px;background:#ef4444;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;">!</span>`
      );
    }
    if (needsReinforcement) {
      overlays.push(
        `<span style="position:absolute;bottom:-6px;left:-6px;width:16px;height:16px;border-radius:9999px;background:#f97316;color:#111827;display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;">✋</span>`
      );
    }

    const overlayHtml = overlays.join("");

    const html = `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${overlayHtml}</span>`;

    const icon = L.divIcon({ className: "custom-marker leaflet-div-icon", html, iconSize: [26, 26], iconAnchor: [13, 13] });
    iconCache.current.set(cacheKey, icon);
    return icon;
  }, []);

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
    <MapContainer center={[initialCenter.lat, initialCenter.lng]} zoom={14} style={{ width: "100%", height: "100%" }} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CenterController center={externalCenter} />
      <MapEvents />
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.position.lat, m.position.lng]}
          icon={getIconFor(m)}
          eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m.id) }}
        />
      ))}
    </MapContainer>
  );
}
