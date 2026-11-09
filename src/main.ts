// 画面の部品を取得し、データ(state)をもとに描画し、ユーザー操作に反応する。

import "./style.css";
import { formatDate, formatTime, formatWithTemplate, minutesToTime } from "./format";
import {
  CANDIDATE_BUTTON,
  dateExclusionRow,
  RECURRENCE_CHOICES,
  renderLayout,
  TIMELINE_CANDIDATE,
  TIMELINE_EVENT,
  WEEKDAY_NAMES,
  weekdayExclusionRow,
} from "./layout";
import { connectGoogle, disconnectGoogle, fetchGoogleBusy, isConfigured, isConnected, loadGoogleScript } from "./google";
import { exclusionSlots, findFreeSlots, upcomingDays } from "./slots";
import { readTime, setUpTimePickers } from "./timePicker";
import type { DateExclusion, Recurrence, SearchOptions, TimeSlot, WeekdayExclusion } from "./types";

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
setUpTimePickers(getElement<HTMLDivElement>("#app"));

// 年月日の入力欄は、標準ではカレンダーのアイコンを押したときしかカレンダーが開かない。
// 欄のどこをクリックしても開くよう、showPicker() で開く。
// 後から増える行（日付の除外）にも効くよう、#app でまとめて受け取る
getElement<HTMLDivElement>("#app").addEventListener("click", (event) => {
  const input = event.target as HTMLElement;
  if (!(input instanceof HTMLInputElement) || input.type !== "date" || input.disabled) return;
  try {
    input.showPicker();
  } catch {
    // showPicker に対応していない古いブラウザでは、これまでどおりアイコンから開く
  }
});

// いまのスケジュール
const calendarConnectButton = getElement<HTMLButtonElement>("#calendar-connect");
const calendarStatus = getElement<HTMLSpanElement>("#calendar-status");
const calendarDisconnectButton = getElement<HTMLButtonElement>("#calendar-disconnect");

// 指定した日程を除外
const dateExclusionToggle = getElement<HTMLInputElement>("#date-exclusion-toggle");
const dateExclusionList = getElement<HTMLDivElement>("#date-exclusion-list");
const addDateExclusionButton = getElement<HTMLButtonElement>("#add-date-exclusion");
const weekdayExclusionToggle = getElement<HTMLInputElement>("#weekday-exclusion-toggle");
const weekdayExclusionList = getElement<HTMLDivElement>("#weekday-exclusion-list");
const addWeekdayExclusionButton = getElement<HTMLButtonElement>("#add-weekday-exclusion");

// 日程の条件
const weekdayButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-weekday]")];
const dayStartInput = getElement<HTMLSpanElement>("#day-start");
const dayEndInput = getElement<HTMLSpanElement>("#day-end");
const durationHoursSelect = getElement<HTMLSelectElement>("#duration-hours");
const durationMinutesSelect = getElement<HTMLSelectElement>("#duration-minutes");
const periodRangeRadio = getElement<HTMLInputElement>("#period-range");
const periodNoneRadio = getElement<HTMLInputElement>("#period-none");
const periodStartInput = getElement<HTMLInputElement>("#period-start");
const periodWeeksInput = getElement<HTMLInputElement>("#period-weeks");

// 出力文章の形式
const templateInput = getElement<HTMLTextAreaElement>("#output-template");
const templateHighlight = getElement<HTMLDivElement>("#template-highlight");
const outputDemo = getElement<HTMLParagraphElement>("#output-demo");
const exportButton = getElement<HTMLButtonElement>("#export-button");
const toast = getElement<HTMLDivElement>("#toast");

// 日程確定後の画面
const formView = getElement<HTMLElement>("#form-view");
const resultView = getElement<HTMLElement>("#result-view");
const resultSummary = getElement<HTMLSpanElement>("#result-summary");
const candidateList = getElement<HTMLDivElement>("#candidate-list");
const candidateTimeline = getElement<HTMLDivElement>("#candidate-timeline");
const resultTabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"][data-view]')];
const resultMessage = getElement<HTMLTextAreaElement>("#result-message");
const copyButton = getElement<HTMLButtonElement>("#copy-button");
const copyStatus = getElement<HTMLSpanElement>("#copy-status");
const conditionSummary = getElement<HTMLDListElement>("#condition-summary");
const backButton = getElement<HTMLButtonElement>("#back-button");

