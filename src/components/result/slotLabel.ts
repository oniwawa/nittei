// 候補の時刻の表示（"08:00〜10:00"）。buttonCandidate と timelineCandidate で使う

import { formatTime } from "../../format";
import type { TimeSlot } from "../../types";

/** 候補と時刻の表示（"08:00〜10:00"） */
export function slotLabel(slot: TimeSlot): string {
  return `${formatTime(slot.start)}〜${formatTime(slot.end)}`;
}
