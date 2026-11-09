// ページの骨組み(HTML)を TypeScript で組み立てる。
// 見た目は Figma「EasyMeet」の page_interviewScheduler に合わせている。

import type { DateExclusion, Recurrence, WeekdayExclusion } from "./types";

export const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/** 時刻の「時」「分」で選べる値 */
const HOUR_CHOICES = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_CHOICES = [0, 15, 30, 45];

/** 所要時間の「時間」で選べる値（0〜8時間）。「分」は MINUTE_CHOICES で15分刻み */
const DURATION_HOUR_CHOICES = Array.from({ length: 9 }, (_, i) => i);

export const RECURRENCE_CHOICES: { value: Recurrence; label: string }[] = [
  { value: "weekly", label: "毎週" },
  { value: "biweeklyFromThisWeek", label: "隔週(今週〜)" },
  { value: "biweeklyFromNextWeek", label: "隔週(来週〜)" },
];


// ---------- 共通の見た目 ----------

/**
 * 配色。「いまのスケジュール」は緑、「今から入れる面談」以降は紺。
 * Tailwind はソース中の文字列からクラスを探すので、クラス名は省略せずに書く
 */
interface Theme {
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

const GREEN: Theme = {
  text: "text-sub",
  field: "border-main",
  frame: "border-frame",
  arrow: "bg-main",
  hover: "enabled:hover:bg-pale",
};
// 紺系には Figma に薄い色が無いので、パネルの枠の色(#AFC6F0)を30%の濃さにして使う
const BLUE: Theme = {
  text: "text-sub2",
  field: "border-main2",
  frame: "border-frame2",
  arrow: "bg-main2",
  hover: "enabled:hover:bg-frame2/30",
};

const HEADING = "text-2xl font-semibold";
/** 画面全体の外枠（入力画面と日程確定後の画面で共通） */
const PAGE =
  "mx-auto flex w-full max-w-[1075px] flex-col items-center gap-[52px] px-4 pt-16 pb-24 text-base md:pt-[168px] md:pb-[244px]";
/** 入力欄。disabled のときは Figma の「not」色（灰色）になる */
// aria-invalid="true" が付くと（未入力で出力しようとしたとき）枠が赤くなる
const FIELD_BASE =
  "rounded-[5px] border-2 bg-white px-4 py-2 text-text transition-colors disabled:cursor-not-allowed disabled:border-off disabled:text-off aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/30";

/** 入力欄の見た目。カーソルを乗せると背景が薄い緑/紺になる */
function fieldClass(theme: Theme): string {
  return `${FIELD_BASE} ${theme.field} ${theme.hover}`;
}

/** 2桁の数字の <option> を並べる（8 → "08"） */
function numberOptions(values: number[], selected: number): string {
  return values
    .map((v) => `<option value="${v}" ${v === selected ? "selected" : ""}>${String(v).padStart(2, "0")}</option>`)
    .join("");
}

/**
 * 右側に下向き矢印が付いたプルダウン。
 * peer を付けた select が disabled になると、後ろの矢印も灰色になる
 */
function upDownSelect(theme: Theme, attrs: string, optionsHtml: string, disabled: boolean): string {
  return `
    <span class="relative flex items-center">
      <select ${attrs} ${disabled ? "disabled" : ""} class="peer ${fieldClass(theme)} cursor-pointer appearance-none pr-8">
        ${optionsHtml}
      </select>
      <span aria-hidden="true" class="icon-select-down pointer-events-none absolute right-3 ${theme.arrow} peer-disabled:bg-off"></span>
    </span>
  `;
}

/**
 * 時刻の選択。「時」「分」のプルダウン2つでできている。値は timePicker.ts の readTime で読む。
 * 開始(start)の data-minutes は「変更前の開始時刻」で、終了時刻を一緒にずらすときに使う
 */
function timeSelect(theme: Theme, attrs: string, minutes: number, role: "start" | "end", disabled: boolean): string {
  const label = role === "start" ? "開始" : "終了";
  const roleAttrs = role === "start" ? `data-time-start data-minutes="${minutes}"` : "data-time-end";
  return `
    <span ${attrs} ${roleAttrs} class="flex items-center gap-1">
      ${upDownSelect(theme, `data-part="hour" aria-label="${label}の時"`, numberOptions(HOUR_CHOICES, Math.floor(minutes / 60)), disabled)}
      <span>:</span>
      ${upDownSelect(theme, `data-part="minute" aria-label="${label}の分"`, numberOptions(MINUTE_CHOICES, minutes % 60), disabled)}
    </span>
  `;
}

/** 色付きの枠で囲んだパネル（見出し＋説明＋中身） */
function panel(theme: Theme, title: string, description: string, body: string): string {
  return `
    <section class="flex flex-col gap-8 rounded-[15px] border-2 ${theme.frame} bg-white p-4">
      <div class="flex flex-col gap-2">
        <h3 class="${HEADING} ${theme.text}">${title}</h3>
        <p>${description}</p>
      </div>
      ${body}
    </section>
  `;
}

/** 見出し付きの入力項目（曜日、時刻の範囲など） */
function field(theme: Theme, label: string, body: string): string {
  return `
    <div class="flex flex-col gap-4">
      <h4 class="font-semibold ${theme.text}">${label}</h4>
      ${body}
    </div>
  `;
}

/**
 * 「08:00 ~ 16:00」の入力欄。startAttrs / endAttrs はそれぞれの時刻の選択に付ける属性（id や data-key）。
 * data-time-range で囲むと、開始と終了が組として連動する
 */
function timeRange(
  theme: Theme,
  startAttrs: string,
  endAttrs: string,
  start: number,
  end: number,
  disabled = false,
  tildeClass = "",
): string {
  return `
    <div data-time-range class="flex flex-wrap items-center gap-2">
      ${timeSelect(theme, startAttrs, start, "start", disabled)}
      <span class="${tildeClass}">~</span>
      ${timeSelect(theme, endAttrs, end, "end", disabled)}
    </div>
  `;
}

/**
 * チェックボックス付きの除外ルール1行。チェックが入ると背景が薄緑になる。
 * data-exclusion-row があると、行の余白をクリックしてもチェックが切り替わる（main.ts）
 */
function exclusionRow(toggleId: string, label: string, checked: boolean, details: string): string {
  return `
    <div data-exclusion-row class="flex cursor-pointer flex-col gap-4 rounded-[15px] px-8 py-6 lg:flex-row lg:items-start lg:justify-between has-[.checkbox:checked]:bg-pale hover:bg-pale">
      <label class="flex cursor-pointer items-center gap-4">
        <input id="${toggleId}" type="checkbox" class="checkbox peer" ${checked ? "checked" : ""} />
        <span class="whitespace-nowrap peer-checked:font-semibold">${label}</span>
      </label>
      ${details}
    </div>
  `;
}

/** 下向き矢印付きのセレクトボックス（枠は外側で付ける）。attrs は select に付ける属性 */
function dropdown(attrs: string, choices: string, extraClass = ""): string {
  return `
    <label class="relative flex items-center ${extraClass}">
      <select ${attrs} class="peer w-full cursor-pointer appearance-none bg-transparent py-2 pr-8 pl-4 text-text transition-colors enabled:hover:bg-pale disabled:cursor-not-allowed disabled:text-off">
        ${choices}
      </select>
      <span aria-hidden="true" class="icon-select-down pointer-events-none absolute right-3 bg-main peer-disabled:bg-off"></span>
    </label>
  `;
}

/** 除外ルールの入力行を並べる場所と「＋ 条件を追加」ボタン */
function exclusionList(listId: string, addButtonId: string): string {
  return `
    <div class="flex flex-col items-center gap-4">
      <div id="${listId}" class="flex flex-col gap-4"></div>
      <button id="${addButtonId}" type="button" class="cursor-pointer rounded-[15px] bg-main transition-colors hover:bg-main px-[49px] py-2 text-white shadow-button disabled:cursor-not-allowed disabled:bg-off">
        ＋ 条件を追加
      </button>
    </div>
  `;
}

// ---------- 動的に増える部品 ----------

/**
 * 行の右端の削除ボタン。行が1つしかないときは消せないようにし、
 * ボタンの代わりに同じ幅の空白を置いて行の位置がずれないようにする
 */
function removeButton(removable: boolean, disabled: boolean): string {
  if (!removable) return `<span class="size-8 shrink-0" aria-hidden="true"></span>`;
  return `
    <button type="button" data-action="remove" aria-label="この条件を削除" title="この条件を削除" ${disabled ? "disabled" : ""}
      class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-main transition-colors hover:bg-main hover:text-white disabled:pointer-events-none">
      ×
    </button>
  `;
}

/** 「日付を指定して除外」の入力1行分（「＋ 条件を追加」で増える） */
export function dateExclusionRow(rule: DateExclusion, index: number, disabled: boolean, removable: boolean): string {
  const off = disabled ? "disabled" : "";
  return `
    <div data-index="${index}" class="flex flex-wrap items-center gap-4">
      <input data-key="date" type="date" value="${rule.date}" ${off} class="${fieldClass(GREEN)} w-[262px] cursor-pointer text-center" />
      <span>の</span>
      ${timeRange(GREEN, `data-key="startMinutes"`, `data-key="endMinutes"`, rule.startMinutes, rule.endMinutes, disabled, "text-sub")}
      ${removeButton(removable, disabled)}
    </div>
  `;
}

/** 「曜日を指定して除外」の入力1行分（「＋ 条件を追加」で増える） */
export function weekdayExclusionRow(rule: WeekdayExclusion, index: number, disabled: boolean, removable: boolean): string {
  const off = disabled ? "disabled" : "";
  const recurrences = RECURRENCE_CHOICES.map(
    (c) => `<option value="${c.value}" ${c.value === rule.recurrence ? "selected" : ""}>${c.label}</option>`,
  ).join("");
  const weekdays = WEEKDAY_NAMES.map(
    (name, i) => `<option value="${i}" ${i === rule.weekday ? "selected" : ""}>${name}曜日</option>`,
  ).join("");
  return `
    <div data-index="${index}" class="flex flex-wrap items-center gap-4">
      <div class="flex items-center overflow-hidden rounded-[5px] border-2 border-main bg-white has-[:disabled]:border-off">
        ${dropdown(`data-key="recurrence" ${off}`, recurrences, "border-r-[3px] border-dashed border-off")}
        ${dropdown(`data-key="weekday" ${off}`, weekdays)}
      </div>
      <span>の</span>
      ${timeRange(GREEN, `data-key="startMinutes"`, `data-key="endMinutes"`, rule.startMinutes, rule.endMinutes, disabled)}
      ${removeButton(removable, disabled)}
    </div>
  `;
}

// ---------- 日程確定後の画面（Figma のラフ案「出力タブ」の構成） ----------

/** 候補の時間帯ボタン。main.ts で aria-pressed を切り替えて選択中の見た目にする */
export const CANDIDATE_BUTTON =
  "cursor-pointer rounded-[5px] border-2 border-main2 bg-white px-4 py-2 shadow-button transition-colors aria-[pressed=false]:hover:bg-frame2/30 aria-pressed:border-sub2 aria-pressed:bg-sub2 aria-pressed:font-semibold aria-pressed:text-white aria-pressed:hover:border-blue-950 aria-pressed:hover:bg-blue-950";

/** 候補日の表示方法を切り替えるタブ。選ばれているタブは紺の下線と文字になる */
function resultTab(view: "buttons" | "timeline", label: string, panelId: string, selected: boolean): string {
  return `
    <button type="button" role="tab" id="tab-${view}" data-view="${view}" aria-controls="${panelId}"
      aria-selected="${selected}" tabindex="${selected ? 0 : -1}"
      class="-mb-0.5 cursor-pointer rounded-t-[5px] border-b-4 border-transparent px-6 py-2 text-hint transition-colors hover:bg-frame2/30 aria-selected:border-sub2 aria-selected:font-semibold aria-selected:text-sub2">
      ${label}
    </button>
  `;
}

/**
 * タイムラインの候補ブロック。紺の枠で、選ぶと紺に塗りつぶされる（CANDIDATE_BUTTON と同じ配色）。
 * 後ろの罫線が透けないよう、乗せたときの色は半透明の frame2/30 ではなく不透明な pale2 にしている。
 * 位置と高さは main.ts で style に入れる
 */
export const TIMELINE_CANDIDATE =
  "absolute inset-x-1 cursor-pointer overflow-hidden rounded-[5px] border-2 border-main2 bg-white px-1 text-xs shadow-button transition-colors aria-[pressed=false]:hover:bg-pale2 aria-pressed:border-sub2 aria-pressed:bg-sub2 aria-pressed:font-semibold aria-pressed:text-white aria-pressed:hover:border-blue-950 aria-pressed:hover:bg-blue-950";

/**
 * タイムラインのカレンダーの予定。「他の予定あり」の一覧と同じ薄い黄色。
 * 後ろの罫線が透けないよう、半透明の accent/10 ではなく不透明な accent-pale にしている
 */
export const TIMELINE_EVENT =
  "pointer-events-none absolute inset-x-1 overflow-hidden rounded-[5px] border-l-4 border-accent bg-accent-pale px-1 text-xs text-text";

/** 「面接日程を出力」を押した後に表示する画面。最初は hidden で隠しておく */
function resultView(): string {
  return `
    <main id="result-view" hidden class="${PAGE}">
      <section class="flex w-full flex-col gap-8">
        <h2 class="${HEADING} text-sub2">面接日程の候補</h2>

        ${panel(
          BLUE,
          "候補日",
          `企業に提示したい日時をクリックして選んでください<br />
          <span id="result-summary" class="text-main2"></span>`,
          `<div class="flex flex-col gap-6">
            <!-- 表示方法の切り替え。選んだ候補は両方で共通（main.ts の showCandidateView） -->
            <div role="tablist" aria-label="候補日の表示方法" class="flex gap-2 border-b-2 border-frame2">
              ${resultTab("buttons", "ボタン", "candidate-list", false)}
              ${resultTab("timeline", "タイムライン", "candidate-timeline", true)}
            </div>
            <div id="candidate-list" role="tabpanel" aria-labelledby="tab-buttons" hidden class="flex flex-col gap-6 px-0 md:px-8"></div>
            <!-- 横に日付、縦に時刻のタイムライン。日数が多いときは横にスクロールする -->
            <div id="candidate-timeline" role="tabpanel" aria-labelledby="tab-timeline" class="overflow-x-auto"></div>
          </div>`,
        )}

        ${panel(
          BLUE,
          "出力文",
          "選んだ候補日が「出力文章の形式」で並びます。コピーする前に書き換えることもできます",
          `<textarea id="result-message" rows="8" spellcheck="false" aria-label="出力文"
            class="${fieldClass(BLUE)} w-full resize-y leading-relaxed"></textarea>`,
        )}

        <div class="flex w-full flex-col items-center gap-2">
          <button id="copy-button" type="button"
            class="w-full cursor-pointer rounded-[15px] bg-sub2 px-[59px] py-4 font-semibold text-white shadow-button transition-colors hover:bg-blue-950">
            文章をコピー
          </button>
          <span id="copy-status" role="status" class="text-main2"></span>
        </div>
      </section>

      <section class="flex w-full flex-col gap-8">
        <h2 class="${HEADING} text-sub2">以下の条件で出力</h2>
        <section class="rounded-[15px] border-2 border-frame2 bg-white p-4 md:px-8">
          <!-- 中身は main.ts の renderConditionSummary が作る -->
          <dl id="condition-summary" class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-[max-content_1fr]"></dl>
        </section>
        <button id="back-button" type="button"
          class="h-[85px] w-full cursor-pointer rounded-[15px] border-2 border-sub2 bg-white px-[59px] py-4 font-semibold text-sub2 shadow-button transition-colors hover:bg-frame2/30">
          条件を編集
        </button>
      </section>
    </main>
  `;
}

// ---------- ページ全体 ----------

/** 全ページ共通の上の帯。アプリ名と一言の説明（Google の審査でも、トップページにアプリの説明が求められる） */
function siteHeader(): string {
  return `
    <header class="border-b-2 border-frame2 bg-white">
      <div class="mx-auto flex max-w-[1075px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4">
        <h1 class="text-2xl font-semibold text-sub2">にっていじ</h1>
        <p class="text-sm">就活の面接日程を、カレンダーの空き時間からかんたんに提案</p>
      </div>
    </header>
  `;
}

/** 全ページ共通の下の帯。Google のデータの扱いの説明と、ポリシーへのリンク（審査で必要） */
function siteFooter(): string {
  return `
    <footer class="border-t-2 border-frame2 bg-white">
      <div class="mx-auto flex max-w-[1075px] flex-col gap-3 px-4 py-6 text-sm">
        <p>
          にっていじは、Googleカレンダーの「予定が入っている時間帯」だけを読み込み、面接日程の候補を作るアプリです。
          予定の名前・場所・参加者などは読み込まず、読み込んだ情報はブラウザの中だけで使い、保存しません。
        </p>
        <nav class="flex flex-wrap gap-6">
          <a href="/privacy.html" class="text-sub2 underline hover:text-blue-950">プライバシーポリシー</a>
          <a href="/terms.html" class="text-sub2 underline hover:text-blue-950">利用規約</a>
        </nav>
        <p class="text-hint">© 2026 にっていじ</p>
      </div>
    </footer>
  `;
}

export function renderLayout(root: HTMLElement): void {
  root.innerHTML = `
    ${siteHeader()}

    <main id="form-view" class="${PAGE}">

      <section class="flex w-full flex-col gap-8">
        <h2 class="${HEADING} text-sub">今のスケジュール</h2>

        <div class="flex w-full flex-col items-center gap-2">
          <button id="calendar-connect" type="button"
            class="w-full cursor-pointer rounded-[15px] bg-sub px-[59px] py-4 text-center font-semibold text-white shadow-button transition-colors hover:bg-green-900 disabled:cursor-wait disabled:opacity-70">
            <span id="calendar-status">Googleカレンダーと連携</span>
          </button>
          <p class="text-sm">
            予定の名前や場所は読み込まず、予定が入っている時間帯だけを使います
            <button id="calendar-disconnect" type="button" hidden class="ml-2 cursor-pointer text-sub underline">連携を解除</button>
          </p>
        </div>

        ${panel(
          GREEN,
          "指定した日程を除外",
          "カレンダーの予定に加えて予定が入りそうな曜日や日にちを候補から除くことができます",
          `<div class="flex flex-col gap-4 ">
            ${exclusionRow(
              "date-exclusion-toggle",
              "日付を指定して除外",
              false,
              exclusionList("date-exclusion-list", "add-date-exclusion"),
            )}
            ${exclusionRow(
              "weekday-exclusion-toggle",
              "曜日を指定して除外",
              false,
              exclusionList("weekday-exclusion-list", "add-weekday-exclusion"),
            )}
          </div>`,
        )}
      </section>

      <section class="flex w-full flex-col gap-8">
        <h2 class="${HEADING} text-sub2">今から入れる面談</h2>

        ${panel(
          BLUE,
          "日程の条件",
          "これから提示する日程の条件を入力します",
          `<div class="flex flex-col gap-8 px-0 md:px-8">
            ${field(
              BLUE,
              "曜日",
              `<div class="flex flex-wrap gap-4">
                ${WEEKDAY_NAMES.map(
                  (name, i) => `
                  <button type="button" data-weekday="${i}" aria-pressed="false"
                    class="w-[76px] cursor-pointer rounded-[5px] border-2 border-sub2 bg-white px-4 py-2 text-off shadow-button transition-colors aria-[pressed=false]:hover:bg-frame2/30 aria-pressed:bg-sub2 aria-pressed:font-semibold aria-pressed:text-white aria-pressed:hover:border-blue-950 aria-pressed:hover:bg-blue-950">
                    ${name}
                  </button>`,
                ).join("")}
              </div>`,
            )}
            ${field(BLUE, "時刻の範囲", timeRange(BLUE, `id="day-start"`, `id="day-end"`, 8 * 60, 16 * 60))}
            ${field(
              BLUE,
              "所要時間",
              `<div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  ${upDownSelect(
                    BLUE,
                    `id="duration-hours"`,
                    DURATION_HOUR_CHOICES.map((h) => `<option value="${h}" ${h === 1 ? "selected" : ""}>${h}</option>`).join(""),
                    false,
                  )}
                  時間
                </label>
                <label class="flex items-center gap-2">
                  ${upDownSelect(BLUE, `id="duration-minutes"`, numberOptions(MINUTE_CHOICES, 0), false)}
                  分
                </label>
              </div>`,
            )}
            ${field(
              BLUE,
              "提案する期間",
              `<div class="flex flex-col gap-4">
                <!-- 期間を指定する: 開始日から〇週間。選ばれていないときは入力欄を灰色にする（main.ts の renderPeriod） -->
                <div class="flex flex-wrap items-center gap-4">
                  <input id="period-range" type="radio" name="period" value="range" checked aria-label="期間を指定する" class="radio" />
                  <input id="period-start" type="date" aria-label="開始日" class="${fieldClass(BLUE)} w-[262px] cursor-pointer text-center" />
                  <label class="flex items-center gap-2">
                    から
                    <input id="period-weeks" type="number" min="1" max="8" value="1" aria-label="週間" class="${fieldClass(BLUE)} w-[72px] text-right" />
                    週間
                  </label>
                </div>
                <label class="flex cursor-pointer items-center gap-4">
                  <input id="period-none" type="radio" name="period" value="none" class="radio peer" />
                  <span class="text-hint peer-checked:text-text">期間を指定しない</span>
                </label>
              </div>`,
            )}
          </div>`,
        )}
      </section>

      <section class="w-full">
        ${panel(
          BLUE,
          "出力文章の形式",
          `{}が入力された箇所に月、日付、曜日、時間、分の順番で出力されます<br />
          <span class="text-main2">例：{}/{} ({}) {}時{}分～{}時{}分　→　11/11(月)  9時00分～18時00分</span>`,
          `<div class="flex flex-col gap-4">
            <h4 class="font-semibold text-sub2">出力文章の形式を入力</h4>
            <!-- {} だけ色を変えるため、透明な文字の textarea の下に色付きの同じ文字を重ねている -->
            <div class="relative rounded-[5px] transition-colors hover:bg-frame2/30">
              <div id="template-highlight" aria-hidden="true"
                class="pointer-events-none absolute inset-0 overflow-hidden border-2 border-transparent px-4 py-2 break-words whitespace-pre-wrap"></div>
              <textarea id="output-template" spellcheck="false"
                class="relative block h-[103px] w-full resize-none rounded-[5px] border-2 border-main2 bg-transparent px-4 py-2 text-transparent caret-text">{}/{} ({}) {}時{}分～{}時{}分</textarea>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            <h4 class="font-semibold text-sub2">出力デモ</h4>
            <p id="output-demo" class="whitespace-pre-wrap"></p>
          </div>`,
        )}
      </section>

      <button id="export-button" type="button"
        class="h-[85px] w-full cursor-pointer rounded-[15px] bg-sub2 px-[59px] py-4 font-semibold text-white shadow-button transition-colors hover:bg-blue-950">
        面接日程を出力
      </button>
    </main>

    ${resultView()}

    ${siteFooter()}

    <!-- 画面上部に数秒だけ出る通知（main.ts の showToast） -->
    <div id="toast" role="alert" hidden
      class="fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-[15px] bg-error px-6 py-3 font-semibold text-white shadow-button"></div>
  `;
}