// ---------- アプリの状態(state) ----------

interface AppState {
  /** Google カレンダーで予定が入っている時間帯（未連携なら空）。予定の名前は受け取らない */
  busy: TimeSlot[];
  /** 候補にする曜日（Figma の初期表示に合わせて月〜金） */
  includedWeekdays: Set<number>;
  dateExclusions: DateExclusion[];
  weekdayExclusions: WeekdayExclusion[];
  /** 「面接日程を出力」を押したときに計算した候補と、その中で選ばれているもの */
  result: {
    slots: TimeSlot[];
    /** 選択中の候補の番号（slots の添字） */
    selected: Set<number>;
    /** 出力したときの「出力文章の形式」 */
    template: string;
    /** 「他の予定あり」を開いて、予定の一覧を表示している日（"11/10(火)" の形） */
    expandedDays: Set<string>;
    /** 出力したときの条件（タイムラインの日付と時刻の範囲に使う） */
    options: SearchOptions;
    /**
     * 計算で出た元の候補（slots と同じ並び）。タイムラインで候補の長さを変えるとき、
     * ここより外には伸ばせない（外は予定や除外ルールと重なるため）
     */
    bounds: TimeSlot[];
  };
  /** 候補日の表示方法。もう一度出力しても、前に選んだ表示方法のまま */
  candidateView: CandidateView;
}

type CandidateView = "buttons" | "timeline";

// 「＋ 条件を追加」で増える行の初期値。毎回新しいオブジェクトを作るため関数にしている
const newDateExclusion = (): DateExclusion => ({ date: "", startMinutes: 8 * 60, endMinutes: 16 * 60 });
const newWeekdayExclusion = (): WeekdayExclusion => ({
  recurrence: "weekly",
  weekday: 1,
  startMinutes: 8 * 60,
  endMinutes: 16 * 60,
});

const state: AppState = {
  busy: [],
  includedWeekdays: new Set([1, 2, 3, 4, 5]),
  dateExclusions: [newDateExclusion()],
  weekdayExclusions: [newWeekdayExclusion()],
  result: {
    slots: [],
    selected: new Set(),
    template: "",
    expandedDays: new Set(),
    options: { startOffset: 1, daysAhead: 0, durationMinutes: 0, dayStartMinutes: 0, dayEndMinutes: 0, excludedWeekdays: [] },
    bounds: [],
  },
  candidateView: "timeline",
};

/** Date → <input type="date"> 用の "2026-11-20" */
function toDateValue(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/**
 * 「期間を指定しない」のときに探す日数。上限なしだと候補が増えすぎて重くなるので、
 * 明日から最大でこの日数分までを計算する
 */
const UNLIMITED_DAYS = 60;

/** 「提案する期間」から、探し始める日（今日から何日後か）と日数を読む */
function readPeriod(): { startOffset: number; daysAhead: number } {
  if (!periodRangeRadio.checked) return { startOffset: 1, daysAhead: UNLIMITED_DAYS };

  // 開始日から〇週間: 今日から開始日まで何日あるかを数える。未入力や今日以前なら明日から
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, date] = periodStartInput.value.split("-").map(Number);
  const start = new Date(year, month - 1, date);
  const offset = Math.round((start.getTime() - today.getTime()) / (24 * 60 * 60_000)); // 夏時間のずれを丸めで吸収
  // 「〇週間」は 1〜8 の範囲に収める（空欄や範囲外の入力に備える）
  const weeks = Math.min(Math.max(Math.round(Number(periodWeeksInput.value)) || 1, 1), 8);
  return { startOffset: Number.isNaN(offset) ? 1 : Math.max(offset, 1), daysAhead: weeks * 7 };
}

