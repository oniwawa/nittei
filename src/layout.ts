// ページの骨組み(HTML)を、components/ の部品を組み合わせて作る。
// 見た目は Figma「EasyMeet」の page_interviewScheduler（入力画面）と 出力画面_* に合わせている。
// 部品の名前は Figma のコンポーネント名に合わせている（button_candidate → buttonCandidate など）

import { BUFFER_CHOICES, DURATION_HOUR_CHOICES, MINUTE_CHOICES, WEEKDAY_NAMES } from "./choices";
import { buttonAction, panel, panelFrame, panelHeading } from "./components/common";
import {
  buttonWeekday,
  calendarConnect,
  exclusionList,
  field,
  numberOptions,
  radioOption,
  selectBox,
  timeRange,
} from "./components/form";
import { buttonEditConditions, randomSelect, tabCandidateView } from "./components/result";
import { BLUE, fieldClass, GREEN, HEADING, LABEL } from "./components/theme";

/**
 * 画面全体の外枠（入力画面と日程確定後の画面で共通）。
 * 下の余白（フッターの上の空白）は、Figma の 244px（スマホは 96px）の半分にしている
 */
const PAGE =
  "mx-auto flex w-full max-w-[1075px] flex-col items-center gap-[52px] px-4 pt-16 pb-12 text-base md:pt-[168px] md:pb-[122px]";
/** 結果画面。上に条件の帯を置くので、上の余白は Figma に合わせて小さくする（スマホも PC も 32px） */
const RESULT_PAGE = PAGE.replace("pt-16", "pt-8").replace("md:pt-[168px]", "md:pt-8");

// ---------- 出力画面（Figma の 出力画面_タイムライン表示 / 出力画面_ボタン表示） ----------

