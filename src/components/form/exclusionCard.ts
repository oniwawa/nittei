// 除外ルールのカード1枚（Figma の 入力画面 の「指定した日程を除外」の中の薄い緑の箱）

import type { ExclusionKind, ExclusionRule } from "../../types";
import { GREEN } from "../theme";
import { dateExclusionRow, weekdayExclusionRow } from "./exclusionRow";
import { selectBox } from "./selectBox";

const KIND_CHOICES: { value: ExclusionKind; label: string }[] = [
  { value: "date", label: "日付を指定して除外" },
  { value: "weekday", label: "曜日を指定して除外" },
];

/**
 * 薄い緑の箱に、上の行に種類のプルダウンと右端の × ボタン、下の行に選んだ種類の入力欄を並べる。
 * - index は state.exclusions の何番目か（data-index）。入力が変わったら main.ts がこの番号で state を書き換える
 * - プルダウン(data-key="kind")を変えると、main.ts が作り直して入力欄を切り替える
 * - × (data-action="remove") を押すと、このカードを消す
 */
export function exclusionCard(rule: ExclusionRule, index: number): string {
  const kinds = KIND_CHOICES.map(
    (c) => `<option value="${c.value}" ${c.value === rule.kind ? "selected" : ""}>${c.label}</option>`,
  ).join("");
  return `
    <div data-index="${index}" class="flex flex-col gap-4 rounded-[15px] bg-pale p-4 md:px-8 md:py-6">
      <div class="flex items-center justify-between gap-4">
        ${selectBox(GREEN, `data-key="kind" aria-label="除外のしかた"`, kinds, false)}
        <button type="button" data-action="remove" aria-label="この条件を削除" title="この条件を削除"
          class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-main transition-colors hover:bg-main hover:text-white">
          ×
        </button>
      </div>
      ${rule.kind === "date" ? dateExclusionRow(rule) : weekdayExclusionRow(rule)}
    </div>
  `;
}