function readOptions(): SearchOptions {
  const allWeekdays = [0, 1, 2, 3, 4, 5, 6];
  return {
    // 「0時間00分」だと候補を作れないので、最低15分として扱う
    durationMinutes: Math.max(Number(durationHoursSelect.value) * 60 + Number(durationMinutesSelect.value), 15),
    ...readPeriod(),
    dayStartMinutes: readTime(dayStartInput),
    dayEndMinutes: readTime(dayEndInput),
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
  const busy = [...state.busy, ...exclusionSlots(dates, weekdays, options.startOffset, options.daysAhead)];
  return findFreeSlots(busy, options);
}

// ---------- 描画 ----------

function renderCalendarStatus(calendarCount?: number): void {
  calendarStatus.textContent =
    calendarCount === undefined
      ? "Googleカレンダーと連携"
      : `連携中：${calendarCount}個のカレンダー（押すと連携し直します）`;
  calendarDisconnectButton.hidden = calendarCount === undefined;
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

calendarConnectButton.addEventListener("click", async () => {
  calendarConnectButton.disabled = true;
  calendarStatus.textContent = "Googleカレンダーと連携中…";
  try {
    renderCalendarStatus(await connectGoogle());
  } catch (error) {
    renderCalendarStatus();
    showToast(error instanceof Error ? error.message : "Googleカレンダーと連携できませんでした");
  } finally {
    calendarConnectButton.disabled = false;
  }
});

calendarDisconnectButton.addEventListener("click", () => {
  disconnectGoogle();
  state.busy = [];
  renderCalendarStatus();
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

// 除外ルールの行は、余白など何も無いところをクリックしてもチェックを切り替える。
// 日付・時刻・ボタンなど操作できる部品や、チェックボックスの見出し(label)のクリックはそちらに任せる
for (const toggle of [dateExclusionToggle, weekdayExclusionToggle]) {
  toggle.closest("[data-exclusion-row]")?.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("input, select, button, label, textarea")) return;
    toggle.click(); // click() だと change イベントも発生し、上の render が呼ばれる
  });
}

setUpExclusionList(dateExclusionList, addDateExclusionButton, state.dateExclusions, newDateExclusion, renderDateExclusions);
setUpExclusionList(
  weekdayExclusionList,
  addWeekdayExclusionButton,
  state.weekdayExclusions,
  newWeekdayExclusion,
  renderWeekdayExclusions,
);

// 入力が変わったら state の該当する行を書き換える（再描画はしないので入力中のフォーカスは外れない）
// 開始時刻は「時」「分」のプルダウンの外側に data-key があるので、closest で外側までたどって探す
dateExclusionList.addEventListener("change", (event) => {
  const keyed = (event.target as HTMLElement).closest<HTMLElement>("[data-key]");
  const rule = state.dateExclusions[rowIndexOf(event.target as HTMLElement)];
  if (!keyed || !rule) return;
  switch (keyed.dataset.key) {
    case "date":
      rule.date = (keyed as HTMLInputElement).value;
      break;
    case "startMinutes":
    case "endMinutes":
      rule[keyed.dataset.key] = readTime(keyed);
      break;
  }
});

weekdayExclusionList.addEventListener("change", (event) => {
  const keyed = (event.target as HTMLElement).closest<HTMLElement>("[data-key]");
  const rule = state.weekdayExclusions[rowIndexOf(event.target as HTMLElement)];
  if (!keyed || !rule) return;
  switch (keyed.dataset.key) {
    case "recurrence":
      rule.recurrence = (keyed as HTMLSelectElement).value as Recurrence;
      break;
    case "weekday":
      rule.weekday = Number((keyed as HTMLSelectElement).value);
      break;
    case "startMinutes":
    case "endMinutes":
      rule[keyed.dataset.key] = readTime(keyed);
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

templateInput.addEventListener("input", renderTemplate);
// textarea をスクロールしたら、下に重ねた色付きの文字も一緒に動かす
templateInput.addEventListener("scroll", () => {
  templateHighlight.scrollTop = templateInput.scrollTop;
});

// ---------- 未入力のチェック ----------

let toastTimer: number | undefined;

/** 画面上部に message を数秒だけ表示する */
function showToast(message: string): void {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

/**
 * 使う設定なのに日付が入っていない入力欄を、画面の上から順に返す。
 * 時刻・所要時間はプルダウンで必ず値が入るので、調べるのは日付だけ
 */
function findMissingInputs(): HTMLInputElement[] {
  const missing: HTMLInputElement[] = [];
  if (dateExclusionToggle.checked) {
    const dates = dateExclusionList.querySelectorAll<HTMLInputElement>('input[data-key="date"]');
    missing.push(...[...dates].filter((input) => !input.value));
  }
  if (periodRangeRadio.checked && !periodStartInput.value) missing.push(periodStartInput);
  return missing;
}

// 未入力で赤くなった欄は、値が入ったら元の色に戻す
getElement<HTMLDivElement>("#app").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.getAttribute("aria-invalid") === "true" && input.value) input.removeAttribute("aria-invalid");
});

exportButton.addEventListener("click", async () => {
  const missing = findMissingInputs();
  if (missing.length > 0) {
    for (const input of missing) input.setAttribute("aria-invalid", "true");
    showToast(`未入力の項目があります（${missing.length}件）`);
    // 最初の未入力欄が画面の真ん中に来るようにスクロールし、すぐ入力できるようフォーカスする
    missing[0].scrollIntoView({ behavior: "smooth", block: "center" });
    missing[0].focus({ preventScroll: true });
    return;
  }

  // 連携中なら、提案する期間の分だけ Google カレンダーの予定を読み込み直す
  if (isConnected()) {
    const options = readOptions();
    const days = upcomingDays(options.startOffset, options.daysAhead);
    const from = new Date(days[0]);
    from.setHours(0, 0, 0, 0);
    const to = new Date(days[days.length - 1]);
    to.setHours(24, 0, 0, 0);
    exportButton.disabled = true;
    try {
      state.busy = await fetchGoogleBusy(from, to);
    } catch (error) {
      // 期限切れなどで読み込めないときは出力しない（予定が無いものとして候補を出すと危ないため）
      renderCalendarStatus();
      showToast(error instanceof Error ? error.message : "Googleカレンダーを読み込めませんでした");
      return;
    } finally {
      exportButton.disabled = false;
    }
  }

  const slots = computeSlots();
  state.result = {
    slots,
    selected: new Set(),
    template: templateInput.value,
    expandedDays: new Set(),
    options: readOptions(),
    // 長さを変えても元の範囲が分かるよう、別のオブジェクトとしてコピーしておく
    bounds: slots.map((slot) => ({ start: new Date(slot.start), end: new Date(slot.end) })),
  };
  renderCandidates();
  renderTimeline();
  showCandidateView(state.candidateView);
  renderResultMessage();
  renderConditionSummary();
  showView("result");
});

// ---------- 日程確定後の画面 ----------

/** 入力画面と日程確定後の画面を切り替える */
function showView(view: "form" | "result"): void {
  formView.hidden = view !== "form";
  resultView.hidden = view !== "result";
  window.scrollTo({ top: 0 });
}

/** date と同じ日（0:00〜24:00）に少しでもかかっている、カレンダーで予定が入っている時間帯 */
function eventsOn(date: Date): TimeSlot[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return state.busy.filter((event) => event.start < dayEnd && event.end > dayStart);
}

/**
 * その日にカレンダーの予定があることを示すボタン。クリックで予定の一覧を開け閉めする。
 * day は開いている日を覚えておくためのキー（main.ts の candidateList のクリックで使う）
 */
function otherEventsButton(day: string, count: number, expanded: boolean, listId: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "cursor-pointer rounded-full border border-accent px-3 py-0.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10";
  button.dataset.toggleDay = day;
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-controls", listId);
  button.textContent = `他の予定あり（${count}件）${expanded ? " ▲" : " ▼"}`;
  return button;
}

/**
 * その日の予定を「10:00〜12:00 予定あり」のように並べた一覧。日をまたぐ予定はその日の分だけ表示する。
 * Google からは予定の名前を受け取らないので、何の予定かは出さない
 */
function otherEventsList(events: TimeSlot[], date: Date, listId: string): HTMLUListElement {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const list = document.createElement("ul");
  list.id = listId;
  list.className = "flex flex-col gap-1 rounded-[5px] border-l-4 border-accent bg-accent/10 px-4 py-2 text-sm";
  for (const event of [...events].sort((x, y) => x.start.getTime() - y.start.getTime())) {
    const allDay = event.start <= dayStart && event.end >= dayEnd;
    const start = event.start < dayStart ? "0:00" : formatTime(event.start);
    const end = event.end > dayEnd ? "24:00" : formatTime(event.end);
    const item = document.createElement("li");
    item.textContent = `${allDay ? "終日" : `${start}〜${end}`}　予定あり`;
    list.append(item);
  }
  return list;
}

/** 候補日: 日付ごとにまとめて、時間帯のボタンを並べる */
function renderCandidates(): void {
  const { slots, selected } = state.result;
  resultSummary.textContent = `${slots.length}件の候補のうち ${selected.size}件を選択中`;

  if (slots.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "条件に合う空き時間が見つかりませんでした。「条件を編集」から条件を見直してください。";
    candidateList.replaceChildren(empty);
    return;
  }

  // 日付ごとにグループ分けする（キー: "11/10(火)"、値: その日の候補の番号）
  const byDay = new Map<string, number[]>();
  slots.forEach((slot, index) => {
    const day = formatDate(slot.start);
    byDay.set(day, [...(byDay.get(day) ?? []), index]);
  });

  // 外から来た文字が混ざっても安全なように、innerHTML ではなく textContent で入れる
  const groups = [...byDay].map(([day, indexes]) => {
    const group = document.createElement("div");
    group.className = "flex flex-col gap-3";

    const heading = document.createElement("div");
    heading.className = "flex flex-wrap items-center gap-3";
    const date = document.createElement("h4");
    date.className = "font-semibold text-sub2";
    date.textContent = day;
    heading.append(date);
    // その日にほかの予定が入っていたら、日付の横にボタンを付け、開いていれば予定の一覧も出す
    const events = eventsOn(slots[indexes[0]].start);
    const expanded = state.result.expandedDays.has(day);
    const listId = `other-events-${indexes[0]}`;
    if (events.length > 0) heading.append(otherEventsButton(day, events.length, expanded, listId));

    const buttons = document.createElement("div");
    buttons.className = "flex flex-wrap gap-3";
    for (const index of indexes) {
      const slot = slots[index];
      const button = document.createElement("button");
      button.type = "button";
      button.className = CANDIDATE_BUTTON;
      button.dataset.index = String(index);
      button.setAttribute("aria-pressed", String(selected.has(index)));
      button.textContent = `${formatTime(slot.start)}〜${formatTime(slot.end)}`;
      buttons.append(button);
    }

    group.append(heading);
    if (events.length > 0 && expanded) group.append(otherEventsList(events, slots[indexes[0]].start, listId));
    group.append(buttons);
    return group;
  });
  candidateList.replaceChildren(...groups);
}

/** 出力文: 選んだ候補を日時順に「出力文章の形式」で1行ずつ並べる（手で書き換えた内容は上書きされる） */
function renderResultMessage(): void {
  const { slots, selected, template } = state.result;
  resultMessage.value = slots
    .filter((_, index) => selected.has(index))
    // 選んだ順番に関係なく、日時が早い順に並べる
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((slot) => formatWithTemplate(template, slot))
    .join("\n");
  copyStatus.textContent = "";
}

/** 30 → "30分"、60 → "1時間"、90 → "1時間30分" */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h > 0 ? `${h}時間` : "", m > 0 ? `${m}分` : ""].join("");
}

