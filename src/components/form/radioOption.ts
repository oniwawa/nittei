// ラジオボタン付きの選択肢

/**
 * ラジオボタン付きの選択肢1つ（こだわり条件など）。選ばれていないときは文字が灰色になる。
 * label の中に入れた select などを押しても、ラジオは切り替わらない（押した部品の操作が優先される）
 */
export function radioOption(name: string, value: string, label: string, checked: boolean): string {
  return `
    <label class="flex cursor-pointer items-center gap-4">
      <input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""} class="radio peer" />
      <span class="text-hint peer-checked:text-text">${label}</span>
    </label>
  `;
}
