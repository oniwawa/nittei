// 見出し付きの入力項目

import { LABEL, type Theme } from "../theme";

/** 見出し付きの入力項目（Figma の field_weekdays など） */
export function field(theme: Theme, label: string, body: string): string {
  return `
    <div class="flex flex-col gap-4">
      <h4 class="${LABEL} ${theme.text}">${label}</h4>
      ${body}
    </div>
  `;
}