/** 以下の条件で出力: 計算に使った条件を「項目名: 内容」で一覧にする */
function renderConditionSummary(): void {
  const options = readOptions();
  const { dates, weekdays } = activeExclusions();
  const timeRange = (start: number, end: number) => `${minutesToTime(start)}〜${minutesToTime(end)}`;
  const recurrenceLabel = (rule: WeekdayExclusion) =>
    RECURRENCE_CHOICES.find((c) => c.value === rule.recurrence)?.label ?? "";

  const period = periodRangeRadio.checked
    ? `${formatDate(new Date(`${periodStartInput.value}T00:00`))} から ${options.daysAhead / 7}週間`
    : "指定しない（明日から）";

  const items: [string, string[]][] = [
    ["曜日", [WEEKDAY_NAMES.filter((_, i) => state.includedWeekdays.has(i)).join("・") || "なし"]],
    ["時刻の範囲", [timeRange(options.dayStartMinutes, options.dayEndMinutes)]],
    ["所要時間", [formatDuration(options.durationMinutes)]],
    ["提案する期間", [period]],
    [
      "日付を指定して除外",
      dates.length > 0
        ? dates.map((d) => `${formatDate(new Date(`${d.date}T00:00`))} ${timeRange(d.startMinutes, d.endMinutes)}`)
        : ["なし"],
    ],
    [
      "曜日を指定して除外",
      weekdays.length > 0
        ? weekdays.map(
            (w) => `${recurrenceLabel(w)} ${WEEKDAY_NAMES[w.weekday]}曜日 ${timeRange(w.startMinutes, w.endMinutes)}`,
          )
        : ["なし"],
    ],
  ];

  conditionSummary.replaceChildren(
    ...items.flatMap(([label, values]) => {
      const dt = document.createElement("dt");
      dt.className = "font-semibold text-sub2";
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.className = "whitespace-pre-line";
      dd.textContent = values.join("\n");
      return [dt, dd];
    }),
  );
}

