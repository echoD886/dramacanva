import type { CanvasNodeData } from "@/types/canvas";

const defaultTitlePatterns = [
    /^(?:未命名画布|未命名畫布|untitled canvas)$/i,
    /^自由画布\s*\d+$/i,
    /^自由畫布\s*\d+$/i,
    /^free(?:form)? canvas\s*\d+$/i,
    /^自由キャンバス\s*\d+$/i,
    /^lienzo libre\s*\d+$/i,
    /^자유 캔버스\s*\d+$/i,
    /^(?:canvas|tela) livre\s*\d+$/i,
    /^tela livre\s*\d+$/i,
];

export function isDefaultCanvasTitle(title: string) {
    const normalized = title
        .trim()
        .replace(/[\u00a0\u3000]/g, " ")
        .replace(/\s+/g, " ");
    return defaultTitlePatterns.some((pattern) => pattern.test(normalized));
}

export function canvasTitleSource(project: { title: string; titleSource?: string }) {
    if (project.titleSource === "user") return "user";
    if (project.titleSource === "auto") return "auto";
    return isDefaultCanvasTitle(project.title) ? "auto" : "user";
}

export function firstCanvasTitleCandidate(nodes: CanvasNodeData[]) {
    for (const node of nodes) {
        if (node.type !== "text" && node.type !== "script" && node.type !== "markdown") continue;
        const kind = node.metadata?.workflowKind;
        if (kind && kind !== "story_input" && kind !== "script" && kind !== "storyboard" && kind !== "free") continue;
        const value = node.metadata?.content || node.metadata?.prompt || "";
        if (isCanvasTitleContentCandidate(value)) return value;
    }
    return "";
}

export function isCanvasTitleContentCandidate(value: string) {
    return value.trim().length >= 10 && !/^[^\n]+\.(?:png|jpe?g|webp|gif|mp4|mov|mp3|wav)$/i.test(value.trim());
}

export function heuristicCanvasTitle(value: string) {
    const firstLine = value.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !/^[-*_#>`\s]+$/.test(line)) || "";
    const cleaned = firstLine
        .replace(/^#{1,6}\s*/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(/[`*_~>#]/g, "")
        .replace(/[.,!?;:，。！？；：、"'“”‘’（）()\[\]{}<>]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const limit = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(cleaned) ? 16 : 40;
    return Array.from(cleaned).slice(0, limit).join("").trim();
}
