"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import type { LatLng, MapMarker } from "@/types/map";
import type { MapViewProps } from "@/components/map/MapView";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CaseItem, CaseStatus } from "@/types/case";
import { FAB } from "@/components/map/FAB";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FiltersBar } from "@/components/filters/FiltersBar";
import { ReportForm, type ReportFormValues } from "@/components/report/ReportForm";
import { UploadArea } from "@/components/report/UploadArea";
import { useCasesQuery, useCreateCaseMutation } from "@/hooks/useCases";
import { useSheetsCases } from "@/hooks/useSheets";
import { uploadFilesAndGetUrls } from "@/lib/uploads";

const CDN_BASE_URL = "https://hualien-disaster-relief-app.cdn.liwei-cup.com";
const CDN_URL = new URL(CDN_BASE_URL);

const MapView = dynamic<MapViewProps>(() => import("@/components/map/MapView").then((mod) => mod.MapView), { ssr: false });

const formatDate = (value?: number) => {
  if (!value) return "";
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}年${m}月${d}日`;
};

type ReportCoreValues = Pick<ReportFormValues, "reportType" | "content" | "emergency" | "reinforcement" | "category">;

type ActiveDialog = "name" | "start" | "confirm" | "report" | "info" | "update" | "complete";

const DEFAULT_CENTER: LatLng = { lat: 23.6539, lng: 121.4231 };

// Keep a local copy of category options for type-narrowing when populating update form
const CATEGORY_OPTIONS_PAGE = [
  "其他災情",
  "環境污染",
  "基礎設施",
  "淹水災情",
  "路樹災情",
  "橋樑災情",
  "土石災情",
  "廣告招牌災情",
  "道路災情",
] as const;
type CategoryOption = (typeof CATEGORY_OPTIONS_PAGE)[number];
const resolveCategoryOption = (value?: string): CategoryOption =>
  (CATEGORY_OPTIONS_PAGE.includes((value as CategoryOption) ?? "" as CategoryOption)
    ? (value as CategoryOption)
    : "其他災情");

function HomeContent() {
  // 篩選狀態
  const [filters, setFilters] = useState({ status: { pending: false, claimed: false, completed: false }, urgency: { emergency: false, reinforcement: false } });

  // 地圖互動狀態
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const nameOpen = activeDialog === "name";
  const startOpen = activeDialog === "start";
  const confirmOpen = activeDialog === "confirm";
  const reportOpen = activeDialog === "report";
  const infoOpen = activeDialog === "info";
  const updateOpen = activeDialog === "update";
  const completeOpen = activeDialog === "complete";
  const [pendingCoord, setPendingCoord] = useState<LatLng | null>(null);
  const [centerCommand, setCenterCommand] = useState<LatLng | null>(null);
  const [zoomCommand, setZoomCommand] = useState<number | null>(null);
  const [pendingUseCurrent, setPendingUseCurrent] = useState(false);
  const [mapSelectionActive, setMapSelectionActive] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [toast, setToast] = useState<string>("");
  const [userName, setUserName] = useState<string>("匿名");
  const [nameInput, setNameInput] = useState<string>("匿名");
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [completionDescription, setCompletionDescription] = useState<string>("");
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [updateInitialValues, setUpdateInitialValues] = useState<ReportCoreValues | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // removed unused copyToClipboard and shareUrl to satisfy build lint rules

  const showDialog = useCallback((dialog: ActiveDialog | null) => {
    setActiveDialog(dialog);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("hualien-user-name");
    if (!stored) {
      setUserName("匿名");
      setNameInput("匿名");
      showDialog("name");
      setIsNameConfirmed(false);
      return;
    }
    setUserName(stored);
    setNameInput(stored);
    setIsNameConfirmed(true);
  }, [showDialog]);

  useEffect(() => {
    if (nameOpen) {
      setNameInput(userName || "匿名");
    }
  }, [nameOpen, userName]);

  // 依網址參數開啟案件詳情
  // 注意：此 effect 需在 cases/sheets 初始化之後宣告，避免 TDZ 錯誤
  // 參考：https://developer.mozilla.org/docs/Web/JavaScript/Reference/Errors/Cant_access_lexical_declaration_before_init
  // 已移至下方（宣告 cases/sheets 之後）。

  const resolveImageSrc = useCallback((url: string) => {
    if (!url) return url;
    const trimmed = url.trim();

    // 已含協定，直接回傳經過 URL 正規化的結果
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        return new URL(trimmed).toString();
      } catch {
        return trimmed;
      }
    }

    // 協定省略成 //cdn/... 的格式
    if (trimmed.startsWith("//")) {
      return `${CDN_URL.protocol}${trimmed}`;
    }

    // 若字串是既有 CDN host（沒有協定），補上協定即可
    const cdnHost = CDN_URL.host;
    if (trimmed.startsWith(cdnHost)) {
      return `${CDN_URL.protocol}//${trimmed.replace(/^\/+/, "")}`;
    }

    // 本地位址一律強轉至 CDN
    if (/^(localhost|127\.0\.0\.1|::1)(:?\d+)?\//.test(trimmed)) {
      const normalized = trimmed.replace(/^[^/]+\//, "");
      return `${CDN_BASE_URL}/${normalized.replace(/^\/+/, "")}`;
    }

    // 其他情況視為相對路徑或缺少前導斜線
    return `${CDN_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
  }, []);

  const { coord: currentCoord, error: locError, get: getCurrent } = useCurrentLocation();

  // 資料：以 localStorage + React Query 暫存
  const { data: cases, store: caseStore } = useCasesQuery();
  const { data: sheets } = useSheetsCases();
  const createCase = useCreateCaseMutation(caseStore);

  // 依網址參數定位案件（在 cases/sheets 宣告之後，避免 TDZ）
  useEffect(() => {
    const caseIdParam = searchParams?.get("case");
    if (!caseIdParam) return;
    const combined = (sheets?.items ?? []).concat(cases ?? []);
    const found = combined.find((item) => item.id === caseIdParam);
    if (!found) return;
    setPendingCoord({ lat: found.latitude, lng: found.longitude });
    setMapSelectionActive(false);
    setCenterCommand({ lat: found.latitude, lng: found.longitude });
    setZoomCommand(17); // 放大一點
    setSelectedCase(found);
    // 不自動開啟詳情視窗，僅移動與縮放
  }, [searchParams, cases, sheets]);

  const statusSelection = filters.status;
  const showAllStatuses = !statusSelection.pending && !statusSelection.claimed && !statusSelection.completed;

  const urgencySelection = filters.urgency;
  const showAllUrgencies = !urgencySelection.emergency && !urgencySelection.reinforcement;

  const caseHasEmergency = useCallback((item: CaseItem | null | undefined) => {
    if (!item || item.status === "completed") return false;
    if (typeof item.isEmergency === "boolean") {
      return item.isEmergency;
    }
    const fallback = item.urgency === "emergency" || item.urgency === "both";
    return fallback;
  }, []);

  const caseNeedsReinforcement = useCallback((item: CaseItem | null | undefined) => {
    if (!item || item.status === "completed") return false;
    if (typeof item.needsReinforcement === "boolean") {
      return item.needsReinforcement;
    }
    if (typeof item.reinforcement === "boolean") {
      return item.reinforcement;
    }
    const fallback = item.urgency === "reinforcement" || item.urgency === "both";
    return fallback;
  }, []);

  const isStatusVisible = useCallback(
    (status?: CaseStatus | string) => {
      if (status === "completed") return statusSelection.completed || showAllStatuses;
      if (showAllStatuses) return true;
      if (!status) return false;
      if (status === "pending") return statusSelection.pending;
      if (status === "claimed") return statusSelection.claimed;
      return false;
    },
    [showAllStatuses, statusSelection.pending, statusSelection.claimed, statusSelection.completed]
  );

  const isUrgencyVisible = useCallback(
    (item: CaseItem | null | undefined) => {
      if (showAllUrgencies) return true;
      if (!item) return false;
      if (item.status === "completed") return false;
      const emergencySelected = urgencySelection.emergency;
      const reinforcementSelected = urgencySelection.reinforcement;
      if (!emergencySelected && !reinforcementSelected) return true;
      const hasEmergency = caseHasEmergency(item);
      const needsReinforcement = caseNeedsReinforcement(item);
      return (emergencySelected && hasEmergency) || (reinforcementSelected && needsReinforcement);
    },
    [showAllUrgencies, urgencySelection.emergency, urgencySelection.reinforcement, caseHasEmergency, caseNeedsReinforcement]
  );

  const markers = useMemo<MapMarker[]>(() => {
    const toMarker = (c: CaseItem): MapMarker => ({
      id: c.id,
      position: { lat: c.latitude, lng: c.longitude },
      status: c.status,
      urgency: c.urgency,
      isEmergency: caseHasEmergency(c),
      needsReinforcement: caseNeedsReinforcement(c),
    });
    const visibleCases = (cases ?? []).filter((c) => isStatusVisible(c.status) && isUrgencyVisible(c));
    const visibleSheets = (sheets?.items ?? []).filter((c) => isStatusVisible(c.status) && isUrgencyVisible(c));
    const merged = new Map<string, CaseItem>();
    for (const item of visibleSheets) {
      if (item.id) merged.set(item.id, item);
    }
    for (const item of visibleCases) {
      if (item.id) merged.set(item.id, item);
    }
    return Array.from(merged.values()).map(toMarker);
  }, [cases, sheets, isStatusVisible, isUrgencyVisible, caseHasEmergency, caseNeedsReinforcement]);

  const selectedHasEmergency = caseHasEmergency(selectedCase);
  const selectedNeedsReinforcement = caseNeedsReinforcement(selectedCase);

  const shareUrl = useMemo(() => {
    if (!selectedCase?.id) return "";
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("case", selectedCase.id);
    return url.toString();
  }, [selectedCase?.id]);

  const copyCaseLink = useCallback(async () => {
    const link = shareUrl;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setToast("🔗 已複製案件連結");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setToast("🔗 已複製案件連結");
      } catch {
        setToast("⚠️ 複製失敗");
      }
    }
    setTimeout(() => setToast(""), 2500);
  }, [shareUrl]);

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
    if (mapSelectionActive) {
      setSelectedCase(null);
      setPendingCoord(c);
      return;
    }
    if (confirmOpen) {
      setPendingCoord(c);
      return;
    }
  };

  const confirmCoordinates = () => {
    showDialog("report");
  };

  const submitReport = async (values: ReportFormValues) => {
    if (!pendingCoord) return;
    const reporter = (userName || nameInput).trim();
    await createCase.mutateAsync({
      latitude: pendingCoord.lat,
      longitude: pendingCoord.lng,
      reportType: values.reportType,
      content: values.content,
      emergency: values.emergency,
      reinforcement: values.reinforcement,
      files: values.files,
      reporterName: reporter || "匿名",
      category: values.category,
    });
    showDialog(null);
    setPendingCoord(null);
    setToast("✅ 通報已送出");
    setTimeout(() => setToast(""), 2500);
  };

  const confirmName = () => {
    const trimmed = nameInput.trim() || "匿名";
    setUserName(trimmed);
    setNameInput(trimmed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hualien-user-name", trimmed);
    }
    setIsNameConfirmed(true);
    showDialog(null);
  };

  const isLocalCase = (item: CaseItem) => caseStore.items.some((c) => c.id === item.id);

  const handleClaim = async () => {
    if (!selectedCase) return;
    setClaimLoading(true);
    const name = (userName || nameInput).trim() || "匿名";
    const claimed = selectedCase.claimedBy ?? [];
    if (claimed.includes(name)) {
      setToast("⚠️ 已經認領過囉");
      setTimeout(() => setToast(""), 2500);
      setClaimLoading(false);
      return;
    }
    const nextClaimed = [...claimed, name];
    try {
      if (selectedCase.id) {
        const res = await fetch(`/api/cases/${selectedCase.id}/claim`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `update-failed (${res.status})`);
        }
        const { item } = (await res.json()) as { item: CaseItem };
        caseStore.actions.upsert(item);
      }
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      setSelectedCase((prev) => (prev ? { ...prev, claimedBy: nextClaimed, updatedAt: Date.now() } : prev));
      setToast("✅ 已認領");
      showDialog(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      setToast(message ? `⚠️ 認領失敗：${message}` : "⚠️ 認領失敗，請稍後再試");
    } finally {
      setClaimLoading(false);
      setTimeout(() => setToast(""), 2500);
    }
  };

  const openCompleteDialog = () => {
    if (!selectedCase) return;
    setCompletionDescription(selectedCase.completion?.description ?? "");
    setCompletionFiles([]);
    setCompletionLoading(false);
    showDialog("complete");
  };

  const confirmSelectionFromMap = () => {
    if (!pendingCoord) return;
    setMapSelectionActive(false);
    showDialog("confirm");
  };

  const resetSelectionPin = () => {
    setPendingCoord(null);
    setMapSelectionActive(true);
  };

  const mapSelectionOverlay = mapSelectionActive && pendingCoord
    ? {
        coord: pendingCoord,
        onConfirm: confirmSelectionFromMap,
        onReset: resetSelectionPin,
      }
    : undefined;

  const submitCompletion = async () => {
    if (!selectedCase) return;
    const completedBy = (userName || nameInput).trim() || "匿名";
    setCompletionLoading(true);
    try {
      const uploaded = completionFiles.length ? await uploadFilesAndGetUrls(completionFiles) : [];
      const completedAt = Date.now();
      if (selectedCase.id) {
        const res = await fetch(`/api/cases/${selectedCase.id}/complete`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            completionDescription,
            completionImages: uploaded,
            completedBy,
            completedAt,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `update-failed (${res.status})`);
        }
        const { item } = (await res.json()) as { item: CaseItem };
        caseStore.actions.upsert(item);
      }
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      const updated: CaseItem = {
        ...selectedCase,
        status: "completed",
        urgency: "normal",
        reinforcement: false,
        completion: {
          description: completionDescription || selectedCase.completion?.description || undefined,
          images: uploaded.length
            ? [...(selectedCase.completion?.images ?? []), ...uploaded]
            : selectedCase.completion?.images,
          completedBy,
          completedAt,
        },
        isEmergency: false,
        needsReinforcement: false,
        updatedAt: completedAt,
      };
      if (isLocalCase(selectedCase)) {
        caseStore.actions.upsert(updated);
        await queryClient.invalidateQueries({ queryKey: ["cases"] });
      }
      setSelectedCase(updated);
      setToast("✅ 已標記完成");
      setCompletionDescription("");
      setCompletionFiles([]);
      showDialog(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      setToast(message ? `⚠️ 標記完成失敗：${message}` : "⚠️ 標記完成失敗");
    } finally {
      setCompletionLoading(false);
      setTimeout(() => setToast(""), 2500);
    }
  };

  const openUpdateDialog = () => {
    if (!selectedCase) return;
    setUpdateInitialValues({
      reportType: selectedCase.status === "completed" ? "completed" : "pending",
      content: selectedCase.description || "",
      emergency: caseHasEmergency(selectedCase),
      reinforcement: caseNeedsReinforcement(selectedCase),
      category: resolveCategoryOption(selectedCase.category),
    });
    setUpdateLoading(false);
    showDialog("update");
  };

  const submitUpdate = async (values: ReportFormValues) => {
    if (!selectedCase) return;
    setUpdateLoading(true);
    try {
      const retained = values.retainedExistingImages ?? selectedCase.images ?? [];
      const uploaded = values.files.length ? await uploadFilesAndGetUrls(values.files) : [];
      const newImages = uploaded.length ? [...retained, ...uploaded] : retained;
      const isEmergency = values.emergency;
      const needsReinforcement = values.reinforcement;
      const newStatus: CaseItem["status"] = values.reportType === "completed" ? "completed" : "pending";
      const newUrgency: CaseItem["urgency"] = isEmergency && needsReinforcement ? "both" : isEmergency ? "emergency" : needsReinforcement ? "reinforcement" : "normal";
      if (selectedCase.id) {
        const res = await fetch("/api/sheets/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            caseId: selectedCase.id,
            description: values.content,
            status: newStatus,
            emergency: isEmergency,
            reinforcement: needsReinforcement,
            images: newImages,
            category: values.category,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(typeof data?.error === "string" ? data.error : `update-failed (${res.status})`);
        }
        await queryClient.invalidateQueries({ queryKey: ["sheets", "cases"] });
      }
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      const updated: CaseItem = {
        ...selectedCase,
        description: values.content,
        status: newStatus,
        urgency: newUrgency,
        images: newImages,
        isEmergency: newStatus === "completed" ? false : isEmergency,
        needsReinforcement: newStatus === "completed" ? false : needsReinforcement,
        reinforcement: newStatus === "completed" ? false : needsReinforcement,
        category: values.category,
        updatedAt: Date.now(),
      };
      if (isLocalCase(selectedCase)) {
        caseStore.actions.upsert(updated);
      }
      setSelectedCase(updated);
      setToast("✅ 案件已更新");
      showDialog(null);
      setUpdateInitialValues(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      setToast(message ? `⚠️ 更新失敗：${message}` : "⚠️ 更新失敗，請稍後再試");
    } finally {
      setUpdateLoading(false);
      setTimeout(() => setToast(""), 2500);
    }
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
    if (!selectedCase) return;
    if (!isStatusVisible(selectedCase.status) || !isUrgencyVisible(selectedCase)) {
      setSelectedCase(null);
      if (infoOpen) showDialog(null);
    }
  }, [selectedCase, isStatusVisible, isUrgencyVisible, infoOpen, showDialog]);

  useEffect(() => {
    if (centerCommand || typeof zoomCommand === "number") {
      const timer = setTimeout(() => {
        setCenterCommand(null);
        setZoomCommand(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [centerCommand, zoomCommand]);

  return (
    <div className="relative h-[100dvh] w-full">
      <Dialog
        open={nameOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsNameConfirmed(false);
            showDialog("name");
          } else {
            if (isNameConfirmed) {
              showDialog(null);
            } else {
              showDialog("name");
            }
          }
        }}
      >
        <DialogContent className="z-[3500]" overlayClassName="z-[3400]" preventOutsideClose={!nameInput.trim()}>
          <DialogHeader>
            <DialogTitle>請輸入姓名</DialogTitle>
            <DialogDescription>方便志工辨識您的身分。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="輸入姓名" value={nameInput} onChange={(e) => setNameInput(e.target.value)} autoFocus />
            <div className="flex justify-end">
              <Button onClick={confirmName}>
                確認
              </Button>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" onClick={() => showDialog(null)}>關閉</Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" onClick={() => showDialog(null)}>關閉</Button>
          </div>
        </DialogContent>
      </Dialog>

      <FiltersBar value={filters} onChange={setFilters} />
      <div className="absolute inset-0 z-0 pt-[42px]">
        <MapView initialCenter={DEFAULT_CENTER} selection={mapSelectionOverlay} onMapClick={onMapClick} onMarkerClick={async (id) => {
          try {
            const res = await fetch(`/api/sheets/list?id=${encodeURIComponent(id)}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`查詢案件失敗 (${res.status})`);
            const data = await res.json();
            const item = (data?.item as CaseItem) ?? (sheets?.items ?? []).concat(cases ?? []).find((x) => x.id === id);
            if (item) {
              setPendingCoord({ lat: item.latitude, lng: item.longitude });
              setMapSelectionActive(false);
              setSelectedCase(item);
              showDialog("info");
            } else {
              setToast("⚠️ 找不到該案件");
              setTimeout(() => setToast(""), 2500);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : "未知錯誤";
            setToast(`⚠️ 讀取案件失敗：${msg}`);
            setTimeout(() => setToast(""), 2500);
          }
        }} markers={markers} center={centerCommand ?? undefined} zoom={typeof zoomCommand === 'number' ? zoomCommand : undefined} />
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
            <DialogDescription>請確認以下資訊是否正確。</DialogDescription>
          </DialogHeader>
          {pendingCoord ? (
            <div className="space-y-3">
              <div className="text-sm">通報者：{(userName || nameInput).trim() || "未提供姓名"}</div>
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
            resolveImageSrc={resolveImageSrc}
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
        <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>救災通報詳情</DialogTitle>
            <DialogDescription>查看志工回報的即時狀態。</DialogDescription>
          </DialogHeader>
          {selectedCase ? (
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              <div>
                <div className="text-xs text-neutral-500">回報狀態</div>
                <div className="mt-1 text-base font-semibold">
                  {selectedCase.status === "completed" ? "已處理" : "待處理"}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">通報者</div>
                <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {selectedCase.reporterName?.trim() || "未提供姓名"}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">分享連結</div>
                <div className="mt-1 flex items-center gap-2">
                  <Input value={shareUrl} disabled readOnly className="text-xs" />
                  <button
                    type="button"
                    onClick={copyCaseLink}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    aria-label="複製連結"
                    title="複製連結"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 9h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
                      <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 7V6a2 2 0 0 1 2-2h7" />
                      <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 7h7a2 2 0 0 1 2 2v7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">災情類別</div>
                <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {selectedCase.category || "其他災情"}
                </div>
              </div>
              {selectedCase.status !== "completed" && (selectedHasEmergency || selectedNeedsReinforcement) && (
                <div className="flex flex-wrap gap-2">
                  {selectedHasEmergency && <Badge variant="destructive">緊急狀態</Badge>}
                  {selectedNeedsReinforcement && <Badge>需要增援</Badge>}
                </div>
              )}
              {selectedCase.claimedBy && selectedCase.claimedBy.length > 0 && (
                <div>
                  <div className="text-xs text-neutral-500">認領人</div>
                  <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                    {selectedCase.claimedBy.join("、")}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-neutral-500">通報時間</div>
                <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {formatDate(selectedCase.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">通報內容</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-100">
                  {selectedCase.description || "未提供內容"}
                </p>
              </div>
              {selectedCase.images && selectedCase.images.length > 0 && (
                <div>
                  <div className="text-xs text-neutral-500">現場照片</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedCase.images.map((src, idx) => (
                      <div key={`${selectedCase.id}-img-${idx}`} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                        <Image
                          src={resolveImageSrc(src)}
                          alt="救災現場照片"
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedCase.completion && (
                <div className="space-y-2">
                  <div className="text-xs text-neutral-500">完成內容</div>
                  {selectedCase.completion.description && (
                    <p className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-100">
                      {selectedCase.completion.description}
                    </p>
                  )}
                  {selectedCase.completion.images && selectedCase.completion.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selectedCase.completion.images.map((src, idx) => (
                        <div key={`${selectedCase.id}-complete-${idx}`} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          <Image src={resolveImageSrc(src)} alt="完成照片" fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" unoptimized />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-neutral-500">
                    完成資訊：{selectedCase.completion.completedBy || "未提供"}
                    {selectedCase.completion.completedAt && ` ・ ${formatDate(selectedCase.completion.completedAt)}`}
                  </div>
                </div>
              )}
              <div className="grid w-full grid-cols-3 gap-2">
                {selectedCase.status !== "completed" && (
                  <Button className="w-full" variant="outline" onClick={handleClaim} disabled={claimLoading}>
                    {claimLoading ? "認領中…" : "我要認領"}
                  </Button>
                )}
                {selectedCase.status !== "completed" && (
                  <Button className="w-full" variant="outline" onClick={openUpdateDialog} disabled={claimLoading}>
                    更新狀況
                  </Button>
                )}
                {selectedCase.status !== "completed" && (
                  <Button className="w-full" onClick={openCompleteDialog} disabled={claimLoading}>
                    標記完成
                  </Button>
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" onClick={() => showDialog(null)}>關閉</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">目前沒有可顯示的通報。</div>
          )}
        </DialogContent>
      </Dialog>

      {/* 更新案件對話框 */}
      <Dialog
        open={updateOpen}
        onOpenChange={(open) => {
          if (open) {
            showDialog("update");
          } else {
            setUpdateInitialValues(null);
            setUpdateLoading(false);
            if (activeDialog === "update") showDialog(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新案件</DialogTitle>
            <DialogDescription>修改案件內容與狀態。</DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <ReportForm
              latitude={selectedCase.latitude}
              longitude={selectedCase.longitude}
              onSubmitReport={submitUpdate}
              onCancel={() => showDialog(null)}
              initialValues={updateInitialValues ?? undefined}
              submitLabel={updateLoading ? "更新中…" : "更新"}
              loading={updateLoading}
              existingImages={selectedCase.images}
              resolveImageSrc={resolveImageSrc}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 標記完成對話框 */}
      <Dialog
        open={completeOpen}
        onOpenChange={(open) => {
          if (open) {
            showDialog("complete");
          } else {
            setCompletionFiles([]);
            setCompletionDescription("");
            setCompletionLoading(false);
            if (activeDialog === "complete") showDialog(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>標記完成</DialogTitle>
            <DialogDescription>填寫完成情況並可附上照片。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block" htmlFor="completion-description">
                完成內容描述
              </Label>
              <textarea
                id="completion-description"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                rows={4}
                value={completionDescription}
                onChange={(e) => setCompletionDescription(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">現場照片</Label>
              <UploadArea value={completionFiles} onChange={setCompletionFiles} />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCompletionFiles([]);
                  setCompletionDescription("");
                  setCompletionLoading(false);
                  showDialog(null);
                }}
                disabled={completionLoading}
              >
                取消
              </Button>
              <Button type="button" onClick={submitCompletion} disabled={completionLoading}>
                {completionLoading ? "上傳中…" : "確認完成"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 簡易提示 */}
      {toast && (
        <div className="fixed top-0 left-0 right-0 z-[4000] flex justify-center p-3" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-2 rounded-md bg-neutral-900/95 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-neutral-200/95 dark:text-neutral-900">
          {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
