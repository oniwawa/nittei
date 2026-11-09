// ログイン中の Google アカウントのカレンダーから「予定が入っている時間帯」だけを読み込む。
//
// - ログインは Google 公式の Google Identity Services（GIS）を使う。
//   ポップアップで許可をもらい、1時間だけ使える「アクセストークン」を受け取る。
// - 使う API は freeBusy（空き/埋まりの時間帯だけを返す）。
//   予定のタイトル・場所・参加者などは受け取らない。
// - トークンは変数(メモリ)に置くだけで、localStorage などには保存しない。

import type { TimeSlot } from "./types";

/** Google Cloud で作った OAuth クライアントID。.env.local の VITE_GOOGLE_CLIENT_ID から読む */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** 許可をもらう範囲（スコープ）。どちらも「読むだけ」で、予定の中身は見られない */
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly", // カレンダーの一覧
  "https://www.googleapis.com/auth/calendar.freebusy", // 空き/埋まりの時間帯
];

const API = "https://www.googleapis.com/calendar/v3";

/** freeBusy API に一度に渡せるカレンダーの数の上限 */
const FREEBUSY_MAX_ITEMS = 50;

// ---------- GIS の型（使う分だけ） ----------

interface TokenResponse {
  access_token: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(): void;
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }): TokenClient;
  hasGrantedAllScopes(response: TokenResponse, ...scopes: string[]): boolean;
  revoke(token: string, done?: () => void): void;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
  }
}

// ---------- ログイン ----------

let accessToken: string | null = null;
/** Google カレンダーの画面で表示中（チェックが入っている）カレンダーの ID */
let calendarIds: string[] = [];

/** .env.local にクライアントIDが設定されているか */
export const isConfigured = Boolean(CLIENT_ID);

/** 連携中か（許可をもらっていて、期限が切れていない） */
export function isConnected(): boolean {
  return accessToken !== null;
}

/**
 * GIS のスクリプトを読み込む。ポップアップはクリック直後でないとブロックされるので、
 * クリックされる前（起動時）に読み込んでおく
 */
export function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google のログイン機能を読み込めませんでした"));
    document.head.append(script);
  });
}

/** ポップアップを開いて許可をもらい、アクセストークンを受け取る */
function requestToken(): Promise<string> {
  const oauth2 = window.google?.accounts.oauth2;
  if (!CLIENT_ID) return Promise.reject(new Error("VITE_GOOGLE_CLIENT_ID が設定されていません"));
  if (!oauth2) return Promise.reject(new Error("Google のログイン機能を読み込み中です。少し待ってからもう一度押してください"));

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES.join(" "),
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
        } else if (!oauth2.hasGrantedAllScopes(response, ...SCOPES)) {
          // 許可画面でチェックを外された場合
          reject(new Error("カレンダーへのアクセスが許可されませんでした"));
        } else {
          resolve(response.access_token);
        }
      },
      // ポップアップが閉じられた・ブロックされたとき
      error_callback: (error) => reject(new Error(error.message ?? "ログインが中断されました")),
    });
    client.requestAccessToken();
  });
}

/**
 * Google カレンダーと連携する（必ずボタンのクリックから呼ぶこと。ポップアップのため）。
 * 戻り値は読み込みに使うカレンダーの数
 */
export async function connectGoogle(): Promise<number> {
  accessToken = await requestToken();
  calendarIds = await listSelectedCalendarIds();
  return calendarIds.length;
}

/** 連携を解除する。Google 側の許可も取り消す */
export function disconnectGoogle(): void {
  if (accessToken) window.google?.accounts.oauth2.revoke(accessToken);
  accessToken = null;
  calendarIds = [];
}

// ---------- カレンダー API ----------

async function callApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  if (response.status === 401) {
    accessToken = null; // 期限切れ（1時間）なので、次は許可をもらい直す
    throw new Error("Google の連携が切れました。「Googleカレンダーと連携」をもう一度押してください");
  }
  if (!response.ok) throw new Error(`Google カレンダーの読み込みに失敗しました（${response.status}）`);
  return response.json() as Promise<T>;
}

interface CalendarListEntry {
  id: string;
  /** Google カレンダーの画面でチェックが入っている（表示中）なら true */
  selected?: boolean;
  hidden?: boolean;
}

/** Google カレンダーの画面で表示中になっているカレンダーの ID 一覧 */
async function listSelectedCalendarIds(): Promise<string[]> {
  const list = await callApi<{ items: CalendarListEntry[] }>(
    "/users/me/calendarList?minAccessRole=freeBusyReader&maxResults=250",
  );
  return list.items.filter((c) => c.selected && !c.hidden).map((c) => c.id);
}

interface FreeBusyResponse {
  calendars: Record<string, { busy?: { start: string; end: string }[] }>;
}

/** 重なったりくっついたりしている時間帯を1つにまとめる（複数のカレンダーで同じ時間の予定を二重に数えないため） */
function mergeSlots(slots: TimeSlot[]): TimeSlot[] {
  const sorted = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: TimeSlot[] = [];
  for (const slot of sorted) {
    const last = merged.at(-1);
    if (last && slot.start <= last.end) {
      if (slot.end > last.end) last.end = slot.end;
    } else {
      merged.push({ start: slot.start, end: slot.end });
    }
  }
  return merged;
}

/** 連携中のカレンダーで、timeMin〜timeMax に「予定が入っている時間帯」を返す */
export async function fetchGoogleBusy(timeMin: Date, timeMax: Date): Promise<TimeSlot[]> {
  const busy: TimeSlot[] = [];
  // 一度に渡せる数に上限があるので、50件ずつに分けて問い合わせる
  for (let i = 0; i < calendarIds.length; i += FREEBUSY_MAX_ITEMS) {
    const ids = calendarIds.slice(i, i + FREEBUSY_MAX_ITEMS);
    const result = await callApi<FreeBusyResponse>("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: ids.map((id) => ({ id })),
      }),
    });
    for (const calendar of Object.values(result.calendars)) {
      for (const slot of calendar.busy ?? []) {
        busy.push({ start: new Date(slot.start), end: new Date(slot.end) });
      }
    }
  }
  return mergeSlots(busy);
}