candidateList.addEventListener("click", (event) => {
  // 「他の予定あり」: その日の予定の一覧を開け閉めする
  const toggle = (event.target as HTMLElement).closest<HTMLElement>("[data-toggle-day]");
  if (toggle) {
    const day = toggle.dataset.toggleDay ?? "";
    const { expandedDays } = state.result;
    if (expandedDays.has(day)) {
      expandedDays.delete(day);
    } else {
      expandedDays.add(day);
    }
    renderCandidates();
    // 作り直したボタンにフォーカスを戻し、キーボードで続けて操作できるようにする
    candidateList.querySelector<HTMLElement>(`[data-toggle-day="${CSS.escape(day)}"]`)?.focus();
    return;
  }
  onCandidateClick(event, candidateList);
});

candidateTimeline.addEventListener("click", (event) => onCandidateClick(event, candidateTimeline));

/** 候補（ボタンでもタイムラインのブロックでも）がクリックされたら、選択を切り替えて両方の表示を作り直す */
function onCandidateClick(event: MouseEvent, container: HTMLElement): void {
  // つまみをドラッグして離した直後のクリックでは、選択を切り替えない
  if (justResized) return;
  const button = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
  if (!button) return;
  const index = Number(button.dataset.index);
  const { selected } = state.result;
  if (selected.has(index)) {
    selected.delete(index);
  } else {
    selected.add(index);
  }
  renderCandidates();
  renderTimeline();
  renderResultMessage();
  container.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
}

