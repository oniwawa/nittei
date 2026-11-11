// ページの骨組み(HTML)を、components/ の部品を組み合わせて作る。
// 見た目は Figma「EasyMeet」の page_interviewScheduler（入力画面）と 出力画面_* に合わせている。
// 部品の名前は Figma のコンポーネント名に合わせている（button_candidate → buttonCandidate など）

import { BUFFER_CHOICES, DURATION_HOUR_CHOICES, MINUTE_CHOICES, WEEKDAY_NAMES } from "./choices";
import { buttonAction, panel, panelFrame, panelHeading } from "./components/common";
import {
  buttonWeekday,
  calendarConnect,
  exclusionGroup,
  field,
  numberOptions,
  radioOption,
  selectBox,
  timeRange,
} from "./components/form";
import { tabCandidateView } from "./components/result";
import { BLUE, fieldClass, GREEN, HEADING, LABEL } from "./components/theme";

/** 画面全体の外枠（入力画面と日程確定後の画面で共通） */
const PAGE =
  "mx-auto flex w-full max-w-[1075px] flex-col items-center gap-[52px] px-4 pt-16 pb-24 text-base md:pt-[168px] md:pb-[244px]";
/** 結果画面。上に条件のパネルを置くので、md以上の上の余白は Figma に合わせて小さくする */
const RESULT_PAGE = PAGE.replace("md:pt-[168px]", "md:pt-8");

// ---------- 出力画面（Figma の 出力画面_タイムライン表示 / 出力画面_ボタン表示） ----------

/** 「日程候補をまとめて出力」を押した後に表示する画面。最初は hidden で隠しておく */
function resultView(): string {
  return `
    <main id="result-view" hidden class="${RESULT_PAGE}">
      <!-- 出力した条件と「条件を編集」ボタン。画面のいちばん上に置き、スクロールしても上に残す（Figma の section_conditions）。
           md以上: 外側の section を sticky で固定し、白い背景で下を流れる候補日を隠す。
                   上下の py-2 は固定されたときの余白で、-my-2 で固定前の位置がずれないよう打ち消している。
                   中の div が枠付きのパネルになり、左に条件、右にボタンを並べる。
           スマホ: 全部固定すると画面がほぼ埋まるので、「条件を編集」ボタンだけ固定する。
                   sticky は親の箱の中でしか効かないので、外側の section と中の div を contents にして
                   ボタンを main の直接の子として扱い、main の中で固定させる。枠は条件の箱のほうに付ける -->
      <section aria-label="出力した条件" class="contents text-xs md:sticky md:top-0 md:z-20 md:-my-2 md:block md:w-full md:bg-white md:py-2">
        <div class="contents md:flex md:items-center md:justify-between md:gap-3 md:rounded-[10px] md:border-2 md:border-frame2 md:bg-white md:px-3 md:py-2">
          <div class="w-full rounded-[10px] border-2 border-frame2 bg-white px-3 py-2 text-xs md:w-auto md:min-w-0 md:flex-1 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            <!-- 中身は main.ts の renderConditionSummary が作る。lg以上は2列（左の列から縦に埋める）。
                 列の幅は半分ずつではなく中身の幅(max-content)にして、短い内容の右に空きができないようにする -->
            <dl id="condition-summary" class="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-flow-col lg:grid-cols-[repeat(2,max-content)] lg:grid-rows-4"></dl>
          </div>
          <!-- スマホでは main の gap(52px) が効くので、-mt-10 で 12px にそろえる -->
          ${buttonAction({
            id: "back-button",
            label: "条件を編集",
            variant: "secondary",
            size: "small",
            className: "sticky top-2 z-20 -mt-10 w-full md:static md:mt-0 md:w-auto md:shrink-0",
          })}
        </div>
      </section>
      <section class="flex w-full flex-col gap-8">
        <h2 class="${HEADING} text-sub2">提案する日程の候補</h2>

        ${panel(
          BLUE,
          "候補日",
          `相手に提案したい日時をクリックして選んでください。<strong class="font-semibold text-sub2">いくつでも選べます</strong><br />
          <span id="result-summary" class="text-main2"></span>`,
          `<div class="flex flex-col gap-6">
            <!-- 表示方法の切り替え。選んだ候補は両方で共通（main.ts の showCandidateView） -->
            <div role="tablist" aria-label="候補日の表示方法" class="flex gap-2 border-b-2 border-frame2">
              ${tabCandidateView("buttons", "ボタン", "candidate-list", false)}
              ${tabCandidateView("timeline", "タイムライン", "candidate-timeline", true)}
            </div>
            <div id="candidate-list" role="tabpanel" aria-labelledby="tab-buttons" hidden class="flex flex-col gap-6 px-0 md:px-8"></div>
            <!-- 横に日付、縦に時刻のタイムライン。日数が多いときは横にスクロールする -->
            <div id="candidate-timeline" role="tabpanel" aria-labelledby="tab-timeline" class="overflow-x-auto"></div>
          </div>`,
        )}

        ${panel(
          BLUE,
          "出力文",
          "選んだ候補日が「出力文章の形式」で並びます。コピーする前に書き換えることもできます",
          `<!-- コピーのボタンは出力文の枠の中、文章のすぐ下に置く -->
          <div class="flex flex-col gap-4">
            <textarea id="result-message" rows="8" spellcheck="false" aria-label="出力文"
              class="${fieldClass(BLUE)} w-full resize-y leading-relaxed"></textarea>
            <div class="flex w-full flex-col items-center gap-2">
              ${buttonAction({ id: "copy-button", label: "文章をコピー", variant: "primary", size: "large", className: "w-full" })}
              <span id="copy-status" role="status" class="text-main2"></span>
            </div>
          </div>`,
        )}
      </section>

    </main>
  `;
}

