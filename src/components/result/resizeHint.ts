// タイムラインの候補をクリックしたときに出る吹き出し「上/下をドラッグして時間を調節できます」

// 下端のつまみをドラッグして候補を短くする前後の図（Figma の Frame 34 を書き出したもの）
import dragIllustration from "../../assets/Frame 34.svg";

/** 吹き出しの下端と候補ブロックの上端の間(px) */
const GAP = 8;

/**
 * 吹き出しを作り、候補ブロック(target)の少し上に出す。ブロックには重ならない。
 * タイムラインは横スクロールの箱の中にあり、中に入れると箱の外にはみ出した分が切れてしまう。
 * そのため吹き出しは body に入れ、ページの左上からの位置で置く（位置は出したときのブロックの場所で決める）。
 * - 薄い紺(pale2)の地に濃い紺(sub2)の文字。上に Frame 34 の図を置く
 * - pointer-events-none なので、吹き出しの下にある候補もそのままクリックできる
 * - role="status" で、画面読み上げソフトにも内容が読まれる
 */
export function resizeHint(target: HTMLElement): HTMLDivElement {
  const rect = target.getBoundingClientRect();

  const hint = document.createElement("div");
  hint.setAttribute("role", "status");
  // -translate-y-full で、吹き出しの下端を指定した位置(ブロックの上端 - GAP)にそろえる。
  // z-30 は、上に固定している条件のパネル(z-20)よりも手前に出すため
  hint.className =
    "pointer-events-none absolute z-30 flex w-max max-w-44 -translate-x-1/2 -translate-y-full flex-col items-center gap-1 rounded-[5px] bg-pale2 px-3 py-2 text-center text-xs font-semibold text-sub2 shadow-button transition-opacity duration-1000 motion-reduce:transition-none";
  // ↑ 消すときは main.ts で opacity-0 を付ける。transition-opacity で1秒かけて透明になる。
  //   「視差効果を減らす」設定の人には動きを付けず、すぐ消す(motion-reduce)

  // getBoundingClientRect は「いま見えている画面」からの位置なので、スクロールした分を足してページからの位置にする
  hint.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
  hint.style.top = `${rect.top - GAP + window.scrollY}px`;

  // 図は文字の説明と同じ内容なので、読み上げでは飛ばす(alt="")。元の大きさ 158×137 を幅80pxに縮める
  const illustration = document.createElement("img");
  illustration.src = dragIllustration;
  illustration.alt = "";
  illustration.className = "w-20";
  const text = document.createElement("span");
  text.textContent = "上/下をドラッグして時間を調節できます";

  // 候補ブロックを指す下向きの三角。四角を45度回して、半分だけ吹き出しの下にはみ出させる
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.className = "absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-pale2";

  hint.append(illustration, text, arrow);
  return hint;
}
