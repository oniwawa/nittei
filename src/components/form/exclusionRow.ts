// 除外ルールの入力行（Figma の row_dateExclusion / row_weekdayExclusion）。exclusionCard の中に入る

import { RECURRENCE_CHOICES, WEEKDAY_NAMES } from "../../choices";
import type { DateExclusion, WeekdayExclusion } from "../../types";
import { fieldClass, GREEN } from "../theme";
import { timeRange } from "./timeRange";

/** 枠の無い、下向き矢印付きのセレクトボックス（枠は外側で付ける）。曜日の除外で2つ並べて1つの枠に入れる */
function bareSelect(attrs: string, choices: string, extraClass = ""): string {
  return `
    <label class="relative flex items-center ${extraClass}">
      <select ${attrs} class="peer w-full cursor-pointer appearance-none bg-transparent py-2 pr-8 pl-4 text-text transition-colors enabled:hover:bg-pale disabled:cursor-not-allowed disabled:text-off">
        ${choices}
      </select>
      <span aria-hidden="true" class="icon-select-down pointer-events-none absolute right-3 bg-main peer-disabled:bg-off"></span>
    </label>
  `;
}

/** 「日付を指定して除外」の入力行（日付 の 08:00 ~ 16:00） */
export function dateExclusionRow(rule: DateExclusion): string {
  return `
    <div class="flex flex-wrap items-center gap-4">
      <input data-key="date" type="date" value="${rule.date}" aria-label="除外する日付" class="${fieldClass(GREEN)} w-[262px] cursor-pointer text-center" />
      <span>の</span>
      ${timeRange(GREEN, `data-key="startMinutes"`, `data-key="endMinutes"`, rule.startMinutes, rule.endMinutes, false, "text-sub")}
    </div>
  `;
}

/** 「曜日を指定して除外」の入力行（毎週 月曜日 の 08:00 ~ 16:00） */
export function weekdayExclusionRow(rule: WeekdayExclusion): string {
  const recurrences = RECURRENCE_CHOICES.map(
    (c) => `<option value="${c.value}" ${c.value === rule.recurrence ? "selected" : ""}>${c.label}</option>`,
  ).join("");
  const weekdays = WEEKDAY_NAMES.map(
    (name, i) => `<option value="${i}" ${i === rule.weekday ? "selected" : ""}>${name}曜日</option>`,
  ).join("");
  return `
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center overflow-hidden rounded-[5px] border-2 border-main bg-white">
        ${bareSelect(`data-key="recurrence" aria-label="繰り返し"`, recurrences, "border-r-[3px] border-dashed border-off")}
        ${bareSelect(`data-key="weekday" aria-label="除外する曜日"`, weekdays)}
      </div>
      <span>の</span>
      ${timeRange(GREEN, `data-key="startMinutes"`, `data-key="endMinutes"`, rule.startMinutes, rule.endMinutes)}
    </div>
  `;
}
