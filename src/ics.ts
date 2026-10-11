// カレンダーアプリから書き出した .ics ファイルを読んで、予定の一覧に変換する。
// 対応しているのは単発の予定（VEVENT の DTSTART / DTEND / SUMMARY）だけ。
// 繰り返し予定（RRULE）は最初の1回分しか読まない。

import type { CalendarEvent } from "./types";

/** "20261014T100000Z" / "20261014T100000" / "20261014" を Date にする */
function parseIcsDate(value: string): Date | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0", utc] = m;
  const parts = [Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)] as const;
  // 末尾に Z があれば世界標準時、なければ（TZID 付きも含めて）この端末の時刻として扱う
  return utc ? new Date(Date.UTC(...parts)) : new Date(...parts);
}

/** .ics の文字列で使われるエスケープ（\, や \n）を元に戻す */
function unescapeText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

export function parseIcs(text: string): CalendarEvent[] {
  // 長い行は「改行＋空白」で折り返されているので、まずつなぎ直す
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);

  const events: CalendarEvent[] = [];
  let current: Partial<CalendarEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (!current) continue;

    if (line === "END:VEVENT") {
      const { start } = current;
      if (start) {
        // 終日予定などで DTEND が無いときは1日分とみなす
        const end = current.end ?? new Date(start.getTime() + 24 * 60 * 60_000);
        events.push({
          id: current.id ?? String(events.length),
          title: current.title ?? "（無題）",
          start,
          end,
        });
      }
      current = null;
      continue;
    }

    // "DTSTART;TZID=Asia/Tokyo:20261014T100000" → 名前 "DTSTART"、値 "20261014T100000"
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0];
    const value = line.slice(colon + 1);

    switch (name) {
      case "UID":
        current.id = value;
        break;
      case "SUMMARY":
        current.title = unescapeText(value);
        break;
      case "DTSTART":
        current.start = parseIcsDate(value) ?? undefined;
        break;
      case "DTEND":
        current.end = parseIcsDate(value) ?? undefined;
        break;
    }
  }

  return events;
}
