// 予定の一覧から「空いている時間帯」を計算するロジック。
// 画面(DOM)には一切触らない「純粋な計算」だけを置いている。

import type { DateExclusion, SearchOptions, TimeSlot, WeekdayExclusion } from "./types";

/** 候補の区切りを何分単位にそろえるか（予定が 10:10 に終わるなら 10:15 から空きとみなす） */
const ROUND_MINUTES = 15;

/** day と同じ日の 0:00 から minutes 分後の Date を作る */
function atMinutes(day: Date, minutes: number): Date {
  const date = new Date(day);
  date.setHours(0, minutes, 0, 0); // 分が60を超えても時に繰り上がる
  return date;
}

/** 今日から startOffset 日後の日から、count 日分の日付を1日ずつ返す */
export function upcomingDays(startOffset: number, count: number, now: Date = new Date()): Date[] {
  const days: Date[] = [];
  for (let i = startOffset; i < startOffset + count; i++) {
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
  startOffset: number,
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

  for (const day of upcomingDays(startOffset, daysAhead, now)) {
    for (const rule of weekdayExclusions) {
      if (!matchesRecurrence(rule, day, now)) continue;
      slots.push({ start: atMinutes(day, rule.startMinutes), end: atMinutes(day, rule.endMinutes) });
    }
  }

  return slots;
}

/** day の 0:00 から date まで何分あるか */
function minutesOfDay(day: Date, date: Date): number {
  return (date.getTime() - atMinutes(day, 0).getTime()) / 60_000;
}

/**
 * 空いている時間を、つながっている分はひとかたまりの候補として返す。
 * 例: 13〜17時に予定が無ければ「13:00〜17:00」で1件（所要時間より短い空きは候補にしない）
 */
export function findFreeSlots(
  busy: TimeSlot[],
  options: SearchOptions,
  now: Date = new Date(),
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // こだわり条件「予定の前後に余裕」: 予定を前後に bufferMinutes 分ずつ広げて、埋まっているものとして扱う
  const buffer = options.preference === "buffer" ? options.bufferMinutes * 60_000 : 0;
  const paddedBusy = busy.map((slot) => ({
    start: new Date(slot.start.getTime() - buffer),
    end: new Date(slot.end.getTime() + buffer),
  }));

  // startOffset 日後から daysAhead 日分、1日ずつ調べる
  for (const day of upcomingDays(options.startOffset, options.daysAhead, now)) {
    if (isExcludedDay(day.getDay(), options.excludedWeekdays)) continue;

    // こだわり条件「何も予定が入っていない日のみ」: その日(0:00〜24:00)に少しでも予定があれば候補にしない
    if (options.preference === "freeDayOnly") {
      const wholeDay: TimeSlot = { start: atMinutes(day, 0), end: atMinutes(day, 24 * 60) };
      if (busy.some((slot) => overlaps(slot, wholeDay))) continue;
    }

    const window: TimeSlot = {
      start: atMinutes(day, options.dayStartMinutes),
      end: atMinutes(day, options.dayEndMinutes),
    };

    /** from〜to の空きを15分単位に内側へそろえ、所要時間以上あれば候補にする */
    const addIfLongEnough = (from: Date, to: Date) => {
      const start = Math.ceil(minutesOfDay(day, from) / ROUND_MINUTES) * ROUND_MINUTES;
      const end = Math.floor(minutesOfDay(day, to) / ROUND_MINUTES) * ROUND_MINUTES;
      if (end - start >= options.durationMinutes) {
        slots.push({ start: atMinutes(day, start), end: atMinutes(day, end) });
      }
    };

    // この日の「時刻の範囲」に重なる予定だけを、始まりが早い順に並べる
    const dayBusy = paddedBusy
      .filter((slot) => overlaps(slot, window))
      .sort((x, y) => x.start.getTime() - y.start.getTime());

    // 範囲の始まりから順に、予定と予定のすき間を拾っていく。
    // cursor は「ここまでは埋まっている」位置。予定どうしが重なっていても後戻りしない
    let cursor = window.start;
    for (const slot of dayBusy) {
      if (slot.start > cursor) addIfLongEnough(cursor, slot.start);
      if (slot.end > cursor) cursor = slot.end;
    }
    if (cursor < window.end) addIfLongEnough(cursor, window.end);
  }

  return slots;
}
