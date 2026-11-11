// 「08:00 ~ 16:00」の時刻の範囲の入力欄

import { HOUR_CHOICES, MINUTE_CHOICES } from "../../choices";
import type { Theme } from "../theme";
import { numberOptions, selectBox } from "./selectBox";

/**
 * 時刻の選択。「時」「分」のプルダウン2つでできている。値は timePicker.ts の readTime で読む。
 * 開始(start)の data-minutes は「変更前の開始時刻」で、終了時刻を一緒にずらすときに使う
 */
function timeSelect(theme: Theme, attrs: string, minutes: number, role: "start" | "end", disabled: boolean): string {
  const label = role === "start" ? "開始" : "終了";
  const roleAttrs = role === "start" ? `data-time-start data-minutes="${minutes}"` : "data-time-end";
  return `
    <span ${attrs} ${roleAttrs} class="flex items-center gap-1">
      ${selectBox(theme, `data-part="hour" aria-label="${label}の時"`, numberOptions(HOUR_CHOICES, Math.floor(minutes / 60)), disabled)}
      <span>:</span>
      ${selectBox(theme, `data-part="minute" aria-label="${label}の分"`, numberOptions(MINUTE_CHOICES, minutes % 60), disabled)}
    </span>
  `;
}

/**
 * 「08:00 ~ 16:00」の入力欄。startAttrs / endAttrs はそれぞれの時刻の選択に付ける属性（id や data-key）。
 * data-time-range で囲むと、開始と終了が組として連動する
 */
export function timeRange(
  theme: Theme,
  startAttrs: string,
  endAttrs: string,
  start: number,
  end: number,
  disabled = false,
  tildeClass = "",
): string {
  return `
    <div data-time-range class="flex flex-wrap items-center gap-2">
      ${timeSelect(theme, startAttrs, start, "start", disabled)}
      <span class="${tildeClass}">~</span>
      ${timeSelect(theme, endAttrs, end, "end", disabled)}
    </div>
  `;
}
