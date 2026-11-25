import { currentLocaleText } from "@/i18n/current-locale-text";
import { canvasImagePresets } from "@/lib/canvas/canvas-image-presets";
import type { CanvasGenerationMode } from "@/types/canvas";
import type { SrtEntry } from "@/types/timeline";

export type CanvasPromptPreset = {
    id: string;
    name: string;
    description: string;
    prompt: string;
    modes: CanvasGenerationMode[];
    source: "builtin" | "skill";
};

// Resolve labels when the picker renders, so switching languages updates open menus.
export function canvasBuiltinPresets(t: typeof currentLocaleText): CanvasPromptPreset[] {
    return [
        {
            id: "character-sheet",
            name: t("canvasExtra.preset.characterSheet.name"),
            description: t("canvasExtra.preset.characterSheet.description"),
            prompt: t("canvasExtra.preset.characterSheet.prompt"),
            modes: ["image"],
            source: "builtin",
        },
        {
            id: "multi-angle",
            name: t("canvasExtra.preset.multiAngle.name"),
            description: t("canvasExtra.preset.multiAngle.description"),
            prompt: t("canvasExtra.preset.multiAngle.prompt"),
            modes: ["image", "video"],
            source: "builtin",
        },
        {
            id: "next-shot",
            name: t("canvasExtra.preset.nextShot.name"),
            description: t("canvasExtra.preset.nextShot.description"),
            prompt: t("canvasExtra.preset.nextShot.prompt"),
            modes: ["image", "video"],
            source: "builtin",
        },
        {
            id: "story-beats",
            name: t("canvasExtra.preset.storyBeats.name"),
            description: t("canvasExtra.preset.storyBeats.description"),
            prompt: t("canvasExtra.preset.storyBeats.prompt"),
            modes: ["text", "image", "video"],
            source: "builtin",
        },
        {
            id: "cinematic-light",
            name: t("canvasExtra.preset.cinematicLight.name"),
            description: t("canvasExtra.preset.cinematicLight.description"),
            prompt: t("canvasExtra.preset.cinematicLight.prompt"),
            modes: ["image", "video"],
            source: "builtin",
        },
        {
            id: "video-prompt",
            name: t("canvasExtra.preset.videoPrompt.name"),
            description: t("canvasExtra.preset.videoPrompt.description"),
            prompt: t("canvasExtra.preset.videoPrompt.prompt"),
            modes: ["text", "video"],
            source: "builtin",
        },
        ...canvasImagePresets(t),
    ];
}

export function workflowStarterPrompt(kind: "character_cards" | "character_three_view" | "storyboard_video", title: string, workflowTitle: string) {
    if (kind === "character_cards") return currentLocaleText("canvasExtra.workflow.characterCardsPrompt", { workflowTitle });
    if (kind === "character_three_view") return currentLocaleText("canvasExtra.workflow.characterThreeViewPrompt", { title });
    return currentLocaleText("canvasExtra.workflow.storyboardVideoPrompt", { workflowTitle });
}

export function buildTextRewritePrompt(sourceText: string, instruction: string) {
    return `请根据要求修改以下文本。\n\n原文：\n${sourceText}\n\n修改要求：\n${instruction}`;
}

export function buildVideoOperationPrompt(operation: string, prompt: string, operationLabel: string) {
    if (operation === "compare_versions") return `请对以下视频结果版本做对比分析，输出推荐版本、差异点和修改建议：\n${prompt}`;
    return `视频编辑任务：${operationLabel}\n创作要求：${prompt}`;
}

export function buildSubtitleHighlightSystemPrompt() {
    return `你是一个视频字幕关键词高亮助手。请输出严格 JSON。

任务目标：
- 为每条字幕判断是否需要高亮
- 每条字幕最多高亮 1 段
- 只返回最值得高亮的一个关键词或短语
- start 和 end 使用 JavaScript 字符串下标
- end 为 exclusive
- 没有明确重点时返回 shouldHighlight=false

高亮标准：
- 优先高亮结论词、数字、身份词、首次/突破词、强反差词
- 不要高亮虚词、口头语、整句长短语

边界约束：
- 不负责颜色、字号、位置、动效
- 只返回 highlights 数组
- highlightText 必须严格等于原字幕文本切片结果`;
}

export function buildSubtitleHighlightUserMessage(entries: SrtEntry[]) {
    const lines = entries.map((entry) => {
        return `entryIndex=${entry.index} | startMs=${entry.startMs} | endMs=${entry.endMs} | text=${entry.text}`;
    });
    return `请根据以下字幕和上下文，为每条字幕判断是否需要高亮，并返回 JSON：

{
  "highlights": [
    {
      "entryIndex": 1,
      "shouldHighlight": true,
      "highlightText": "示例",
      "start": 0,
      "end": 2
    }
  ]
}

字幕列表：
${lines.join("\n")}`;
}