// ---------- 候補日の表示方法（ボタン / タイムライン） ----------

function showCandidateView(view: CandidateView): void {
  state.candidateView = view;
  for (const tab of resultTabs) {
    const selected = tab.dataset.view === view;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1; // 矢印キーでタブ間を移動する作法に合わせ、選択中だけ Tab で止まる
  }
  candidateList.hidden = view !== "buttons";
  candidateTimeline.hidden = view !== "timeline";
}

for (const tab of resultTabs) {
  tab.addEventListener("click", () => showCandidateView(tab.dataset.view as CandidateView));
  // ← → キーで隣のタブへ
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const next = resultTabs[(resultTabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + resultTabs.length) % resultTabs.length];
    showCandidateView(next.dataset.view as CandidateView);
    next.focus();
  });
}

/** タイムラインの1時間あたりの高さ(px) */
const HOUR_HEIGHT = 48;

// ---------- タイムラインで候補の長さを変える（上端・下端のドラッグ） ----------

/** ドラッグで動かす単位（分）。時計の :00 / :30 にスナップする */
const RESIZE_STEP_MINUTES = 30;
/** つまみを離した直後のクリックを無視するための目印 */
let justResized = false;

candidateTimeline.addEventListener("pointerdown", (event) => {
  const handle = (event.target as HTMLElement).closest<HTMLElement>("[data-resize]");
  const button = handle?.closest<HTMLButtonElement>("[data-index]");
  if (!handle || !button) return;
  event.preventDefault(); // 文字の選択やスクロールが始まらないようにする
  startResize(event, button, handle.dataset.resize as "start" | "end");
});

/**
 * つまみのドラッグを始める。ドラッグ中はそのブロックの位置と文字だけを書き換え、
 * 離したときに state に反映して全体を作り直す（途中で作り直すとドラッグが途切れるため）
 */
