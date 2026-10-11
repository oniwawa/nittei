// 選んだ候補日時から、企業に送るメッセージ文面を組み立てる。

import { formatSlot } from "./format";
import type { TimeSlot } from "./types";

export function buildMessage(slots: TimeSlot[]): string {
  if (slots.length === 0) return "";

  // 元の配列を壊さないよう [...slots] でコピーしてから日時順に並べる
  const sorted = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
  const lines = sorted.map((slot) => `・${formatSlot(slot)}`);

  return [
    "お世話になっております。",
    "カジュアル面談の日程につきまして、下記の日時で調整可能です。",
    "",
    ...lines,
    "",
    "ご検討のほど、よろしくお願いいたします。",
  ].join("\n");
}
