// 候補日の表示方法を切り替えるタブ（Figma の tab_candidateView）

/** 候補日の表示方法を切り替えるタブ（Figma の tab_candidateView）。選ばれているタブは紺の下線と文字になる */
export function tabCandidateView(view: "buttons" | "timeline", label: string, panelId: string, selected: boolean): string {
  return `
    <button type="button" role="tab" id="tab-${view}" data-view="${view}" aria-controls="${panelId}"
      aria-selected="${selected}" tabindex="${selected ? 0 : -1}"
      class="-mb-0.5 cursor-pointer rounded-t-[5px] border-b-4 border-transparent px-6 py-2 text-hint transition-colors hover:bg-frame2/30 aria-selected:border-sub2 aria-selected:font-semibold aria-selected:text-sub2">
      ${label}
    </button>
  `;
}
