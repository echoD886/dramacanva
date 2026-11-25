import source from "./catalog.json";
import { catalogNames } from "./catalog-names";
import { presetDirections } from "./preset-directions";
import { productionText, productionTraditionalText } from "@/i18n/production-tools";

export type ProductionTool = { key: string; kind: "image" | "video"; categoryId: string; name: string; focus: string; inputOne: string; inputTwo: string };
export const productionTools = source as ProductionTool[];
export const productionToolRequiresMedia = (tool: ProductionTool) => Boolean(tool.inputOne && !/文字|描述|剧本|脚本/.test(tool.inputOne));
export function productionToolHasRequiredReference(tool: ProductionTool, kinds: string[]) {
    if (!productionToolRequiresMedia(tool)) return true;
    const kind = /视频/.test(tool.inputOne) && !/帧/.test(tool.inputOne) ? "video" : /音频/.test(tool.inputOne) ? "audio" : "image";
    return kinds.includes(kind);
}
export function productionToolName(tool: ProductionTool, locale: string) {
    if (locale === "zh-CN") return tool.name;
    if (locale === "zh-TW" || locale === "zh-HK") return productionTraditionalText(tool.name, locale);
    const names = catalogNames[locale as keyof typeof catalogNames] || catalogNames["en-US"];
    return names[productionTools.findIndex((item) => item.key === tool.key)] || catalogNames["en-US"][productionTools.findIndex((item) => item.key === tool.key)];
}
export function productionToolPrompt(tool: ProductionTool, locale: string, preset: number) {
    const title = productionToolName(tool, locale);
    const focus = locale.startsWith("zh") ? (locale === "zh-CN" ? tool.focus : productionTraditionalText(tool.focus, locale as "zh-HK" | "zh-TW")) : title;
    const directions = (presetDirections[locale.startsWith("zh") ? "zh-CN" : locale] || presetDirections["en-US"])[Math.max(0, Math.min(2, preset))];
    const localizedDirections = locale === "zh-TW" || locale === "zh-HK" ? productionTraditionalText(directions, locale) : directions;
    return [title, focus === title ? "" : focus, productionText(locale, 31), tool.kind === "video" ? productionText(locale, 32) : "", localizedDirections].filter(Boolean).join("\n\n");
}
