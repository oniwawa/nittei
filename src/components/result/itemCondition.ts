// 出力した条件の1項目（Figma の item_condition）

/**
 * 出力した条件の1項目（Figma の item_condition を 12px 用に縮めたもの）。
 * 項目名と内容を1組の div で包む（dl の中は div で区切ってよい）。
 * スマホは項目名の下に内容、md以上は横に並べて 8px 空ける。内容が複数あるときは改行して並べる
 */
export function itemCondition(label: string, values: string[]): HTMLDivElement {
  const item = document.createElement("div");
  item.className = "flex flex-col md:flex-row md:gap-2";
  const dt = document.createElement("dt");
  dt.className = "font-semibold text-sub2 md:w-[108px] md:shrink-0";
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.className = "whitespace-pre-line";
  dd.textContent = values.join("\n");
  item.append(dt, dd);
  return item;
}
