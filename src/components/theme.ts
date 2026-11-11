// 部品どうしで共通の見た目（配色・文字の大きさ・入力欄の枠）。
// Tailwind はソース中の文字列からクラスを探すので、クラス名は省略せずに書く

/**
 * 配色。「私のスケジュール」は緑、「提案するスケジュール」以降は紺。
 * 同じ部品でも、置く場所によって GREEN / BLUE を渡して色を切り替える
 */
export interface Theme {
  /** 見出しの文字色 */
  text: string;
  /** 入力欄の枠の色 */
  field: string;
  /** パネルの枠の色 */
  frame: string;
  /** プルダウンの下向き矢印の色 */
  arrow: string;
  /** 入力欄にカーソルを乗せたときの背景（選べない disabled のときは変えない） */
  hover: string;
}

export const GREEN: Theme = {
  text: "text-sub",
  field: "border-main",
  frame: "border-frame",
  arrow: "bg-main",
  hover: "enabled:hover:bg-pale",
};

// 紺系には Figma に薄い色が無いので、パネルの枠の色(#AFC6F0)を30%の濃さにして使う
export const BLUE: Theme = {
  text: "text-sub2",
  field: "border-main2",
  frame: "border-frame2",
  arrow: "bg-main2",
  hover: "enabled:hover:bg-frame2/30",
};

/** 見出し（Figma の h）。text-2xl = 24px */
export const HEADING = "text-2xl font-semibold";
/** パネルの中の入力項目の見出し（曜日、提案する期間など）。text-xl = 20px */
export const LABEL = "text-xl font-semibold";

/** 入力欄。disabled のときは Figma の「not」色（灰色）になる */
// aria-invalid="true" が付くと（未入力で出力しようとしたとき）枠が赤くなる
const FIELD_BASE =
  "rounded-[5px] border-2 bg-white px-4 py-2 text-text transition-colors disabled:cursor-not-allowed disabled:border-off disabled:text-off aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/30";

/** 入力欄の見た目。カーソルを乗せると背景が薄い緑/紺になる */
export function fieldClass(theme: Theme): string {
  return `${FIELD_BASE} ${theme.field} ${theme.hover}`;
}
