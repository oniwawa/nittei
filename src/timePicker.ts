// 「08:00 ~ 16:00」の時刻選択の動き。
// 開始・終了とも「時」「分」のプルダウン2つでできている（layout.ts の timeSelect）。
// 開始時刻を変えると、終了時刻も同じ長さを保ったまま一緒にずれる。

/** 何分刻みで選べるか（layout.ts の MINUTE_CHOICES と合わせる） */
const STEP_MINUTES = 15;
/** 選べる一番遅い時刻（23:45） */
const LATEST_MINUTES = 24 * 60 - STEP_MINUTES;

function hourSelect(element: HTMLElement): HTMLSelectElement | null {
  return element.querySelector<HTMLSelectElement>("[data-part=hour]");
}

function minuteSelect(element: HTMLElement): HTMLSelectElement | null {
  return element.querySelector<HTMLSelectElement>("[data-part=minute]");
}

/** 時・分のプルダウンを囲む要素から、0:00 からの分を読む */
export function readTime(element: HTMLElement): number {
  return Number(hourSelect(element)?.value) * 60 + Number(minuteSelect(element)?.value);
}

/** 時・分のプルダウンに値を入れ、main.ts に伝わるよう change イベントを発生させる */
function writeTime(element: HTMLElement, minutes: number): void {
  const hour = hourSelect(element);
  const minute = minuteSelect(element);
  if (!hour || !minute) return;
  hour.value = String(Math.floor(minutes / 60));
  minute.value = String(minutes % 60);
  // main.ts は親要素で change をまとめて受け取っているので、bubbles で親まで届ける
  minute.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * 開始時刻が変わったら、それまでの長さを保ったまま終了時刻もずらす。
 * 「それまでの長さ」を出すため、変更前の開始時刻を data-minutes に覚えておく
 */
function onStartChange(start: HTMLElement): void {
  const end = start.closest("[data-time-range]")?.querySelector<HTMLElement>("[data-time-end]");
  const previous = Number(start.dataset.minutes);
  const current = readTime(start);
  start.dataset.minutes = String(current);
  if (!end) return;
  const duration = Math.max(readTime(end) - previous, STEP_MINUTES);
  const newEnd = Math.min(current + duration, LATEST_MINUTES); // 23:45 を超える分は切り詰める
  if (newEnd !== readTime(end)) writeTime(end, newEnd);
}

/** root の中の時刻選択を使えるようにする。起動時に1回だけ呼ぶ */
export function setUpTimePickers(root: HTMLElement): void {
  root.addEventListener("change", (event) => {
    const start = (event.target as HTMLElement).closest<HTMLElement>("[data-time-start]");
    if (start) onStartChange(start);
  });
}
