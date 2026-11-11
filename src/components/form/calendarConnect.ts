// Googleカレンダーとの連携ボタン（Figma の button_calendarDrop）

/**
 * 「Googleカレンダーと連携」ボタンと「解除する」ボタン（Figma の button_calendarDrop）。
 * 連携が済むと main.ts で data-connected が付き、薄い緑(base)の背景に緑の枠・文字になる。
 * 未連携のときも同じ色の枠を付けておき、切り替わってもボタンの大きさが変わらないようにする
 */
export function calendarConnect(): string {
  return `
    <div class="flex w-full flex-col items-center gap-2 lg:py-12">
      <button id="calendar-connect" type="button"
        class="w-full cursor-pointer rounded-[15px] border-2 border-sub bg-sub px-[59px] py-4 text-center font-semibold text-white shadow-button transition-colors hover:bg-green-900 disabled:cursor-wait disabled:opacity-70 data-connected:bg-pale data-connected:text-sub data-connected:hover:bg-frame/40">
        <span id="calendar-status">Googleカレンダーと連携</span>
      </button>
      <!-- 連携中だけ表示する（main.ts の renderCalendarStatus） -->
      <button id="calendar-disconnect" type="button" hidden
        class="my-2 cursor-pointer rounded-[15px] bg-sub px-10 py-2 font-semibold text-white shadow-button transition-colors hover:bg-green-900">
        解除する
      </button>
      <p class="text-sm text-sub">
        <b>カレンダー内の予定が入っている時間</b>を読み込みます（予定タイトルなどの情報は読み込みません）
      </p>
    </div>
  `;
}
