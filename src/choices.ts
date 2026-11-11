// 入力欄で選べる値の一覧。画面の部品（components/）と、値を読む main.ts の両方で使う

import type { Recurrence } from "./types";

export const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/** 時刻の「時」「分」で選べる値 */
export const HOUR_CHOICES = Array.from({ length: 24 }, (_, i) => i);
export const MINUTE_CHOICES = [0, 15, 30, 45];

/** 所要時間の「時間」で選べる値（0〜8時間）。「分」は MINUTE_CHOICES で15分刻み */
export const DURATION_HOUR_CHOICES = Array.from({ length: 9 }, (_, i) => i);

/** こだわり条件「予定の前後に◯時間の余裕」で選べる値（分）。0.5〜4時間を0.5時間刻み */
export const BUFFER_CHOICES = Array.from({ length: 8 }, (_, i) => (i + 1) * 30);

export const RECURRENCE_CHOICES: { value: Recurrence; label: string }[] = [
  { value: "weekly", label: "毎週" },
  { value: "biweeklyFromThisWeek", label: "隔週(今週〜)" },
  { value: "biweeklyFromNextWeek", label: "隔週(来週〜)" },
];
