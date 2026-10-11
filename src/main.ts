// 画面の部品を取得し、データ(state)をもとに描画し、ユーザー操作に反応する。

import "./style.css";
import { formatWithTemplate, timeToMinutes } from "./format";
import { parseIcs } from "./ics";
import { dateExclusionRow, renderLayout, weekdayExclusionRow } from "./layout";
import { fetchEvents } from "./mockCalendar";
import { exclusionSlots, findFreeSlots } from "./slots";
import type { CalendarEvent, DateExclusion, Recurrence, SearchOptions, TimeSlot, WeekdayExclusion } from "./types";

// ---------- 画面の部品を取得 ----------

// querySelector は見つからないと null を返す。
// 毎回 null チェックしなくて済むよう、見つからなければエラーにする関数を用意する。
// <T extends HTMLElement> は「HTML要素の一種なら何でも受け付ける」型引数（ジェネリクス）。
function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} が見つかりません`);
  return element;
}

// 先にページの骨組みを作らないと、下の getElement で部品が見つからない
renderLayout(getElement<HTMLDivElement>("#app"));

// いまのスケジュール
const calendarDrop = getElement<HTMLLabelElement>("#calendar-drop");
const calendarFile = getElement<HTMLInputElement>("#calendar-file");
const calendarDropText = getElement<HTMLSpanElement>("#calendar-drop-text");

// 指定した日程を除外
const dateExclusionToggle = getElement<HTMLInputElement>("#date-exclusion-toggle");
const dateExclusionList = getElement<HTMLDivElement>("#date-exclusion-list");
const addDateExclusionButton = getElement<HTMLButtonElement>("#add-date-exclusion");
const weekdayExclusionToggle = getElement<HTMLInputElement>("#weekday-exclusion-toggle");
const weekdayExclusionList = getElement<HTMLDivElement>("#weekday-exclusion-list");
const addWeekdayExclusionButton = getElement<HTMLButtonElement>("#add-weekday-exclusion");

// 日程の条件
const weekdayButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-weekday]")];
const dayStartInput = getElement<HTMLInputElement>("#day-start");
const dayEndInput = getElement<HTMLInputElement>("#day-end");
const durationHoursInput = getElement<HTMLInputElement>("#duration-hours");
const durationMinutesInput = getElement<HTMLInputElement>("#duration-minutes");
const daysAheadSelect = getElement<HTMLSelectElement>("#days-ahead");

// 出力文章の形式
const templateInput = getElement<HTMLTextAreaElement>("#output-template");
const templateHighlight = getElement<HTMLDivElement>("#template-highlight");
const outputDemo = getElement<HTMLParagraphElement>("#output-demo");
const exportButton = getElement<HTMLButtonElement>("#export-button");

// ---------- アプリの状態(state) ----------

interface AppState {
  events: CalendarEvent[];
  /** 候補にする曜日（Figma の初期表示に合わせて月〜金） */
  includedWeekdays: Set<number>;
  dateExclusions: DateExclusion[];
  weekdayExclusions: WeekdayExclusion[];
}

// 「＋ 条件を追加」で増える行の初期値。毎回新しいオブジェクトを作るため関数にしている
const newDateExclusion = (): DateExclusion => ({ date: "", startMinutes: 8 * 60, endMinutes: 16 * 60 });
const newWeekdayExclusion = (): WeekdayExclusion => ({
  recurrence: "weekly",
  weekday: 1,
  startMinutes: 8 * 60,
  endMinutes: 16 * 60,
});

const state: AppState = {
  events: [],
  includedWeekdays: new Set([1, 2, 3, 4, 5]),
  dateExclusions: [newDateExclusion()],
  weekdayExclusions: [newWeekdayExclusion()],
};

function readOptions(): SearchOptions {
  const allWeekdays = [0, 1, 2, 3, 4, 5, 6];
  return {
    durationMinutes: Number(durationHoursInput.value) * 60 + Number(durationMinutesInput.value),
    daysAhead: Number(daysAheadSelect.value),
    dayStartMinutes: timeToMinutes(dayStartInput.value),
    dayEndMinutes: timeToMinutes(dayEndInput.value),
    excludedWeekdays: allWeekdays.filter((day) => !state.includedWeekdays.has(day)),
  };
}

/** チェックが入っている除外ルールだけを返す */
function activeExclusions(): { dates: DateExclusion[]; weekdays: WeekdayExclusion[] } {
  return {
    dates: dateExclusionToggle.checked ? state.dateExclusions : [],
    weekdays: weekdayExclusionToggle.checked ? state.weekdayExclusions : [],
  };
}

/** カレンダーの予定と除外ルールを合わせて、空き時間の候補を計算する */
function computeSlots(): TimeSlot[] {
  const options = readOptions();
  const { dates, weekdays } = activeExclusions();
  const busy = [...state.events, ...exclusionSlots(dates, weekdays, options.daysAhead)];
  return findFreeSlots(busy, options);
}

// ---------- 描画 ----------

function renderCalendarStatus(fileName?: string): void {
  calendarDropText.textContent = fileName
    ? `${fileName} から ${state.events.length}件の予定を読み込みました`
    : "カレンダー情報をドロップ";
}

function renderDateExclusions(): void {
  const disabled = !dateExclusionToggle.checked;
  const removable = state.dateExclusions.length > 1; // 最後の1行は消せない
  dateExclusionList.innerHTML = state.dateExclusions
    .map((rule, index) => dateExclusionRow(rule, index, disabled, removable))
    .join("");
  addDateExclusionButton.disabled = disabled;
}

function renderWeekdayExclusions(): void {
  const disabled = !weekdayExclusionToggle.checked;
  const removable = state.weekdayExclusions.length > 1;
  weekdayExclusionList.innerHTML = state.weekdayExclusions
    .map((rule, index) => weekdayExclusionRow(rule, index, disabled, removable))
    .join("");
  addWeekdayExclusionButton.disabled = disabled;
}

function renderWeekdays(): void {
  for (const button of weekdayButtons) {
    const pressed = state.includedWeekdays.has(Number(button.dataset.weekday));
    button.setAttribute("aria-pressed", String(pressed));
  }
}

/** textarea の文字をそのまま写し、{} だけ色を付ける */
function renderTemplate(): void {
  const escaped = templateInput.value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // 末尾が改行だと高さがずれるので空白を1つ足す
  templateHighlight.innerHTML = `${escaped.replace(/\{\}/g, `<span class="text-accent">{}</span>`)} `;

  // 出力デモは Figma と同じく「明日の 9:00〜18:00」を例にする
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(18);
  outputDemo.textContent = formatWithTemplate(templateInput.value, { start, end });
}

// ---------- ユーザー操作 ----------

async function loadIcsFile(file: File): Promise<void> {
  const events = parseIcs(await file.text());
  if (events.length === 0) {
    calendarDropText.textContent = `${file.name} から予定を読み込めませんでした`;
    return;
  }
  state.events = events;
  renderCalendarStatus(file.name);
}

calendarFile.addEventListener("change", () => {
  const file = calendarFile.files?.[0];
  if (file) loadIcsFile(file);
});

// ドラッグ中は枠を光らせる。dragover で preventDefault しないと drop が発生しない
calendarDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
  calendarDrop.dataset.dragging = "";
});
calendarDrop.addEventListener("dragleave", () => {
  delete calendarDrop.dataset.dragging;
});
calendarDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  delete calendarDrop.dataset.dragging;
  const file = event.dataTransfer?.files[0];
  if (file) loadIcsFile(file);
});

/** 入力欄が属している行の番号（data-index）。行の外なら -1 */
function rowIndexOf(element: HTMLElement): number {
  const row = element.closest<HTMLElement>("[data-index]");
  return row ? Number(row.dataset.index) : -1;
}

/**
 * 除外ルールの一覧に「追加」「削除」の操作を付ける。日付と曜日で共通。
 * 行ごとにリスナーを付けず、親の1か所でまとめて受け取る（イベントの委譲）
 */
function setUpExclusionList<T>(
  list: HTMLElement,
  addButton: HTMLButtonElement,
  rules: T[],
  createRule: () => T,
  render: () => void,
): void {
  addButton.addEventListener("click", () => {
    rules.push(createRule());
    render();
  });
  list.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-action=remove]");
    if (!button) return;
    rules.splice(rowIndexOf(button), 1); // splice(位置, 1) でその1件だけ取り除く
    render();
  });
}

dateExclusionToggle.addEventListener("change", renderDateExclusions);
weekdayExclusionToggle.addEventListener("change", renderWeekdayExclusions);

setUpExclusionList(dateExclusionList, addDateExclusionButton, state.dateExclusions, newDateExclusion, renderDateExclusions);
setUpExclusionList(
  weekdayExclusionList,
  addWeekdayExclusionButton,
  state.weekdayExclusions,
  newWeekdayExclusion,
  renderWeekdayExclusions,
);

// 入力が変わったら state の該当する行を書き換える（再描画はしないので入力中のフォーカスは外れない）
dateExclusionList.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  const rule = state.dateExclusions[rowIndexOf(input)];
  if (!rule) return;
  if (input.dataset.key === "date") {
    rule.date = input.value;
  } else if (input.dataset.key === "startMinutes" || input.dataset.key === "endMinutes") {
    rule[input.dataset.key] = timeToMinutes(input.value);
  }
});

weekdayExclusionList.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  const rule = state.weekdayExclusions[rowIndexOf(input)];
  if (!rule) return;
  switch (input.dataset.key) {
    case "recurrence":
      rule.recurrence = input.value as Recurrence;
      break;
    case "weekday":
      rule.weekday = Number(input.value);
      break;
    case "startMinutes":
    case "endMinutes":
      rule[input.dataset.key] = timeToMinutes(input.value);
      break;
  }
});

for (const button of weekdayButtons) {
  button.addEventListener("click", () => {
    const weekday = Number(button.dataset.weekday);
    if (state.includedWeekdays.has(weekday)) {
      state.includedWeekdays.delete(weekday);
    } else {
      state.includedWeekdays.add(weekday);
    }
    renderWeekdays();
  });
}

// 「08」→ 入力後も「08」のように2桁で表示する
durationMinutesInput.addEventListener("change", () => {
  durationMinutesInput.value = String(Number(durationMinutesInput.value)).padStart(2, "0");
});

templateInput.addEventListener("input", renderTemplate);
// textarea をスクロールしたら、下に重ねた色付きの文字も一緒に動かす
templateInput.addEventListener("scroll", () => {
  templateHighlight.scrollTop = templateInput.scrollTop;
});

exportButton.addEventListener("click", () => {
  // 出力後の画面は別デザインで作る予定。いまは計算結果をコンソールに出すだけ
  const lines = computeSlots().map((slot) => formatWithTemplate(templateInput.value, slot));
  console.log(lines.join("\n"));
});

// ---------- 起動 ----------

async function init(): Promise<void> {
  // .ics を読み込むまではモックの予定を使う
  state.events = await fetchEvents();
  renderCalendarStatus();
  renderDateExclusions();
  renderWeekdayExclusions();
  renderWeekdays();
  renderTemplate();
}

init();
