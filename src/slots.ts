// 予定の一覧から「空いている時間帯」を計算するロジック。
// 画面(DOM)には一切触らない「純粋な計算」だけを置いている。

import type { DateExclusion, SearchOptions, TimeSlot, WeekdayExclusion } from "./types";

/** 候補の開始時刻を何分刻みでずらすか */
const STEP_MINUTES = 30;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** day と同じ日の 0:00 から minutes 分後の Date を作る */
function atMinutes(day: Date, minutes: number): Date {
  const date = new Date(day);
  date.setHours(0, minutes, 0, 0); // 分が60を超えても時に繰り上がる
  return date;
}

/** 明日から daysAhead 日後までの日付を1日ずつ返す */
function upcomingDays(daysAhead: number, now: Date): Date[] {
  const days: Date[] = [];
  for (let i = 1; i <= daysAhead; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    days.push(day);
  }
  return days;
}

/** date を含む週の月曜 0:00 */
function startOfWeek(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // 月曜=0 … 日曜=6 に直して戻す
  return monday;
}

/** day が今週から数えて何週後か（今週=0、来週=1） */
function weeksFromNow(day: Date, now: Date): number {
  const diff = startOfWeek(day).getTime() - startOfWeek(now).getTime();
  return Math.round(diff / (7 * 24 * 60 * 60_000)); // 夏時間などのずれを丸めで吸収
}

function matchesRecurrence(rule: WeekdayExclusion, day: Date, now: Date): boolean {
  if (day.getDay() !== rule.weekday) return false;
  const weeks = weeksFromNow(day, now);
  switch (rule.recurrence) {
    case "weekly":
      return true;
    case "biweeklyFromThisWeek":
      return weeks % 2 === 0;
    case "biweeklyFromNextWeek":
      return weeks % 2 === 1;
  }
}

/** 2つの時間帯が少しでも重なっていれば true */
function overlaps(a: TimeSlot, b: TimeSlot): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

function isExcludedDay(weekday: number, excludedWeekdays: number[]): boolean {
  return excludedWeekdays.includes(weekday);
}

/** 除外ルールを「埋まっている時間帯」の一覧に変換する */
export function exclusionSlots(
  dateExclusions: DateExclusion[],
  weekdayExclusions: WeekdayExclusion[],
  daysAhead: number,
  now: Date = new Date(),
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const rule of dateExclusions) {
    if (!rule.date) continue; // 日付が未入力の行は無視
    const [year, month, date] = rule.date.split("-").map(Number);
    const day = new Date(year, month - 1, date);
    slots.push({ start: atMinutes(day, rule.startMinutes), end: atMinutes(day, rule.endMinutes) });
  }

  for (const day of upcomingDays(daysAhead, now)) {
    for (const rule of weekdayExclusions) {
      if (!matchesRecurrence(rule, day, now)) continue;
      slots.push({ start: atMinutes(day, rule.startMinutes), end: atMinutes(day, rule.endMinutes) });
    }
  }

  return slots;
}

export function findFreeSlots(
  busy: TimeSlot[],
  options: SearchOptions,
  now: Date = new Date(),
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // 明日から daysAhead 日後まで、1日ずつ調べる
  for (const day of upcomingDays(options.daysAhead, now)) {
    if (isExcludedDay(day.getDay(), options.excludedWeekdays)) continue;

    const dayEnd = atMinutes(day, options.dayEndMinutes);
    let start = atMinutes(day, options.dayStartMinutes);

    // 「開始時刻 + 所要時間」が終了時刻を超えない範囲で、30分ずつずらして候補を作る
    while (addMinutes(start, options.durationMinutes) <= dayEnd) {
      const candidate: TimeSlot = { start, end: addMinutes(start, options.durationMinutes) };
      // CalendarEvent も start/end を持つので、TimeSlot として渡せる
      const isBusy = busy.some((slot) => overlaps(candidate, slot));
      if (!isBusy) slots.push(candidate);
      start = addMinutes(start, STEP_MINUTES);
    }
  }

  return slots;
}
