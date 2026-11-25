import { useEffect } from "react";
import type { AppLocale } from "@/i18n/app-locale";
import { hasMessages, loadMessages, MESSAGE_LOCALES, translateMessage, type MessageKey } from "@/i18n/messages";
import type { CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";

const spring = "demo-reference-1";
const depth = "demo-reference-2";
const keys: Record<string, [MessageKey, MessageKey?]> = {
    node_0y13mm27hc: ["miscPages.springGroup"],
    node_vcv9dcs0mt: ["miscPages.starterNodeStageCopy"],
    node_tqnfg5fesm: ["miscPages.starterNodeStageExportCopy"],
    node_md18cpfzc7: ["miscPages.starterNodeVideo2Copy"],
    node_250069z41a: ["miscPages.springGuide", "miscPages.springSteps"],
    node_8ndd0mgq3b: ["miscPages.springArt", "miscPages.springArtBody"],
    node_s6we9jh8zs: ["miscPages.depthSourceTitle"],
    node_8h6xjcftsf: ["canvasExtra.tool.depthCapture"],
};

function isStarter(id?: string) { return id === spring || id === depth; }

function originalCopy(value: string, key: MessageKey, locale: AppLocale, wrap = false) {
    const text = (lang: AppLocale) => {
        const title = translateMessage(lang, key);
        return wrap ? translateMessage(lang, "miscPages.starterTitleSuffix", { title }) : title;
    };
    const target = text(locale);
    if (value === target) return value;
    return MESSAGE_LOCALES.some(lang => hasMessages(lang) && text(lang) === value) ? target : value;
}

// Older imports saved the translated string without its locale. Compare stock
// values only on these two canvases; user edits always stay in the document.
export function useStarterSourceCatalogs(source: CanvasNodeMetadata["importSource"]) {
    const id = source?.provider === "libtv" ? source.projectUuid : undefined;
    useEffect(() => {
        if (isStarter(id)) void Promise.all(MESSAGE_LOCALES.map(loadMessages)).catch(() => {});
    }, [id]);
}

export function displayedStarterTitle(value: string, id: string, locale: AppLocale) {
    if (!isStarter(id)) return value;
    return originalCopy(value, id === spring ? "miscPages.starterTitleDirector" : "canvasExtra.tool.depthCapture", locale, true);
}

export function displayedStarterNode(node: CanvasNodeData, locale: AppLocale) {
    const source = node.metadata?.importSource;
    if (source?.provider !== "libtv" || !isStarter(source.projectUuid) || !source.nodeKey) return node;
    const pair = keys[source.nodeKey];
    if (!pair) return node;
    const title = source.titleEdited ? node.title : originalCopy(node.title, pair[0], locale);
    const content = node.metadata?.content;
    const translated = content && pair[1] && !node.metadata?.richText ? originalCopy(content, pair[1], locale) : content;
    if (title === node.title && content === translated) return node;
    return { ...node, title, metadata: { ...node.metadata, content: translated } };
}
