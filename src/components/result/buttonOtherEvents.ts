// 「カレンダーの予定あり（〇件）」ボタン（Figma の button_otherEvents）

/**
 * その日にカレンダーの予定があることを示すボタン（Figma の button_otherEvents）。クリックで予定の一覧を開け閉めする。
 * day は開いている日を覚えておくためのキー（main.ts の candidateList のクリックで使う）
 */
export function buttonOtherEvents(day: string, count: number, expanded: boolean, listId: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "cursor-pointer rounded-full border border-sub px-3 py-0.5 text-sm font-semibold text-sub transition-colors hover:bg-pale";
  button.dataset.toggleDay = day;
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-controls", listId);
  button.textContent = `カレンダーの予定あり（${count}件）${expanded ? " ▲" : " ▼"}`;
  return button;
}
