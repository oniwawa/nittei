// 色付きの枠で囲んだパネル（Figma の panel_*）と、その見出し（group_header）

import { HEADING, type Theme } from "../theme";

/** パネルの見出しと説明（Figma の group_header） */
export function panelHeading(theme: Theme, title: string, description: string): string {
  return `
    <div class="flex flex-col gap-2">
      <h3 class="${HEADING} ${theme.text}">${title}</h3>
      <p>${description}</p>
    </div>
  `;
}

/** 色付きの枠で囲んだパネルの外枠（Figma の panel_*）。className で高さの伸ばし方などを足せる */
export function panelFrame(theme: Theme, body: string, className = ""): string {
  return `
    <section class="flex flex-col gap-8 rounded-[15px] border-2 ${theme.frame} bg-white p-4 ${className}">
      ${body}
    </section>
  `;
}

/** 色付きの枠で囲んだパネル（見出し＋説明＋中身） */
export function panel(theme: Theme, title: string, description: string, body: string, className = ""): string {
  return panelFrame(theme, `${panelHeading(theme, title, description)}${body}`, className);
}
