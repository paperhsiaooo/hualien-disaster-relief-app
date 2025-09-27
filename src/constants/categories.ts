export const CATEGORY_OPTIONS = [
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

export type CategoryValue = (typeof CATEGORY_OPTIONS)[number];

export const CATEGORY_EMOJI: Record<CategoryValue, string> = {
  其他災情: "⚠️",
  環境污染: "💧",
  基礎設施: "🪵",
  淹水災情: "🌊",
  路樹災情: "🌳",
  橋樑災情: "🌉",
  土石災情: "🗿",
  廣告招牌災情: "🪧",
  道路災情: "🛣️",
};

export const CATEGORY_COLORS: Record<CategoryValue, string> = {
  其他災情: "#f59e0b",
  環境污染: "#0ea5e9",
  基礎設施: "#a16207",
  淹水災情: "#2563eb",
  路樹災情: "#16a34a",
  橋樑災情: "#7c3aed",
  土石災情: "#92400e",
  廣告招牌災情: "#f97316",
  道路災情: "#525252",
};

export function formatCategoryLabel(value: CategoryValue) {
  const emoji = CATEGORY_EMOJI[value] ?? "";
  return `${emoji} ${value}`;
}
