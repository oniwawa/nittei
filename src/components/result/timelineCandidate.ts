// タイムラインの候補ブロック（Figma の timeline_candidate）

import type { TimeSlot } from "../../types";
import { slotLabel } from "./slotLabel";

/**
 * タイムラインの候補ブロック（Figma の timeline_candidate）。紺の枠で、選ぶと紺に塗りつぶされる（buttonCandidate と同じ配色）。
 * 後ろの罫線が透けないよう、乗せたときの色は半透明の frame2/30 ではなく不透明な pale2 にしている。
 * 上端・下端のつまみをドラッグすると開始・終了の時刻を変えられる（main.ts の startResize）
 */
export function timelineCandidate(
  slot: TimeSlot,
  index: number,
  selected: boolean,
  top: number,
  height: number,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "absolute inset-x-1 cursor-pointer overflow-hidden rounded-[5px] border-2 border-main2 bg-white px-1 text-xs shadow-button transition-colors aria-[pressed=false]:hover:bg-pale2 aria-pressed:border-sub2 aria-pressed:bg-sub2 aria-pressed:font-semibold aria-pressed:text-white aria-pressed:hover:border-blue-950 aria-pressed:hover:bg-blue-950";
  button.style.top = `${top}px`;
  button.style.height = `${height}px`;
  button.dataset.index = String(index);
  button.setAttribute("aria-pressed", String(selected));
  button.textContent = slotLabel(slot);
  // 乗せると細い線が出て、つかめる場所だと分かるようにする
  for (const edge of ["start", "end"] as const) {
    const handle = document.createElement("span");
    handle.dataset.resize = edge;
    handle.setAttribute("aria-hidden", "true");
    handle.className = `group/handle absolute inset-x-0 h-2 cursor-ns-resize touch-none ${edge === "start" ? "top-0" : "bottom-0"}`;
    const grip = document.createElement("span");
    grip.className =
      "absolute top-1/2 left-1/2 h-1 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-0 transition-opacity group-hover/handle:opacity-60";
    handle.append(grip);
    button.append(handle);
  }
  return button;
}
