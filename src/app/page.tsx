"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapView, useCurrentLocation, type LatLng, type MapMarker } from "@/components/map/MapView";
import type { CaseItem } from "@/types/case";
import { FAB } from "@/components/map/FAB";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FiltersBar } from "@/components/filters/FiltersBar";
import { ReportForm, type ReportFormValues } from "@/components/report/ReportForm";
import { useCasesQuery, useCreateCaseMutation } from "@/hooks/useCases";
import { useSheetsCases } from "@/hooks/useSheets";

type ActiveDialog = "start" | "confirm" | "report" | "info";

const DEFAULT_CENTER: LatLng = { lat: 23.6539, lng: 121.4231 };

export default function Home() {
  // 篩選狀態
  const [filters, setFilters] = useState({ status: "all", urgency: "completed" });

  // 地圖互動狀態
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const startOpen = activeDialog === "start";
  const confirmOpen = activeDialog === "confirm";
  const reportOpen = activeDialog === "report";
  const infoOpen = activeDialog === "info";
  const [pendingCoord, setPendingCoord] = useState<LatLng | null>(null);
  const [centerCommand, setCenterCommand] = useState<LatLng | null>(null);
  const [pendingUseCurrent, setPendingUseCurrent] = useState(false);
  const [mapSelectionActive, setMapSelectionActive] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [toast, setToast] = useState<string>("");

  const showDialog = useCallback((dialog: ActiveDialog | null) => {
    setActiveDialog(dialog);
  }, []);

  const { coord: currentCoord, error: locError, get: getCurrent } = useCurrentLocation();

  // 資料：以 localStorage + React Query 暫存
  const { data: cases } = useCasesQuery();
  const { data: sheets } = useSheetsCases();
  const createCase = useCreateCaseMutation();

  const markers = useMemo<MapMarker[]>(() => {
    const a = (cases ?? []).map((c) => ({ id: c.id, position: { lat: c.latitude, lng: c.longitude } }));
    const b = (sheets?.items ?? []).map((c) => ({ id: c.id, position: { lat: c.latitude, lng: c.longitude } }));
    return [...b, ...a];
  }, [cases, sheets]);

  const chooseByMap = () => {
    // 關閉視窗，等待使用者在地圖上取點
    setMapSelectionActive(true);
    setPendingCoord(null);
    setSelectedCase(null);
    showDialog(null);
  };

  const chooseByCurrent = () => {
    setMapSelectionActive(false);
    setPendingUseCurrent(true);
    setPendingCoord(null);
    setSelectedCase(null);
    showDialog(null);
    getCurrent();
  };

  const onMapClick = (c: LatLng) => {
    if (!mapSelectionActive && !confirmOpen) return;
    setSelectedCase(null);
    setPendingCoord(c);
    setMapSelectionActive(false);
    if (!confirmOpen) {
      showDialog("confirm");
    }
  };

  const confirmCoordinates = () => {
    showDialog("report");
  };

  const submitReport = async (values: ReportFormValues) => {
    if (!pendingCoord) return;
    await createCase.mutateAsync({
      latitude: pendingCoord.lat,
      longitude: pendingCoord.lng,
      reportType: values.reportType,
      content: values.content,
      emergency: values.emergency,
      files: values.files,
    });
    showDialog(null);
    setPendingCoord(null);
    setToast("已上傳完畢");
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    if (pendingUseCurrent && currentCoord) {
      setPendingCoord(currentCoord);
      setMapSelectionActive(false);
      setCenterCommand(currentCoord);
      showDialog("confirm");
      setPendingUseCurrent(false);
    }
  }, [pendingUseCurrent, currentCoord, showDialog]);

  useEffect(() => {
    if (pendingUseCurrent && locError) {
      setPendingUseCurrent(false);
      setMapSelectionActive(false);
      showDialog("start");
    }
  }, [pendingUseCurrent, locError, showDialog]);

  useEffect(() => {
    if (centerCommand) {
      const timer = setTimeout(() => setCenterCommand(null), 0);
      return () => clearTimeout(timer);
    }
  }, [centerCommand]);

  return (
    <div className="relative h-[100dvh] w-full">
      <FiltersBar value={filters} onChange={setFilters} />
      <div className="absolute inset-0 z-0 pt-[42px]">
        <MapView initialCenter={DEFAULT_CENTER} onMapClick={onMapClick} onMarkerClick={(id) => {
          const item = (sheets?.items ?? []).concat(cases ?? []).find((x) => x.id === id);
          if (item) {
            setPendingCoord({ lat: item.latitude, lng: item.longitude });
            setMapSelectionActive(false);
            setSelectedCase(item);
            showDialog("info");
          }
        }} markers={markers} center={centerCommand ?? undefined} />
        {/* 簡易：未實作標籤點擊後聚焦；後續可加入 Marker cluster 與點擊詳情 */}
      </div>

      {/* 右下角 + 按鈕 */}
      <Dialog
        open={startOpen}
        onOpenChange={(open) => {
          if (open) {
            setMapSelectionActive(false);
            setPendingCoord(null);
            setSelectedCase(null);
            showDialog("start");
          } else {
            showDialog(null);
            setPendingCoord(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <FAB />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增案件・選擇定位方式</DialogTitle>
            <DialogDescription>你可以點地圖選點，或使用目前位置。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button onClick={chooseByMap}>在地圖上點選位置</Button>
            <Button variant="outline" onClick={chooseByCurrent}>使用目前位置</Button>
            {currentCoord && (
              <div className="text-sm text-neutral-600 dark:text-neutral-300">
                目前位置：{currentCoord.lat.toFixed(5)}, {currentCoord.lng.toFixed(5)}
                <div className="mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setPendingCoord(currentCoord);
                      setMapSelectionActive(false);
                      showDialog("confirm");
                    }}
                  >
                    以目前位置建立
                  </Button>
                </div>
              </div>
            )}
            {locError && <div className="text-sm text-red-600">{locError}</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* 確認座標對話框 */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (open) {
            setMapSelectionActive(false);
            setSelectedCase(null);
            showDialog("confirm");
          } else {
            showDialog(null);
            setPendingCoord(null);
          }
        }}
      >
        <DialogContent hideOverlay>
          <DialogHeader>
            <DialogTitle>確認座標</DialogTitle>
            <DialogDescription>請在地圖上點擊選取位置，或確認座標後繼續。</DialogDescription>
          </DialogHeader>
          {pendingCoord ? (
            <div className="space-y-3">
              <div className="text-sm">緯度：{pendingCoord.lat.toFixed(6)}</div>
              <div className="text-sm">經度：{pendingCoord.lng.toFixed(6)}</div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => showDialog(null)}>取消</Button>
                <Button onClick={confirmCoordinates}>確認</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">尚未選取座標，請在地圖上點擊一個位置。</div>
          )}
        </DialogContent>
      </Dialog>

      {/* 回報表單對話框 */}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (open) {
            setSelectedCase(null);
            showDialog("report");
          } else {
            showDialog(null);
            setPendingCoord(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交案件</DialogTitle>
          </DialogHeader>
          {pendingCoord && (
            <ReportForm
              latitude={pendingCoord.lat}
              longitude={pendingCoord.lng}
              onSubmitReport={submitReport}
              onCancel={() => showDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 點位資訊對話框 */}
      <Dialog
        open={infoOpen}
        onOpenChange={(open) => {
          if (open) {
            setMapSelectionActive(false);
            showDialog("info");
          } else {
            showDialog(null);
            setSelectedCase(null);
            setPendingCoord(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>救災通報詳情</DialogTitle>
            <DialogDescription>查看志工回報的即時狀態。</DialogDescription>
          </DialogHeader>
          {selectedCase ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500">回報狀態</div>
                <div className="mt-1 text-base font-semibold">
                  {selectedCase.status === "completed" ? "已處理" : "待處理"}
                </div>
              </div>
              {selectedCase.urgency !== "normal" && (
                <div className="flex flex-wrap gap-2">
                  {selectedCase.urgency === "emergency" && <Badge variant="destructive">緊急狀態</Badge>}
                  {selectedCase.urgency === "reinforcement" && <Badge>需要增援</Badge>}
                </div>
              )}
              <div>
                <div className="text-xs text-neutral-500">通報時間</div>
                <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {new Date(selectedCase.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">通報內容</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-100">
                  {selectedCase.description || "未提供內容"}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">我要認領</Button>
                <Button>更新狀況</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">目前沒有可顯示的通報。</div>
          )}
        </DialogContent>
      </Dialog>

      {/* 簡易提示 */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-[60] rounded bg-black/80 text-white text-sm px-4 py-2">
          {toast}
        </div>
      )}
    </div>
  );
}
