// 「ランダムで [3] 件選択」ボタン（Figma の 出力画面 の Frame 37）。
// 自分で日程を選ぶのもめんどうな人向けに、指定した件数の候補をランダムに選ぶ

/**
 * 薄い紺(frame2)の丸いボタンの中に、件数の入力欄を入れる。右寄せで置く。
 * 候補日パネルとコピペ用文章パネルの2か所に置くので、id ではなく data-random-select / data-random-count で見分ける。
 * button の中に input は入れられないので、外側は div にして、main.ts でクリックを受け取る。
 * - 入力欄以外のところをクリックすると、その件数だけランダムに選ぶ（入力欄のクリックは数字を変えるだけ）
 * - 入力欄で Enter を押しても選ぶ（キーボードだけでも使えるように）
 * - 2か所の件数は main.ts でそろえる（片方を変えると、もう片方も同じ数字になる）
 * 件数の上限(max)と最初の値は、候補の数に合わせて main.ts の renderRandomSelect が入れる
 *
 * 押したときは 2px 下に沈み、影が消える（押し込んだように見せる）。
 * - マウス・タッチ: :active（押している間）。ただし入力欄を押しているときは沈ませない(has-[input:active])
 * - Enter キー: :active にならないので、main.ts が data-pressed を少しの間だけ付ける
 * - 「視差効果を減らす」設定の人には動きを付けない(motion-reduce)
 */
export function randomSelect(): string {
  return `
    <div data-random-select role="group" aria-label="ランダムで選ぶ"
      class="flex cursor-pointer items-center gap-1 self-end rounded-[30px] bg-frame2 px-8 py-2 font-semibold text-deep2 shadow-button transition duration-100 hover:brightness-95 active:translate-y-0.5 active:shadow-none has-[input:active]:translate-y-0 has-[input:active]:shadow-button data-pressed:translate-y-0.5 data-pressed:shadow-none motion-reduce:transform-none md:px-[59px]">
      <!-- 続けて押したときに文字が選択されて青くならないよう、文字だけ select-none（入力欄は選べるまま） -->
      <span class="select-none">ランダムで</span>
      <input data-random-count type="number" min="1" value="3" inputmode="numeric" aria-label="ランダムで選ぶ件数（Enter で選ぶ）"
        class="w-12 cursor-text rounded-[5px] border-2 border-sub2 bg-white px-2 py-1 text-center font-normal text-text" />
      <span class="select-none">件選択</span>
    </div>
  `;
}