// ---------- ページ全体 ----------

/** 全ページ共通の上の帯。アプリ名と一言の説明（Google の審査でも、トップページにアプリの説明が求められる） */
function siteHeader(): string {
  return `
    <header class="border-b-2 border-frame2 bg-white">
      <div class="mx-auto flex max-w-[1075px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4">
        <h1 class="text-2xl font-semibold text-sub2">にっていじ</h1>
        <!-- キャッチコピー（index.html の title と同じ言葉）と、何をするアプリかの一言 -->
        <p class="font-bold text-sub2 ">「複数日程ご提示ください」<span class="font-medium">をカンタンに</span></p>
    
      </div>
    </header>
  `;
}

/** 全ページ共通の下の帯。Google のデータの扱いの説明と、ポリシーへのリンク（審査で必要） */
function siteFooter(): string {
  return `
    <footer class="border-t-2 border-frame2 bg-white">
      <div class="mx-auto flex max-w-[1075px] flex-col gap-3 px-4 py-6 text-sm">
        <p>
          にっていじは、Googleカレンダーの「予定が入っている時間帯」だけを読み込み、相手に提案する複数の日程候補をまとめて作るアプリです。
          予定の名前・場所・参加者などは読み込まず、読み込んだ情報はブラウザの中だけで使い、保存しません。
        </p>
        <nav class="flex flex-wrap gap-6">
          <a href="/privacy.html" class="text-sub2 underline hover:text-blue-950">プライバシーポリシー</a>
          <a href="/terms.html" class="text-sub2 underline hover:text-blue-950">利用規約</a>
        </nav>
        <p class="text-hint">© 2026 にっていじ</p>
      </div>
    </footer>
  `;
}

