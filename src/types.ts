// アプリ全体で使う「データの形」を定義するファイル。
// interface は「このオブジェクトはこういうプロパティを持つ」という約束事。

/** カレンダー上の1つの予定 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

/** 開始〜終了の時間帯（空き時間の候補など） */
export interface TimeSlot {
  start: Date;
  end: Date;
}

/** 空き時間を探すときの条件 */
export interface SearchOptions {
  /** 何日先まで探すか */
  daysAhead: number;
  /** 面談1回の長さ（分） */
  durationMinutes: number;
  /** 1日の中で候補にしてよい開始時刻（0:00 からの分。8:30 なら 510） */
  dayStartMinutes: number;
  /** 1日の中で候補にしてよい終了時刻（0:00 からの分） */
  dayEndMinutes: number;
  /** 候補から外す曜日（0=日曜 〜 6=土曜） */
  excludedWeekdays: number[];
}

/** 「日付を指定して除外」の1行分 */
export interface DateExclusion {
  /** <input type="date"> の値（"2026-11-11"）。未入力なら空文字 */
  date: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * 繰り返しの頻度。隔週は月曜始まりの週で数える
 * - weekly: 毎週
 * - biweeklyFromThisWeek: 隔週（今週・再来週…）
 * - biweeklyFromNextWeek: 隔週（来週・3週後…）
 */
export type Recurrence = "weekly" | "biweeklyFromThisWeek" | "biweeklyFromNextWeek";

/** 「曜日を指定して除外」の1行分（毎週◯曜日の◯時〜◯時） */
export interface WeekdayExclusion {
  recurrence: Recurrence;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
}
