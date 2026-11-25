import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import type { MessageKey, MessageValues } from "./messages";
import { localizedCanvasNodeTitle } from "./canvas-node-label";

const numberedReferenceKeys = {
    图片: "resourceMention.numberedImage",
    视频: "resourceMention.numberedVideo",
    音频: "resourceMention.numberedAudio",
    文本: "resourceMention.numberedText",
    绘图: "resourceMention.numberedDrawing",
    角色: "resourceMention.numberedCharacter",
    技能: "resourceMention.numberedSkill",
} as const satisfies Record<string, MessageKey>;

/** Translate only the display label; serialized @ mentions remain stable across locale changes. */
export function localizedCanvasReferenceLabel(
    reference: Pick<CanvasResourceReference, "label" | "assetId">,
    t: (key: MessageKey, values?: MessageValues) => string,
) {
    if (reference.assetId) return reference.label;
    const extra = /^(分镜脚本|画风)(\d+)$/u.exec(reference.label);
    if (extra) return `${t(extra[1] === "画风" ? "projectLabels.category.style" : "nodeInfo.script")}${extra[2]}`;
    const match = /^(图片|视频|音频|文本|绘图|角色|技能)(\d+)$/u.exec(reference.label);
    if (!match) return reference.label;
    const key = numberedReferenceKeys[match[1] as keyof typeof numberedReferenceKeys];
    return t(key, { index: Number(match[2]) });
}

export function localizedCanvasReferenceTitle(reference: CanvasResourceReference, t: (key: MessageKey, values?: MessageValues) => string) {
    if (reference.assetId || reference.kind === "skill" || reference.titleEdited) return reference.title || reference.label;
    if (!reference.title || reference.title === reference.label) return localizedCanvasReferenceLabel(reference, t);
    return localizedCanvasNodeTitle({ type: reference.sourceType || reference.kind, title: reference.title, metadata: { defaultTitle: reference.defaultTitle, titleEdited: reference.titleEdited } }, t);
}

/** For read-only previews only: never write this localized text back to a prompt. */
export function localizedCanvasMentionText(
    value: string,
    t: (key: MessageKey, values?: MessageValues) => string,
) {
    return value.replace(/@(图片|视频|音频|文本|绘图|角色|技能|分镜脚本|画风)(\d+)(?!\d)/gu, (_token, kind: string, index: string) =>
        `@${localizedCanvasReferenceLabel({ label: kind + index }, t)}`,
    );
}
