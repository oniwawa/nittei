// 除外ルールの入力1行分（Figma の row_dateExclusion / row_weekdayExclusion）。「＋ 条件を追加」のたびに main.ts から呼ばれる

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

/**
 * 行の右端の削除ボタン。行が1つしかないときは消せないようにし、
 * ボタンの代わりに同じ幅の空白を置いて行の位置がずれないようにする
 */
function removeButton(removable: boolean, disabled: boolean): string {
  if (!removable) return `<span class="size-8 shrink-0" aria-hidden="true"></span>`;
  return `
    <button type="button" data-action="remove" aria-label="この条件を削除" title="この条件を削除" ${disabled ? "disabled" : ""}
      class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-main transition-colors hover:bg-main hover:text-white disabled:pointer-events-none">
      ×
    </button>
  `;
}

/** 「日付を指定して除外」の入力1行分（Figma の row_dateExclusion。「＋ 条件を追加」で増える） */
export function dateExclusionRow(rule: DateExclusion, index: number, disabled: boolean, removable: boolean): string {
  const off = disabled ? "disabled" : "";
  return `
    <div data-index="${index}" class="flex flex-wrap items-center gap-4">
      <input data-key="date" type="date" value="${rule.date}" ${off} class="${fieldClass(GREEN)} w-[262px] cursor-pointer text-center" />
      <span>の</span>
      ${timeRange(GREEN, `data-key="startMinutes"`, `data-key="endMinutes"`, rule.startMinutes, rule.endMinutes, disabled, "text-sub")}
      ${removeButton(removable, disabled)}
    </div>
  `;
}

/** 「曜日を指定して除外」の入力1行分（Figma の row_weekdayExclusion。「＋ 条件を追加」で増える） */
export function weekdayExclusionRow(rule: WeekdayExclusion, index: number, disabled: boolean, removable: boolean): string {
  const off = disabled ? "disabled" : "";
  const recurrences = RECURRENCE_CHOICES.map(
    (c) => `<option value="${c.value}" ${c.value === rule.recurrence ? "selected" : ""}>${c.label}</option>`,
  ).join("");
  const weekdays = WEEKDAY_NAMES.map(
    (name, i) => `<option value="${i}" ${i === rule.weekday ? "selected" : ""}>${name}曜日</option>`,
  ).join("");
  return `
    <div data-index="${index}" class="flex flex-wrap items-center gap-4">
      <div class="flex items-center overflow-hidden rounded-[5px] border-2 border-main bg-white has-[:disabled]:border-off">
        ${bareSelect(`data-key="recurrence" ${off}`, recurrences, "border-r-[3px] border-dashed border-off")}
        ${bareSelect(`data-key="weekday" ${off}`, weekdays)}
      </div>
      <span>の</span>
      ${timeRange(GREEN, `data-key="startMinutes"`, `data-key="endMinutes"`, rule.startMinutes, rule.endMinutes, disabled)}
      ${removeButton(removable, disabled)}
    </div>
  `;
}
