// Googleカレンダーの代わりに「それっぽい予定」を返すモック。
// 後でここを本物のGoogle Calendar API呼び出しに差し替える。

import type { CalendarEvent } from "./types";

/** 今日から daysFromToday 日後の hour:minute を表す Date を作る */
function at(daysFromToday: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date;
}

// 本物のAPIは通信に時間がかかるので Promise を返す。
// モックの段階から同じ形にしておくと、差し替えが楽になる。
export function fetchEvents(): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [
    { id: "1", title: "ゼミ", start: at(1, 10), end: at(1, 12) },
    { id: "2", title: "A社 一次面接", start: at(1, 15), end: at(1, 16) },
    { id: "3", title: "アルバイト", start: at(2, 13), end: at(2, 18) },
    { id: "4", title: "B社 説明会", start: at(3, 11), end: at(3, 12, 30) },
    { id: "5", title: "授業", start: at(4, 10, 30), end: at(4, 12) },
    { id: "6", title: "C社 カジュアル面談", start: at(4, 16), end: at(4, 17) },
    { id: "7", title: "アルバイト", start: at(6, 10), end: at(6, 15) },
    { id: "8", title: "D社 ES締切対応", start: at(8, 14), end: at(8, 17) },
  ];
  return Promise.resolve(events);
}
