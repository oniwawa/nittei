// タイムラインの候補をクリックしたときに出る吹き出し「端をドラッグして時間を調節できます」

/**
 * 吹き出しを作る。候補ブロックと同じ列(body)に入れ、ブロックのすぐ上に出す。
 * 上に入る余白が無いとき（その日のいちばん早い時刻の候補など）は、ブロックの下に出す。
 * 上にも下にも入らないとき（1日じゅう空いている候補など）は、ブロックに重ねて上の方に出す。
 * タイムラインは横スクロールの箱の中にあり、列からはみ出すと切れてしまうため
 * - top / height: 候補ブロックの位置と高さ(px)。列の上端からの距離
 * - columnHeight: 列(body)の高さ(px)
 * - pointer-events-none なので、吹き出しの下にある候補もそのままクリックできる
 * - role="status" で、画面読み上げソフトにも内容が読まれる
 */
export function resizeHint(top: number, height: number, columnHeight: number): HTMLDivElement {
  /** 吹き出しの高さのおおよそ(px)。2行になっても入るように、上に出すかどうかの判定に使う */
  const HINT_HEIGHT = 44;
  const GAP = 8;
  const fitsAbove = top >= HINT_HEIGHT + GAP;
  const fitsBelow = top + height + GAP + HINT_HEIGHT <= columnHeight;
  const place = fitsAbove ? "above" : fitsBelow ? "below" : "inside";

  const hint = document.createElement("div");
  hint.setAttribute("role", "status");
  hint.className =
    "pointer-events-none absolute left-1/2 z-20 w-max max-w-44 -translate-x-1/2 rounded-[5px] bg-sub2 px-3 py-2 text-center text-xs text-white shadow-button";
  if (place === "above") {
    // 下端をブロックの上端から GAP だけ離す
    hint.style.bottom = `calc(100% - ${top - GAP}px)`;
  } else if (place === "below") {
    hint.style.top = `${top + height + GAP}px`;
  } else {
    // 時刻の文字にかぶらないよう、ブロックの上端から少し下げる
    hint.style.top = `${top + 28}px`;
  }
  hint.textContent = "端をドラッグして時間を調節できます";

  // 候補ブロックを指す三角。四角を45度回して、半分だけ吹き出しからはみ出させる（重ねて出すときは付けない）
  if (place !== "inside") {
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.className = `absolute left-1/2 size-2 -translate-x-1/2 rotate-45 bg-sub2 ${place === "below" ? "-top-1" : "-bottom-1"}`;
    hint.append(arrow);
  }
  return hint;
}
