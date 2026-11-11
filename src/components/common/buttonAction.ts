// 操作ボタン（Figma の button_action）

/**
 * 操作ボタン（Figma の button_action）。
 * - variant: primary = 紺の塗りつぶし、secondary = 白地に紺の枠
 * - size: large = 画面幅いっぱいの大きいボタン、small = 条件パネルの中の小さいボタン（12px）
 * - className: 幅・高さ・固定(sticky)など、置く場所ごとの指定を足す
 */
export function buttonAction(options: {
  id: string;
  label: string;
  variant: "primary" | "secondary";
  size: "large" | "small";
  className?: string;
}): string {
  const variant =
    options.variant === "primary"
      ? "bg-sub2 text-white hover:bg-blue-950"
      : "border-2 border-sub2 bg-white text-sub2 hover:bg-pale2";
  const size = options.size === "large" ? "rounded-[15px] px-[59px] py-4" : "rounded-[10px] px-3 py-2 text-xs";
  return `
    <button id="${options.id}" type="button"
      class="cursor-pointer font-semibold shadow-button transition-colors ${variant} ${size} ${options.className ?? ""}">
      ${options.label}
    </button>
  `;
}
