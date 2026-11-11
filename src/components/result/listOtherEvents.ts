// その日の予定の一覧（Figma の list_otherEvents）

import { formatTime } from "../../format";
import type { TimeSlot } from "../../types";

/**
 * その日の予定を「10:00〜12:00 予定あり」のように並べた一覧（Figma の list_otherEvents）。
 * 日をまたぐ予定はその日の分だけ表示する。Google からは予定の名前を受け取らないので、何の予定かは出さない
 */
export function listOtherEvents(events: TimeSlot[], date: Date, listId: string): HTMLUListElement {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const list = document.createElement("ul");
  list.id = listId;
  list.className = "flex flex-col gap-1 rounded-[5px] border-l-4 border-sub bg-pale px-4 py-2 text-sm text-sub";
  for (const event of [...events].sort((x, y) => x.start.getTime() - y.start.getTime())) {
    const allDay = event.start <= dayStart && event.end >= dayEnd;
    const start = event.start < dayStart ? "0:00" : formatTime(event.start);
    const end = event.end > dayEnd ? "24:00" : formatTime(event.end);
    const item = document.createElement("li");
    item.textContent = `${allDay ? "終日" : `${start}〜${end}`}　予定あり`;
    list.append(item);
  }
  return list;
}
