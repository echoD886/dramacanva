import type { AppLocale } from "@/i18n/app-locale";
import { localizedCanvasNodeTitle } from "@/i18n/canvas-node-label";
import { translateMessage, type MessageKey } from "@/i18n/messages";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

const nodeNames: Record<string, { source: string; key: MessageKey }> = {
    [CanvasNodeType.Image]: { source: "图片", key: "canvasLibrary.importName.image" },
    [CanvasNodeType.Video]: { source: "视频", key: "canvasLibrary.importName.video" },
    [CanvasNodeType.Audio]: { source: "音频", key: "canvasLibrary.importName.audio" },
    [CanvasNodeType.Text]: { source: "文本", key: "canvasLibrary.importName.text" },
    [CanvasNodeType.Script]: { source: "脚本", key: "canvasLibrary.importName.script" },
    [CanvasNodeType.Frame]: { source: "分组", key: "canvasLibrary.importName.group" },
};

export function importedNodeTitle(type: string, original: string, locale: AppLocale): string {
    const name = nodeNames[type];
    if (!name) return original;
    const label = translateMessage(locale, name.key);
    if (!original || original === `LibTV ${name.source}`) return `LibTV ${label}`;
    const copy = original.match(/^(.*?)\s*-\s*副本((?:\s*\(\d+\))*)$/);
    const base = copy ? copy[1].trim() : original;
    const numbered = base.match(new RegExp(`^${name.source}(?:节点)?(\\s*\\d*)$`));
    const date = base.match(/^(\d{1,2})月(\d{1,2})日((?:\s*\(\d+\))*)$/);
    let localized = base;
    if (base === `LibTV ${name.source}`) localized = `LibTV ${label}`;
    else if (numbered) localized = `${label}${numbered[1]}`;
    else if (date) {
        const month = Number(date[1]), day = Number(date[2]);
        const value = new Date(Date.UTC(2000, month - 1, day));
        if (value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return original;
        localized = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(value) + date[3];
    } else return original; // Source-authored names are content, not UI labels.
    return copy ? translateMessage(locale, "canvasLibrary.importName.copy", { title: localized }) + copy[2] : localized;
}

export function displayedImportedNodeTitle(node: Pick<CanvasNodeData, "type" | "title" | "metadata">, locale: AppLocale) {
    const source = node.metadata?.importSource;
    if (source?.provider !== "libtv") return localizedCanvasNodeTitle(node, (key, values) => translateMessage(locale, key, values));
    if (source.titleEdited || (source.generatedTitle !== undefined && source.generatedTitle !== node.title)) return node.title;
    return importedNodeTitle(node.type, source.originalTitle ?? node.title, locale);
}