export function renderLayout(root: HTMLElement): void {
  root.innerHTML = `
    ${siteHeader()}

    <main id="form-view" class="${PAGE}">

      <!-- PC(lg以上)では「私のスケジュール」と「提案するスケジュール」を左右に並べる。
           grid の子は同じ高さに伸びるので、中のパネルを flex-1 で伸ばして下端をそろえる -->
      <div class="grid w-full grid-cols-1 gap-[52px] lg:grid-cols-2 lg:gap-8">
      <section class="flex min-w-0 flex-col gap-8">
        <h2 class="${HEADING} text-sub">私のスケジュール</h2>

        ${panelFrame(
          GREEN,
          `${calendarConnect()}
          ${panelHeading(
            GREEN,
            "＋指定した日程を除外",
            "カレンダーの予定に加えて予定が入りそうな曜日や日にちを候補から除くことができます",
          )}
          <div class="flex flex-col gap-4">
            ${exclusionGroup("date-exclusion-toggle", "日付を指定して除外", "date-exclusion-list", "add-date-exclusion")}
            ${exclusionGroup("weekday-exclusion-toggle", "曜日を指定して除外", "weekday-exclusion-list", "add-weekday-exclusion")}
          </div>`,
          "flex-1",
        )}
      </section>

      <section class="flex min-w-0 flex-col gap-8">
        <h2 class="${HEADING} text-sub2">提案するスケジュール</h2>

        ${panel(
          BLUE,
          "日程の条件",
          "これから提示する日程の条件を入力します",
          `<div class="flex flex-col gap-8 px-0 md:px-8">
            ${field(
              BLUE,
              "曜日",
              `<!-- 2カラム(lg以上)では5列のグリッドにして、上段に月～金、下段に土日を並べる。
                   日曜は buttonWeekday の中で order-last にして最後に回す。列の幅に収まるようボタンはマスいっぱいに広げる -->
              <div class="flex flex-wrap gap-4 lg:grid lg:grid-cols-5">
                ${WEEKDAY_NAMES.map((_, i) => buttonWeekday(i)).join("")}
              </div>`,
            )}
            ${field(BLUE, "時刻の範囲", timeRange(BLUE, `id="day-start"`, `id="day-end"`, 8 * 60, 16 * 60))}
            ${field(
              BLUE,
              "所要時間",
              `<div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  ${selectBox(
                    BLUE,
                    `id="duration-hours"`,
                    DURATION_HOUR_CHOICES.map((h) => `<option value="${h}" ${h === 1 ? "selected" : ""}>${h}</option>`).join(""),
                    false,
                  )}
                  時間
                </label>
                <label class="flex items-center gap-2">
                  ${selectBox(BLUE, `id="duration-minutes"`, numberOptions(MINUTE_CHOICES, 0), false)}
                  分
                </label>
              </div>`,
            )}
            ${field(
              BLUE,
              "提案する期間",
              `<div class="flex flex-col gap-4">
                <!-- 期間を指定する: 開始日から〇週間。選ばれていないときは入力欄を灰色にする（main.ts の renderPeriod） -->
                <!-- 日付欄は 160〜262px の間で伸び縮みする。幅が足りれば「から〇週間」まで1行に収め、
                     足りないときだけ「から〇週間」を次の行へ送る -->
                <div class="flex flex-wrap items-center gap-4">
                  <input id="period-range" type="radio" name="period" value="range" checked aria-label="期間を指定する" class="radio" />
                  <input id="period-start" type="date" aria-label="開始日" class="${fieldClass(BLUE)} min-w-[160px] max-w-[262px] flex-1 cursor-pointer text-center" />
                  <label class="flex items-center gap-2">
                    から
                    <input id="period-weeks" type="number" min="1" max="8" value="1" aria-label="週間" class="${fieldClass(BLUE)} w-[72px] text-right" />
                    週間
                  </label>
                </div>
                <label class="flex cursor-pointer items-center gap-4">
                  <input id="period-none" type="radio" name="period" value="none" class="radio peer" />
                  <span class="text-hint peer-checked:text-text">期間を指定しない</span>
                </label>
              </div>`,
            )}
            ${field(
              BLUE,
              "こだわり条件",
              `<div class="flex flex-col gap-4">
                ${radioOption("preference", "none", "指定しない", true)}
                ${radioOption("preference", "freeDayOnly", "何も予定が入っていない日のみを提案", false)}
                <!-- 余裕の時間は「予定の前後に余裕」を選んだときだけ選べる（main.ts の renderPreference） -->
                <!-- 文章の中にプルダウンを置き、入りきらないときだけ続きの文字を次の行へ流す。
                     keep-all で単語の途中では折り返さず、空白か <wbr> の位置でだけ改行する -->
                ${radioOption(
                  "preference",
                  "buffer",
                  `<span class="break-keep">予定の<wbr>前後に
                  <span class="mx-1 inline-flex align-middle">${selectBox(
                    BLUE,
                    `id="buffer-minutes" aria-label="余裕の時間"`,
                    BUFFER_CHOICES.map(
                      (m) => `<option value="${m}" ${m === 60 ? "selected" : ""}>${m / 60}</option>`,
                    ).join(""),
                    true,
                  )}</span>
                  時間の<wbr>余裕を<wbr>持たせて<wbr>提案</span>`,
                  false,
                )}
              </div>`,
            )}
          </div>`,
          "flex-1",
        )}
      </section>
      </div>

      <section class="w-full">
        ${panel(
          BLUE,
          "出力文章の形式",
          `{}が入力された箇所に月、日付、曜日、時間、分の順番で出力されます<br />
          <span class="text-main2">例：{}/{} ({}) {}時{}分～{}時{}分　→　11/11(月)  9時00分～18時00分</span>`,
          `<div class="flex flex-col gap-4">
            <h4 class="${LABEL} text-sub2">出力文章の形式を入力</h4>
            <!-- {} だけ色を変えるため、透明な文字の textarea の下に色付きの同じ文字を重ねている -->
            <div class="relative rounded-[5px] transition-colors hover:bg-frame2/30">
              <div id="template-highlight" aria-hidden="true"
                class="pointer-events-none absolute inset-0 overflow-hidden border-2 border-transparent px-4 py-2 break-words whitespace-pre-wrap"></div>
              <textarea id="output-template" spellcheck="false"
                class="relative block h-[103px] w-full resize-none rounded-[5px] border-2 border-main2 bg-transparent px-4 py-2 text-transparent caret-text">{}/{} ({}) {}時{}分～{}時{}分</textarea>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            <h4 class="${LABEL} text-sub2">出力デモ</h4>
            <p id="output-demo" class="whitespace-pre-wrap"></p>
          </div>`,
        )}
      </section>

      <!-- Figma の button_exportSchedule -->
      ${buttonAction({ id: "export-button", label: "日程候補をまとめて出力", variant: "primary", size: "large", className: "h-[85px] w-full" })}
    </main>

    ${resultView()}

    ${siteFooter()}

    <!-- 画面上部に数秒だけ出る通知（main.ts の showToast） -->
    <div id="toast" role="alert" hidden
      class="fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-[15px] bg-error px-6 py-3 font-semibold text-white shadow-button"></div>
  `;
}
