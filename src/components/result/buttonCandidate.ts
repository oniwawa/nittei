// 一覧表示の候補の時間帯ボタン（Figma の button_candidate）

import type { TimeSlot } from "../../types";
import { slotLabel } from "./slotLabel";

/**
 * 一覧表示の候補の時間帯ボタン（Figma の button_candidate）。
 * index は state.result.slots の何番目か。押すと main.ts で aria-pressed を切り替え、紺に塗りつぶされる
 */
export function buttonCandidate(slot: TimeSlot, index: number, selected: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "cursor-pointer rounded-[5px] border-2 border-main2 bg-white px-4 py-2 shadow-button transition-colors aria-[pressed=false]:hover:bg-frame2/30 aria-pressed:border-sub2 aria-pressed:bg-sub2 aria-pressed:font-semibold aria-pressed:text-white aria-pressed:hover:border-blue-950 aria-pressed:hover:bg-blue-950";
  button.dataset.index = String(index);
  button.setAttribute("aria-pressed", String(selected));
  button.textContent = slotLabel(slot);
  return button;
}
