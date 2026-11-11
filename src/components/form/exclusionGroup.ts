// チェックボックス付きの除外ルールのまとまり（Figma の group_dateExclusionToggle）

/**
 * チェックボックス付きの除外ルールのまとまり（Figma の group_dateExclusionToggle、チェックは UI_checkBox）。
 * チェックが入ると背景が薄緑になる。data-exclusion-row があると、余白をクリックしてもチェックが切り替わる（main.ts）
 */
export function exclusionGroup(toggleId: string, label: string, listId: string, addButtonId: string): string {
  return `
    <div data-exclusion-row class="flex cursor-pointer flex-col gap-4 rounded-[15px] p-4 md:px-8 md:py-6 has-[.checkbox:checked]:bg-pale hover:bg-pale">
      <label class="flex cursor-pointer items-center gap-4">
        <input id="${toggleId}" type="checkbox" class="checkbox peer" />
        <span class="whitespace-nowrap peer-checked:font-semibold">${label}</span>
      </label>
      <!-- 入力行を並べる場所と「＋ 条件を追加」ボタン。行は main.ts が dateExclusionRow などで作る -->
      <div class="flex flex-col items-center gap-4">
        <div id="${listId}" class="flex flex-col gap-4"></div>
        <button id="${addButtonId}" type="button" class="cursor-pointer rounded-[15px] bg-main transition-colors hover:bg-main px-[49px] py-2 text-white shadow-button disabled:cursor-not-allowed disabled:bg-off">
          ＋ 条件を追加
        </button>
      </div>
    </div>
  `;
}
