import type { CaseStatus, CaseUrgency } from "@/types/case";

export type LatLng = { lat: number; lng: number };

export type MapMarker = {
  id: string;
  position: LatLng;
  status?: CaseStatus | string;
  urgency?: CaseUrgency | string;
  isEmergency?: boolean;
  needsReinforcement?: boolean;
  category?: string;
};
