// 曜日ボタン（Figma の button_weekday*）

import { WEEKDAY_NAMES } from "../../choices";

/**
 * 曜日ボタンが選ばれたときの色。平日は紺、土曜は青緑、日曜は赤（Figma の field_weekdays）。
 * 土日は濃い色が用意されていないので、マウスを乗せたときは brightness で少し暗くする
 */
function weekdayPressedClass(weekday: number): string {
  if (weekday === 6) {
    return "aria-pressed:border-saturday aria-pressed:bg-saturday aria-pressed:hover:brightness-90";
  }
  if (weekday === 0) {
    return "aria-pressed:border-sunday aria-pressed:bg-sunday aria-pressed:hover:brightness-90";
  }
  return "aria-pressed:bg-sub2 aria-pressed:hover:border-blue-950 aria-pressed:hover:bg-blue-950";
}

/**
 * 曜日ボタン1つ（Figma の button_weekdayMonday など）。押すたびに main.ts で aria-pressed を切り替える。
 * 2カラム(lg以上)では日曜(0)だけ order-last で最後に回し、月〜金 / 土日 の2段にする（並べ方は layout.ts）
 */
export function buttonWeekday(weekday: number): string {
  return `
    <button type="button" data-weekday="${weekday}" aria-pressed="false"
      class="${weekday === 0 ? "lg:order-last" : ""} w-[76px] lg:w-auto cursor-pointer rounded-[5px] border-2 border-sub2 bg-white px-4 py-2 text-off shadow-button transition aria-[pressed=false]:hover:bg-frame2/30 aria-pressed:font-semibold aria-pressed:text-white ${weekdayPressedClass(weekday)}">
      ${WEEKDAY_NAMES[weekday]}
    </button>
  `;
}