function startResize(event: PointerEvent, button: HTMLButtonElement, edge: "start" | "end"): void {
  const index = Number(button.dataset.index);
  const slot = state.result.slots[index];
  const bound = state.result.bounds[index];
  const minMinutes = state.result.options.durationMinutes; // 所要時間より短くはできない
  const startY = event.clientY;
  const originalTop = parseFloat(button.style.top);
  const originalHeight = parseFloat(button.style.height);
  let start = slot.start;
  let end = slot.end;

  const minutesToPx = (minutes: number) => (minutes / 60) * HOUR_HEIGHT;
  const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);
  const diffMinutes = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 60_000;

  /** date を時計の :00 / :30 のうち近いほうにそろえる */
  const snap = (date: Date) => {
    const snapped = new Date(date);
    const minutes = snapped.getHours() * 60 + snapped.getMinutes() + snapped.getSeconds() / 60;
    snapped.setHours(0, Math.round(minutes / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES, 0, 0);
    return snapped;
  };

  const onMove = (move: PointerEvent) => {
    // 動かした距離を分に直す
    const delta = ((move.clientY - startY) / HOUR_HEIGHT) * 60;
    // スナップした後で範囲内に収める。元の空きの端が 10:15 のような半端な時刻でも、その端までは伸ばせる
    if (edge === "start") {
      // 元の空きより前には伸ばせず、終了の「所要時間」手前より後ろには縮められない
      const latest = addMinutes(slot.end, -minMinutes);
      const moved = snap(addMinutes(slot.start, delta));
      start = moved < bound.start ? bound.start : moved > latest ? latest : moved;
    } else {
      const earliest = addMinutes(slot.start, minMinutes);
      const moved = snap(addMinutes(slot.end, delta));
      end = moved > bound.end ? bound.end : moved < earliest ? earliest : moved;
    }
    // ドラッグ中の見た目だけ先に変える
    const topShift = minutesToPx(diffMinutes(start, slot.start));
    const heightChange = minutesToPx(diffMinutes(end, slot.end)) - topShift;
    button.style.top = `${originalTop + topShift}px`;
    button.style.height = `${Math.max(originalHeight + heightChange, 20)}px`;
    button.firstChild!.textContent = `${formatTime(start)}〜${formatTime(end)}`;
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    state.result.slots[index] = { start, end };
    renderCandidates();
    renderTimeline();
    renderResultMessage();
    // 離した直後に発生するクリックで選択が切り替わらないよう、少しの間だけ無視する
    justResized = true;
    setTimeout(() => {
      justResized = false;
    }, 0);
  };

  // ブロックの外までドラッグしても追えるよう、window で受け取る
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

/** 横に日付、縦に時刻を並べたタイムラインを作る。候補ブロックはクリックで選べる */
function renderTimeline(): void {
  const { slots, selected, options } = state.result;
  // 縦の範囲は「時刻の範囲」を1時間単位に広げたもの
  const firstHour = Math.floor(options.dayStartMinutes / 60);
  const lastHour = Math.max(Math.ceil(options.dayEndMinutes / 60), firstHour + 1);
  const bodyHeight = (lastHour - firstHour) * HOUR_HEIGHT;

  /** day の 0:00 から date まで何分あるか */
  const minutesOf = (day: Date, date: Date) => {
    const midnight = new Date(day);
    midnight.setHours(0, 0, 0, 0);
    return (date.getTime() - midnight.getTime()) / 60_000;
  };
  /** day の中の start〜end を、タイムライン上の位置(top)と高さ(height)にする。範囲外は切り詰める */
  const place = (day: Date, start: Date, end: Date) => {
    const top = Math.max(((minutesOf(day, start) - firstHour * 60) / 60) * HOUR_HEIGHT, 0);
    const bottom = Math.min(((minutesOf(day, end) - firstHour * 60) / 60) * HOUR_HEIGHT, bodyHeight);
    return { top, height: bottom - top };
  };

  const root = document.createElement("div");
  root.className = "inline-flex min-w-full";

  // 左端の時刻の目盛り。横にスクロールしても見えるよう sticky で固定する
  const axis = document.createElement("div");
  axis.className = "sticky left-0 z-10 w-14 shrink-0 bg-white";
  const axisBody = document.createElement("div");
  axisBody.className = "relative";
  axisBody.style.height = `${bodyHeight}px`;
  for (let hour = firstHour; hour <= lastHour; hour++) {
    const label = document.createElement("span");
    label.className = "absolute right-2 -translate-y-1/2 text-xs text-hint";
    label.style.top = `${(hour - firstHour) * HOUR_HEIGHT}px`;
    label.textContent = `${hour}:00`;
    axisBody.append(label);
  }
  const axisHeader = document.createElement("div");
  axisHeader.className = "h-12";
  axis.append(axisHeader, axisBody);
  root.append(axis);

  // 1時間ごとの横線（と、候補にしない曜日は斜線）を背景で描く
  const hourLines = `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_HEIGHT - 1}px, var(--color-off) ${HOUR_HEIGHT - 1}px ${HOUR_HEIGHT}px)`;
  const hatch = "repeating-linear-gradient(135deg, transparent 0 6px, var(--color-off) 6px 7px)";

  for (const day of upcomingDays(options.startOffset, options.daysAhead)) {
    const weekday = day.getDay();
    const column = document.createElement("div");
    column.className = "w-32 shrink-0 border-l border-frame2";

    const header = document.createElement("div");
    const color = weekday === 0 ? "text-error" : weekday === 6 ? "text-main2" : "text-sub2";
    header.className = `flex h-12 items-center justify-center border-b-2 border-frame2 font-semibold ${color}`;
    header.textContent = formatDate(day);

    const body = document.createElement("div");
    body.className = "relative";
    body.style.height = `${bodyHeight}px`;
    const excluded = options.excludedWeekdays.includes(weekday);
    body.style.backgroundImage = excluded ? `${hourLines}, ${hatch}` : hourLines;
    if (excluded) body.title = "候補にしない曜日";

    // カレンダーの予定（薄い黄色）。クリックはできない
    for (const event of eventsOn(day)) {
      const { top, height } = place(day, event.start, event.end);
      if (height <= 0) continue; // 「時刻の範囲」の外の予定は描かない
      const block = document.createElement("div");
      block.className = TIMELINE_EVENT;
      block.style.top = `${top}px`;
      block.style.height = `${height}px`;
      block.textContent = "予定あり";
      body.append(block);
    }

    // 候補（紺の枠）。クリックで選ぶと紺に塗りつぶされる
    slots.forEach((slot, index) => {
      if (toDateValue(slot.start) !== toDateValue(day)) return;
      const { top, height } = place(day, slot.start, slot.end);
      const button = document.createElement("button");
      button.type = "button";
      button.className = TIMELINE_CANDIDATE;
      button.style.top = `${top}px`;
      button.style.height = `${Math.max(height, 20)}px`;
      button.dataset.index = String(index);
      button.setAttribute("aria-pressed", String(selected.has(index)));
      button.textContent = `${formatTime(slot.start)}〜${formatTime(slot.end)}`;
      // 上端・下端のつまみ。ドラッグすると開始・終了の時刻を変えられる（startResize）。
      // 乗せると細い線が出て、つかめる場所だと分かるようにする
      for (const edge of ["start", "end"] as const) {
        const handle = document.createElement("span");
        handle.dataset.resize = edge;
        handle.setAttribute("aria-hidden", "true");
        handle.className = `group/handle absolute inset-x-0 h-2 cursor-ns-resize touch-none ${edge === "start" ? "top-0" : "bottom-0"}`;
        const grip = document.createElement("span");
        grip.className =
          "absolute top-1/2 left-1/2 h-1 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-0 transition-opacity group-hover/handle:opacity-60";
        handle.append(grip);
        button.append(handle);
      }
      body.append(button);
    });

    column.append(header, body);
    root.append(column);
  }

  candidateTimeline.replaceChildren(root);
}


copyButton.addEventListener("click", async () => {
  if (!resultMessage.value) {
    copyStatus.textContent = "候補日を選んでください";
    return;
  }
  try {
    await navigator.clipboard.writeText(resultMessage.value);
    copyStatus.textContent = "コピーしました";
  } catch {
    // http:// で開いている場合などはクリップボードが使えない
    copyStatus.textContent = "コピーできませんでした。文章を選択して手動でコピーしてください";
  }
});

backButton.addEventListener("click", () => showView("form"));

// ---------- 起動 ----------

/** 「期間を指定しない」を選んでいる間は、開始日と「〇週間」の入力欄を選べなくする（灰色になる） */
function renderPeriod(): void {
  periodStartInput.disabled = periodWeeksInput.disabled = !periodRangeRadio.checked;
}

periodRangeRadio.addEventListener("change", renderPeriod);
periodNoneRadio.addEventListener("change", renderPeriod);

async function init(): Promise<void> {
  // 開始日は明日以降だけ選べるようにし、最初は明日を入れておく
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  periodStartInput.min = periodStartInput.value = toDateValue(tomorrow);
  renderPeriod();

  // ポップアップがブロックされないよう、ボタンが押される前に Google のスクリプトを読み込んでおく
  renderCalendarStatus();
  if (isConfigured) {
    loadGoogleScript().catch((error: Error) => showToast(error.message));
  } else {
    calendarStatus.textContent = "Googleカレンダー連携は未設定です（.env.local に VITE_GOOGLE_CLIENT_ID を設定）";
    calendarConnectButton.disabled = true;
  }
  renderDateExclusions();
  renderWeekdayExclusions();
  renderWeekdays();
  renderTemplate();
}

init();