/** 「日程候補をまとめて出力」を押した後に表示する画面。最初は hidden で隠しておく */
function resultView(): string {
  return `
    <div id="result-view" hidden>
      <!-- 出力した条件と「条件を編集」ボタン（Figma の panel_conditionSummary）。
           ヘッダーと同じく画面の端から端まで薄い青(panel2)の帯にし、スクロールしても上に残す(sticky)。
           帯を画面の幅いっぱいにするため、幅の決まった main の外（main の上）に置く。
           中身はヘッダーと同じ幅(1075px)・左右の余白(16px)にそろえる。
           中は上から「条件を編集」→ 条件の一覧 → 「表示をたたむ」。
           たたむと section に data-collapsed が付き（main.ts の renderConditionsCollapsed）、条件の一覧だけを隠す -->
      <section id="conditions-bar" aria-label="出力した条件" class="group sticky top-0 z-20 w-full border-b-2 border-frame2 bg-panel2">
        <div class="mx-auto flex max-w-[1075px] flex-col gap-2 px-4 py-3 text-xs">
          <!-- 「条件を編集」: 白い丸いボタンに戻る矢印。左寄せ -->
          ${buttonEditConditions("back-button", "start")}
          <div id="condition-summary-box" class="group-data-collapsed:hidden">
            <!-- 中身は main.ts の renderConditionSummary が作る。lg以上は2列（左の列から縦に埋める）。
                 列の幅は半分ずつではなく中身の幅(max-content)にして、短い内容の右に空きができないようにする -->
            <dl id="condition-summary" class="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-flow-col lg:grid-cols-[repeat(2,max-content)] lg:grid-rows-4"></dl>
          </div>
          <!-- 開け閉めのリンク風ボタン。文字は main.ts が「表示をたたむ」/「選択した条件を表示」に切り替える。
               カーソルを乗せると文字も矢印も濃い紺(sub2)になり、文字に下線が付く（矢印には付けない）。
               矢印は下向きの形(style.css の icon-chevron-down)で、開いているときだけ上下反転(-scale-y-100)して上向きにする -->
          <button id="conditions-toggle" type="button" aria-expanded="true" aria-controls="condition-summary-box"
            class="group/toggle flex cursor-pointer items-center gap-1 self-start font-medium text-sub2 transition-colors hover:text-main2">
            <span id="conditions-toggle-label" class="group-hover/toggle:underline">表示をたたむ</span>
            <span aria-hidden="true" class="icon-chevron-down bg-current -scale-y-100 group-data-collapsed:scale-y-100"></span>
          </button>
        </div>
      </section>

      <main class="${RESULT_PAGE}">
      <section class="flex w-full flex-col gap-8">
        <h2 class="${HEADING} text-sub2">あなたの候補日程一覧</h2>

        ${panel(
          BLUE,
          "候補日",
          `相手に提案したい日時をクリックして選んでください。複数選択ができます。<br />
          <span id="result-summary" class="text-main2"></span>`,
          `<div class="flex flex-col gap-6">
            <!-- ランダム選択は、一覧・タイムラインのどちらの表示でも使えるよう、タブの上の右端に置く -->
            ${randomSelect()}
            <!-- 表示方法の切り替え。選んだ候補は両方で共通（main.ts の showCandidateView） -->
            <div role="tablist" aria-label="候補日の表示方法" class="flex gap-2 border-b-2 border-frame2">
              ${tabCandidateView("buttons", "一覧", "candidate-list", false)}
              ${tabCandidateView("timeline", "タイムライン", "candidate-timeline", true)}
            </div>
            <!-- 一覧の高さはタイムラインと同じにして（main.ts の renderTimeline が style.height を入れる）、はみ出した分は箱の中でスクロールする -->
            <div id="candidate-list" role="tabpanel" aria-labelledby="tab-buttons" hidden class="flex flex-col gap-6 overflow-y-auto px-0 pb-2 md:px-8"></div>
            <!-- 横に日付、縦に時刻のタイムライン。日数が多いときは横にスクロールする -->
            <div id="candidate-timeline" role="tabpanel" aria-labelledby="tab-timeline" class="overflow-x-auto"></div>
          </div>`,
        )}

        ${panel(
          BLUE,
          "コピペ用文章",
          "選んだ候補日が日付の早い順に出力されます。以下のテキストボックスから直接書き換えることも可能です。",
          `<!-- ランダム選択は文章の上の右端に、コピーのボタンは文章のすぐ下に置く -->
          <div class="flex flex-col gap-4">
            ${randomSelect()}
            <textarea id="result-message" rows="8" spellcheck="false" aria-label="出力文"
              class="${fieldClass(BLUE)} w-full resize-y leading-relaxed"></textarea>
            <div class="flex w-full flex-col items-center gap-2">
              ${buttonAction({ id: "copy-button", label: "文章をコピー", variant: "primary", size: "large", className: "w-full" })}
              <span id="copy-status" role="status" class="text-main2"></span>
            </div>
          </div>`,
        )}
      </section>

      <!-- 画面のいちばん下にも「条件を編集」を置く。候補を見終わったあと、上まで戻らずに条件を直せるように。
           上の帯のボタンと同じ部品なので、大きさ・アイコンがそろう。こちらは中央ぞろえ。押すと入力画面に戻る -->
      ${buttonEditConditions("back-button-bottom", "center")}
      </main>
    </div>
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
          にっていじは、Googleカレンダーの「予定が入っている時間帯」の情報を使用し、日程を提出する文章を出力するアプリです。
          「予定が入っている時間帯」の情報はブラウザの中だけで使い、保存されることはありません。また、カレンダーの予定の詳細情報（予定の名前・場所・参加者など）は使用しません。
        </p>
        <nav class="flex flex-wrap gap-6">
          <a href="/privacy.html" class="font-medium text-main2 underline transition-colors hover:text-sub2">プライバシーポリシー</a>
          <a href="/terms.html" class="font-medium text-main2 underline transition-colors hover:text-sub2">利用規約</a>
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
            <!-- 「＋ 条件を追加」で除外ルールのカードを足す。カードごとに日付か曜日かをプルダウンで選ぶ -->
            ${exclusionList("exclusion-list", "add-exclusion")}
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
              `<!-- どの画面幅でも5列のグリッドにして、上段に月～金、下段に土日を並べる。
                   日曜は buttonWeekday の中で order-last にして最後に回す。ボタンはマスいっぱいに広げる。
                   スマホでは間を 8px に詰めて1行に収める。広い画面でボタンが横に伸びすぎないよう、幅は 444px（76px × 5 + 間）まで -->
              <div class="grid w-full max-w-[444px] grid-cols-5 gap-2 md:gap-4">
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
