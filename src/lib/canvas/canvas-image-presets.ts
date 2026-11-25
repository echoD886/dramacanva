import type { currentLocaleText } from "@/i18n/current-locale-text";

// Stable preset IDs retain user choices across language changes.
export const CANVAS_IMAGE_PRESET_IDS = ["storyboard", "blocking", "pitch", "grid25", "coverage", "light", "before", "after", "four", "three", "face", "product"] as const;

export function canvasImagePresets(t: typeof currentLocaleText) {
    return CANVAS_IMAGE_PRESET_IDS.map((id) => ({
        id: `image-${id}`,
        name: t(`canvasNov21.preset.${id}.name`),
        description: t(`canvasNov21.preset.${id}.prompt`),
        prompt: t(`canvasNov21.preset.${id}.prompt`),
        modes: ["image" as const],
        source: "builtin" as const,
    }));
}
