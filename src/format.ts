// 日付を「10/14(火)」「10:00」のような日本語表示に変換する関数たち。

import type { TimeSlot } from "./types";

// as const を付けると、中身が変更不可の「読み取り専用」配列になる
const WEEKDAYS = ["日", "月", "火", "水", "木", "金","土"] as const;

/** 10/14(火) */
export function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`;
}

/** 10:00 */
export function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** 10/14(火) 10:00〜11:00 */
export function formatSlot(slot: TimeSlot): string {
  return `${formatDate(slot.start)} ${formatTime(slot.start)}〜${formatTime(slot.end)}`;
}

/** 0:00 からの分（510） → <input type="time"> 用の "08:30" */
export function minutesToTime(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** <input type="time"> の "08:30" → 0:00 からの分（510） */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 出力文章の形式に当てはめる。{} が前から順に
 * 月、日、曜日、開始の時、開始の分、終了の時、終了の分 に置き換わる。
 * 例: "{}/{} ({}) {}時{}分～{}時{}分" → "11/11 (月) 9時00分～18時00分"
 */
export function formatWithTemplate(template: string, slot: TimeSlot): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const values = [
    slot.start.getMonth() + 1,
    slot.start.getDate(),
    WEEKDAYS[slot.start.getDay()],
    slot.start.getHours(),
    pad(slot.start.getMinutes()),
    slot.end.getHours(),
    pad(slot.end.getMinutes()),
  ].map(String);
  let i = 0;
  // 8個目以降の {} は当てはめる値が無いので空にする
  return template.replace(/\{\}/g, () => values[i++] ?? "");
}
