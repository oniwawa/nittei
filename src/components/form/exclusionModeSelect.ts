// 「指定した日程を除外」で、日付と曜日のどちらで除外するかを選ぶプルダウン

import type { ExclusionMode } from "../../types";
import { GREEN } from "../theme";
import { selectBox } from "./selectBox";

const EXCLUSION_MODE_CHOICES: { value: ExclusionMode; label: string }[] = [
  { value: "none", label: "除外しない" },
  { value: "date", label: "日付を指定して除外" },
  { value: "weekday", label: "曜日を指定して除外" },
];

/** 選ぶと、選んだほうの入力欄(exclusionGroup)だけが出てくる（main.ts の renderExclusionMode）。最初は「除外しない」 */
export function exclusionModeSelect(): string {
  const options = EXCLUSION_MODE_CHOICES.map(
    (c) => `<option value="${c.value}" ${c.value === "none" ? "selected" : ""}>${c.label}</option>`,
  ).join("");
  return `
    <div class="self-start">
      ${selectBox(GREEN, `id="exclusion-mode" aria-label="除外のしかた"`, options, false)}
    </div>
  `;
}
