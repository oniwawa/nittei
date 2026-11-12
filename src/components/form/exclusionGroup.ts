// 除外ルールの入力欄のまとまり（Figma の group_dateExclusionToggle）

/**
 * 除外ルールの入力行を並べる場所と「＋ 条件を追加」ボタン。行は main.ts が dateExclusionRow などで作る。
 * 「指定した日程を除外」のプルダウン(exclusionModeSelect)で選ばれたほうだけを表示する。
 * mode は data-exclusion-mode に入れ、main.ts の renderExclusionMode が hidden を切り替える。最初は隠しておく
 */
export function exclusionGroup(mode: "date" | "weekday", listId: string, addButtonId: string): string {
  return `
    <div data-exclusion-mode="${mode}" hidden class="flex flex-col items-center gap-4 rounded-[15px] bg-pale p-4 md:px-8 md:py-6">
      <div id="${listId}" class="flex flex-col gap-4"></div>
      <button id="${addButtonId}" type="button" class="cursor-pointer rounded-[15px] bg-main transition-colors hover:bg-main px-[49px] py-2 text-white shadow-button disabled:cursor-not-allowed disabled:bg-off">
        ＋ 条件を追加
      </button>
    </div>
  `;
}
