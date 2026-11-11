// 下向き矢印付きのプルダウンと、その選択肢

import { fieldClass, type Theme } from "../theme";

/** 2桁の数字の <option> を並べる（8 → "08"） */
export function numberOptions(values: number[], selected: number): string {
  return values
    .map((v) => `<option value="${v}" ${v === selected ? "selected" : ""}>${String(v).padStart(2, "0")}</option>`)
    .join("");
}

/**
 * 右側に下向き矢印が付いたプルダウン（Figma の input_durationHours など）。
 * peer を付けた select が disabled になると、後ろの矢印も灰色になる
 */
export function selectBox(theme: Theme, attrs: string, optionsHtml: string, disabled: boolean): string {
  return `
    <span class="relative flex items-center">
      <select ${attrs} ${disabled ? "disabled" : ""} class="peer ${fieldClass(theme)} cursor-pointer appearance-none pr-8">
        ${optionsHtml}
      </select>
      <span aria-hidden="true" class="icon-select-down pointer-events-none absolute right-3 ${theme.arrow} peer-disabled:bg-off"></span>
    </span>
  `;
}
