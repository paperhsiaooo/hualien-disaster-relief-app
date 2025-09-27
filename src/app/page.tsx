"use client";

import { useMemo, useState } from "react";
import { MapView, useCurrentLocation, type LatLng } from "@/components/map/MapView";
import { FAB } from "@/components/map/FAB";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiltersBar } from "@/components/filters/FiltersBar";
import { ReportForm, type ReportFormValues } from "@/components/report/ReportForm";
import { useCasesQuery, useCreateCaseMutation } from "@/hooks/useCases";

export default function Home() {
  // 篩選狀態
  const [filters, setFilters] = useState({ status: "all", urgency: "completed" });

  // 地圖互動狀態
  const [startOpen, setStartOpen] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<LatLng | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pendingUseCurrent, setPendingUseCurrent] = useState(false);

  const { coord: currentCoord, error: locError, get: getCurrent } = useCurrentLocation();

  // 資料：以 localStorage + React Query 暫存
  const { data: cases } = useCasesQuery();
  const createCase = useCreateCaseMutation();

  const markers = useMemo<LatLng[]>(() => (cases ?? []).map((c) => ({ lat: c.latitude, lng: c.longitude })), [cases]);

  const chooseByMap = () => {
    // 引導使用者點地圖，並關閉當前視窗
    alert("請在地圖上點擊以選取座標");
    setStartOpen(false);
  };

  const chooseByCurrent = async () => {
    setPendingUseCurrent(true);
    setStartOpen(false);
    getCurrent();
  };

  const onMapClick = (c: LatLng) => {
    setPendingCoord(c);
    setConfirmOpen(true);
  };

  const confirmCoordinates = () => {
    setConfirmOpen(false);
    setReportOpen(true);
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
    setReportOpen(false);
  };

  // 取得目前位置後自動進入確認座標
  if (pendingUseCurrent && currentCoord) {
    setPendingCoord(currentCoord);
    setConfirmOpen(true);
    setPendingUseCurrent(false);
  }

  return (
    <div className="relative h-[100dvh] w-full">
      <FiltersBar value={filters} onChange={setFilters} />
      <div className="absolute inset-0 pt-[42px]">
        <MapView onMapClick={onMapClick} markers={markers} />
        {/* 簡易：未實作標籤點擊後聚焦；後續可加入 Marker cluster 與點擊詳情 */}
      </div>

      {/* 右下角 + 按鈕 */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
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
                  <Button size="sm" onClick={() => { setPendingCoord(currentCoord); setConfirmOpen(true); }}>以目前位置建立</Button>
                </div>
              </div>
            )}
            {locError && <div className="text-sm text-red-600">{locError}</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* 確認座標對話框 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認座標</DialogTitle>
            <DialogDescription>請確認位置資訊是否正確。</DialogDescription>
          </DialogHeader>
          {pendingCoord ? (
            <div className="space-y-3">
              <div className="text-sm">緯度：{pendingCoord.lat.toFixed(6)}</div>
              <div className="text-sm">經度：{pendingCoord.lng.toFixed(6)}</div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)}>取消</Button>
                <Button onClick={confirmCoordinates}>確認</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">尚未選取座標，請在地圖上點擊一個位置。</div>
          )}
        </DialogContent>
      </Dialog>

      {/* 回報表單對話框 */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交案件</DialogTitle>
          </DialogHeader>
          {pendingCoord && (
            <ReportForm
              latitude={pendingCoord.lat}
              longitude={pendingCoord.lng}
              onSubmitReport={submitReport}
              onCancel={() => setReportOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
