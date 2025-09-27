/**
 * 案件狀態與緊急度型別。
 */
export type CaseStatus = "pending" | "claimed" | "completed";
export type CaseUrgency = "normal" | "reinforcement" | "emergency";

export type CaseReportType = "pending" | "completed"; // 規格要求的回報類型

export type CaseItem = {
  id: string;
  title?: string;
  description: string;
  latitude: number;
  longitude: number;
  status: CaseStatus;
  urgency: CaseUrgency;
  images?: string[]; // 儲存為 CDN / 物件儲存的公開 URL
  createdAt: number;
  updatedAt: number;
};


