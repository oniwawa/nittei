// タイムラインのカレンダーの予定（Figma の timeline_event）

/**
 * タイムラインのカレンダーの予定（Figma の timeline_event）。クリックはできない。
 * 「他の予定あり」の一覧と同じ、薄い緑(pale)の地に緑(sub)の線と文字。pale は不透明な色なので、後ろの罫線は透けない
 */
export function timelineEvent(top: number, height: number): HTMLDivElement {
  const block = document.createElement("div");
  block.className =
    "pointer-events-none absolute inset-x-1 overflow-hidden rounded-[5px] border-l-4 border-sub bg-pale px-1 text-xs text-sub";
  block.style.top = `${top}px`;
  block.style.height = `${height}px`;
  block.textContent = "他の予定あり";
  return block;
}
