// 出力画面の部品。
// タブ(tabCandidateView)はページを組み立てるときに HTML の文字列で使う。
// それ以外は計算結果に合わせて何度も作り直すので、main.ts から呼んで要素(HTMLElement)を受け取る。
// 外から来た文字が混ざっても安全なように、文字は innerHTML ではなく textContent で入れる
export { buttonCandidate } from "./buttonCandidate";
export { buttonOtherEvents } from "./buttonOtherEvents";
export { itemCondition } from "./itemCondition";
export { listOtherEvents } from "./listOtherEvents";
export { resizeHint } from "./resizeHint";
export { tabCandidateView } from "./tabCandidateView";
export { timelineCandidate } from "./timelineCandidate";
export { timelineEvent } from "./timelineEvent";
