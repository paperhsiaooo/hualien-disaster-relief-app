"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvent, useMap, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { MapMarker, LatLng } from "@/types/map";
import { CATEGORY_EMOJI, CATEGORY_COLORS, type CategoryValue, CATEGORY_OPTIONS } from "@/constants/categories";

// 修正預設 Marker 圖示在打包環境的路徑問題
// 使用 import.meta.url 生成絕對路徑

delete (L.Icon.Default.prototype as { _getIconUrl?: () => string | undefined })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
});

type MapMarkerShape = MapMarker extends infer T ? T : never;
type LatLngShape = LatLng extends infer T ? T : never;

export type MapViewProps = {
  initialCenter?: LatLngShape;
  center?: LatLngShape; // 若提供，會在變更時自動移動地圖中心
  zoom?: number; // 若提供，center 變更時一併套用縮放
  zoomControl?: boolean; // 是否顯示 Leaflet 內建縮放控制
  zoomControlPosition?: L.ControlPosition; // 縮放控制位置
  markers?: MapMarkerShape[];
  onMapClick?: (coord: LatLngShape) => void;
  onMarkerClick?: (id: string) => void;
  selection?: {
    coord: LatLngShape;
    onConfirm: () => void;
    onReset: () => void;
  };
};

/**
 * Google Map 容器：
 * - 點擊地圖可回傳座標
 * - 支援外部傳入 markers 顯示
 */
export function MapView({ initialCenter = { lat: 23.6539, lng: 121.4231 }, center: externalCenter, zoom: externalZoom, zoomControl = true, zoomControlPosition = "bottomleft", markers = [], onMapClick, onMarkerClick, selection }: MapViewProps) {
  const iconCache = useRef(new Map<string, L.DivIcon>());
  const [clusterReady, setClusterReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined") return;
    (async () => {
      try {
        await import("leaflet.markercluster");
        if (!cancelled) setClusterReady(true);
      } catch (err) {
        console.error("Failed to load leaflet.markercluster", err);
        if (!cancelled) setClusterReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getIconFor = useCallback((marker: MapMarker) => {
    const statusKey = marker.status ? String(marker.status) : "";

    const fallbackEmergency = marker.urgency === "emergency" || marker.urgency === "both";
    const fallbackReinforcement = marker.urgency === "reinforcement" || marker.urgency === "both";
    const isEmergency = marker.isEmergency ?? fallbackEmergency;
    const needsReinforcement = marker.needsReinforcement ?? fallbackReinforcement;

    const categoryValue: CategoryValue = (() => {
      const value = marker.category;
      if (value && (CATEGORY_OPTIONS as readonly string[]).includes(value)) return value as CategoryValue;
      if (value === "廣告牌災情") return "廣告招牌災情";
      return "其他災情";
    })();

    const cacheKey = `${statusKey}-${categoryValue}-${isEmergency ? "E" : ""}${needsReinforcement ? "R" : ""}`;
    const cached = iconCache.current.get(cacheKey);
    if (cached) return cached;

    const categoryEmoji = CATEGORY_EMOJI[categoryValue] ?? CATEGORY_EMOJI["其他災情"];
    const categoryColor = CATEGORY_COLORS[categoryValue] ?? "#6b7280";

    const overlays: string[] = [];
    if (isEmergency) {
      overlays.push(`<span class="marker-overlay marker-overlay-top-right">!</span>`);
    }
    if (needsReinforcement) {
      overlays.push(`<span class="marker-overlay marker-overlay-bottom-left">✋</span>`);
    }

    const overlayHtml = overlays.join("");

    let backgroundColor = categoryColor;
    if (statusKey === "pending") backgroundColor = "#ffffff";
    if (statusKey === "claimed") backgroundColor = "#3b82f6";
    if (statusKey === "completed") backgroundColor = "#22c55e";

    const circleClass = isEmergency ? "marker-circle marker-circle--emergency" : "marker-circle";
    const baseHtml = `<span class="${circleClass}" style="background:${backgroundColor};">${categoryEmoji}</span>`;

    const html = `<span class="marker-wrapper">${baseHtml}${overlayHtml}</span>`;

    const icon = L.divIcon({ className: "custom-marker leaflet-div-icon", html, iconSize: [36, 36], iconAnchor: [18, 18] });
    iconCache.current.set(cacheKey, icon);
    return icon;
  }, []);

  const selectionIcon = useMemo(
    () =>
      L.divIcon({
        className: "selection-pin-icon",
        html: '<span class="selection-pin">📍</span>',
        iconSize: [32, 32],
        iconAnchor: [16, 28],
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
  const CenterController = ({ center, zoom }: { center?: LatLng; zoom?: number }) => {
    const map = useMap();
    useEffect(() => {
      if (center) map.setView([center.lat, center.lng], typeof zoom === "number" ? zoom : map.getZoom());
    }, [center, zoom, map]);
    return null;
  };

  return (
    <MapContainer center={[initialCenter.lat, initialCenter.lng]} zoom={14} style={{ width: "100%", height: "100%" }} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {zoomControl !== false && <ZoomControl position={zoomControlPosition} />}
      <CenterController center={externalCenter} zoom={externalZoom} />
      <MapEvents />
      {clusterReady ? (
        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={(cluster: { getChildCount: () => number }) =>
            L.divIcon({
              html: `<div class="marker-cluster-custom">${cluster.getChildCount()}</div>`,
              className: "marker-cluster",
              iconSize: L.point(40, 40, true),
            })
          }
          eventHandlers={{
            clusterclick: (event: L.LeafletEvent & { layer: unknown }) => {
              type ClusterLayerLike = { getBounds?: () => L.LatLngBoundsExpression; _map?: L.Map };
              const layer = event.layer as unknown as ClusterLayerLike;
              if (layer && typeof layer.getBounds === "function" && layer._map) {
                layer._map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 18 });
              }
            },
          }}
        >
          {markers.map((m) => (
            <Marker
              key={m.id}
              position={[m.position.lat, m.position.lng]}
              icon={getIconFor(m)}
              eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m.id) }}
            />
          ))}
        </MarkerClusterGroup>
      ) : (
        markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.position.lat, m.position.lng]}
            icon={getIconFor(m)}
            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m.id) }}
          />
        ))
      )}
      {selection && (
        <Marker position={[selection.coord.lat, selection.coord.lng]} icon={selectionIcon}>
          <Tooltip direction="top" offset={[0, -32]} permanent interactive>
            <div className="selection-tooltip">
              <div className="selection-tooltip__coords">
                緯度：{selection.coord.lat.toFixed(6)}
                <br />
                經度：{selection.coord.lng.toFixed(6)}
              </div>
              <div className="selection-tooltip__actions">
                <button
                  type="button"
                  className="selection-tooltip__button selection-tooltip__button--confirm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selection.onConfirm();
                  }}
                >
                  確認
                </button>
                <button
                  type="button"
                  className="selection-tooltip__button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selection.onReset();
                  }}
                >
                  重新釘選
                </button>
              </div>
            </div>
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
