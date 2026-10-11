// ページの骨組み(HTML)を TypeScript で組み立てる。
// 見た目は Figma「EasyMeet」の page_interviewScheduler に合わせている。

import dropdownIcon from "./assets/icon-dropdown.svg";
import { minutesToTime } from "./format";
import type { DateExclusion, Recurrence, WeekdayExclusion } from "./types";

/** <select> の選択肢1つ分 */
interface Choice {
  value: number;
  label: string;
}

const DAYS_AHEAD_CHOICES: Choice[] = [
  { value: 7, label: "今後1週間" },
  { value: 14, label: "今後2週間" },
];

const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const RECURRENCE_CHOICES: { value: Recurrence; label: string }[] = [
  { value: "weekly", label: "毎週" },
  { value: "biweeklyFromThisWeek", label: "隔週(今週〜)" },
  { value: "biweeklyFromNextWeek", label: "隔週(来週〜)" },
];

/** 選択肢の配列から <option> タグの文字列を作る */
function options(choices: Choice[], selected: number): string {
  return choices
    .map((c) => `<option value="${c.value}" ${c.value === selected ? "selected" : ""}>${c.label}</option>`)
    .join("");
}

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
}

const GREEN: Theme = { text: "text-sub", field: "border-main", frame: "border-frame" };
const BLUE: Theme = { text: "text-sub2", field: "border-main2", frame: "border-frame2" };

const HEADING = "text-2xl font-semibold";
/** 入力欄。disabled のときは Figma の「not」色（灰色）になる */
const FIELD_BASE =
  "rounded-[5px] border-2 bg-white px-4 py-2 text-text disabled:cursor-not-allowed disabled:border-off disabled:text-off";

function fieldClass(theme: Theme): string {
  return `${FIELD_BASE} ${theme.field}`;
}

function timeFieldClass(theme: Theme): string {
  return `${fieldClass(theme)} w-[120px]`;
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

/** 「08:00 ~ 16:00」の入力欄 */
function timeRange(theme: Theme, startId: string, endId: string, start: string, end: string): string {
  return `
    <div class="flex items-center gap-2">
      <input id="${startId}" type="time" step="300" value="${start}" class="${timeFieldClass(theme)}" />
      <span>~</span>
      <input id="${endId}" type="time" step="300" value="${end}" class="${timeFieldClass(theme)}" />
    </div>
  `;
}

/** チェックボックス付きの除外ルール1行。チェックが入ると背景が薄緑になる */
function exclusionRow(toggleId: string, label: string, checked: boolean, details: string): string {
  return `
    <div class="flex flex-col gap-4 rounded-[15px] px-8 py-6 lg:flex-row lg:items-start lg:justify-between has-[.checkbox:checked]:bg-pale">
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
      <select ${attrs} class="w-full cursor-pointer appearance-none bg-transparent py-2 pr-12 pl-4 text-text disabled:cursor-not-allowed disabled:text-off">
        ${choices}
      </select>
      <img src="${dropdownIcon}" alt="" class="pointer-events-none absolute right-4" />
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
      class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-off transition-colors hover:bg-white hover:text-sub disabled:pointer-events-none">
      ×
    </button>
  `;
}

/** 「日付を指定して除外」の入力1行分（「＋ 条件を追加」で増える） */
export function dateExclusionRow(rule: DateExclusion, index: number, disabled: boolean, removable: boolean): string {
  const off = disabled ? "disabled" : "";
  return `
    <div data-index="${index}" class="flex flex-wrap items-center gap-4">
      <input data-key="date" type="date" value="${rule.date}" ${off} class="${fieldClass(GREEN)} w-[262px] text-center" />
      <span>の</span>
      <div class="flex items-center gap-2">
        <input data-key="startMinutes" type="time" step="300" value="${minutesToTime(rule.startMinutes)}" ${off} class="${timeFieldClass(GREEN)}" />
        <span class="text-sub">~</span>
        <input data-key="endMinutes" type="time" step="300" value="${minutesToTime(rule.endMinutes)}" ${off} class="${timeFieldClass(GREEN)}" />
      </div>
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
      <div class="flex items-center rounded-[5px] border-2 border-main bg-white has-[:disabled]:border-off">
        ${dropdown(`data-key="recurrence" ${off}`, recurrences, "border-r-[3px] border-dashed border-off")}
        ${dropdown(`data-key="weekday" ${off}`, weekdays)}
      </div>
      <span>の</span>
      <div class="flex items-center gap-2">
        <input data-key="startMinutes" type="time" step="300" value="${minutesToTime(rule.startMinutes)}" ${off} class="${timeFieldClass(GREEN)}" />
        <span>~</span>
        <input data-key="endMinutes" type="time" step="300" value="${minutesToTime(rule.endMinutes)}" ${off} class="${timeFieldClass(GREEN)}" />
      </div>
      ${removeButton(removable, disabled)}
    </div>
  `;
}

// ---------- ページ全体 ----------

export function renderLayout(root: HTMLElement): void {
  root.innerHTML = `
    <main class="mx-auto flex max-w-[1075px] flex-col items-center gap-[52px] px-4 pt-16 pb-24 text-base md:pt-[168px] md:pb-[244px]">

      <section class="flex w-full flex-col gap-8">
        <h2 class="${HEADING} text-sub">今のスケジュール</h2>

        <label id="calendar-drop" class="flex cursor-pointer items-center justify-center rounded-[15px] bg-sub px-[59px] py-4 text-center font-semibold text-white shadow-button ring-frame data-[dragging]:ring-4">
          <input id="calendar-file" type="file" accept=".ics,text/calendar" class="sr-only" />
          <span id="calendar-drop-text">カレンダー情報をドロップ</span>
        </label>

        ${panel(
          GREEN,
          "指定した日程を除外",
          "カレンダーの予定に加えて予定が入りそうな曜日や日にちを候補から除くことができます",
          `<div class="flex flex-col gap-4">
            ${exclusionRow(
              "date-exclusion-toggle",
              "日付を指定して除外",
              true,
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
                    class="w-[76px] cursor-pointer rounded-[5px] border-2 border-sub2 bg-white px-4 py-2 text-off shadow-button aria-pressed:bg-sub2 aria-pressed:font-semibold aria-pressed:text-white">
                    ${name}
                  </button>`,
                ).join("")}
              </div>`,
            )}
            ${field(BLUE, "時刻の範囲", timeRange(BLUE, "day-start", "day-end", "08:00", "16:00"))}
            ${field(
              BLUE,
              "所要時間",
              `<div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  <input id="duration-hours" type="number" min="0" max="12" value="1" class="${fieldClass(BLUE)} w-[60px] text-right" />
                  時間
                </label>
                <label class="flex items-center gap-2">
                  <input id="duration-minutes" type="number" min="0" max="55" step="5" value="00" class="${fieldClass(BLUE)} w-[64px] text-right" />
                  分
                </label>
              </div>`,
            )}
            ${field(
              BLUE,
              "期間",
              `<div><select id="days-ahead" class="${fieldClass(BLUE)} cursor-pointer">${options(DAYS_AHEAD_CHOICES, 7)}</select></div>`,
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
            <div class="relative">
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
        class="h-[85px] w-full cursor-pointer rounded-[15px] bg-sub2 px-[59px] py-4 font-semibold text-white shadow-button transition-colors hover:bg-accent">
        面接日程を出力
      </button>
    </main>
  `;
}
