// 「カレンダーの予定あり（〇件）」ボタン（Figma の button_otherEvents）

/**
 * その日にカレンダーの予定があることを示すボタン（Figma の button_otherEvents）。クリックで予定の一覧を開け閉めする。
 * - 閉じているとき: 緑(sub)の枠と文字、下向きの矢印
 * - 開いているとき: 緑(sub)の塗りつぶしに白い文字、上向きの矢印
 * 矢印は style.css の icon-chevron-down（文字と同じ色で塗る）。
 * day は開いている日を覚えておくためのキー（main.ts の candidateList のクリックで使う）
 */
export function buttonOtherEvents(day: string, count: number, expanded: boolean, listId: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `flex cursor-pointer items-center gap-1 rounded-full border px-3 py-0.5 text-sm transition-colors ${
    expanded ? "border-white bg-sub font-medium text-white hover:bg-green-900" : "border-sub font-semibold text-sub hover:bg-pale"
  }`;
  button.dataset.toggleDay = day;
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-controls", listId);

  const label = document.createElement("span");
  label.textContent = `カレンダーの予定あり（${count}件）`;
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.className = `icon-chevron-down bg-current ${expanded ? "-scale-y-100" : ""}`;
  button.append(label, arrow);
  return button;
}
