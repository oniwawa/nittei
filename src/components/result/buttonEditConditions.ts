// 「条件を編集」ボタン（Figma の button_action + 戻る矢印 Frame 44）

/**
 * 白い丸いボタンに戻る矢印（style.css の icon-undo）。押すと入力画面に戻る（main.ts）。
 * 上に固定した条件の帯と、出力画面のいちばん下の2か所に置くので、同じ見た目になるよう部品にしている。
 * 文字は 12px(text-xs)。置いた場所の文字の大きさに左右されないよう、ボタン自身に付けている。
 * align: 並べる向き。上の帯では左寄せ(start)、いちばん下では中央(center)
 */
export function buttonEditConditions(id: string, align: "start" | "center"): string {
  return `
    <button id="${id}" type="button"
      class="flex cursor-pointer items-center gap-2 ${align === "start" ? "self-start" : "self-center"} rounded-[30px] border-2 border-sub2 bg-white px-6 py-2 text-xs font-semibold text-sub2 shadow-button transition-colors hover:bg-pale2">
      <span aria-hidden="true" class="icon-undo bg-current"></span>
      条件を編集
    </button>
  `;
}
