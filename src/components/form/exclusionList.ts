// 「指定した日程を除外」のカードを並べる場所と「＋ 条件を追加」ボタン

/**
 * カード(exclusionCard)は main.ts の renderExclusions が listId の中に作る。最初はカード無しで、ボタンだけが見える
 */
export function exclusionList(listId: string, addButtonId: string): string {
  return `
    <div class="flex flex-col items-center gap-4">
      <div id="${listId}" class="flex w-full flex-col gap-4 empty:hidden"></div>
      <button id="${addButtonId}" type="button" class="cursor-pointer rounded-[15px] bg-main transition-colors hover:bg-main px-[49px] py-2 text-white shadow-button">
        ＋ 条件を追加
      </button>
    </div>
  `;
}
