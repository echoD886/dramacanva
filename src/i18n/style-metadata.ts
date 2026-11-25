import { compileCanvasStylePreset, parseCanvasStyleSelection, type CanvasStylePreset } from "@/lib/canvas/canvas-style-system";
import { translateMessage, type MessageKey } from "./messages";
import type { AppLocale } from "./app-locale";
import type { useI18n } from "./use-i18n";
import { upstreamImageStyle } from "@/lib/canvas/upstream-image-styles";

export type StyleDisplayMetadata = Pick<CanvasStylePreset, "title" | "category" | "description" | "tags">;
const legacyIds = new Set([
    "retro-hong-kong",
    "clay-stop-motion",
    "black-white-noir",
    "comic-pop",
    "storybook-fantasy",
    "surreal-dream",
    "urban-live-action",
    "period-live-action",
    "suspense-noir",
    "chinese-2d",
    "ink-narrative",
    "three-d-cartoon",
    "fantasy-3d",
    "future-tech",
    "cyberpunk-neon",
    "space-opera",
    "nature-healing",
    "real-life-documentary",
]);

function sameMetadata(left: StyleDisplayMetadata, right: StyleDisplayMetadata) {
    return left.title === right.title && left.description === right.description && JSON.stringify(left.tags) === JSON.stringify(right.tags);
}

export function styleDisplayMetadata(preset: CanvasStylePreset, t: ReturnType<typeof useI18n>["t"], locale: AppLocale): StyleDisplayMetadata {
    const original = { title: preset.title, category: preset.category, description: preset.description, tags: [...preset.tags] };
    const imageStyle = upstreamImageStyle(preset.id);
    if (imageStyle && (!preset.profile || preset.profile.source === "builtin") && preset.prompt === imageStyle.prompt && preset.title === imageStyle.title) {
        const title = t(`imageStyle.title.${preset.id}` as MessageKey);
        const category = t(`imageStyle.category.${imageStyle.tag}` as MessageKey);
        return { title, category, description: t("imageStyle.description", { name: title }), tags: [category] };
    }
    if (locale === "zh-CN" || (preset.profile && preset.profile.source !== "builtin")) return original;
    const sourceSelection = preset.selection;
    const selection = sourceSelection ? parseCanvasStyleSelection(`v2-${sourceSelection.world}--${sourceSelection.tone}--${sourceSelection.medium}--${sourceSelection.character}`) : parseCanvasStyleSelection(preset.id);
    if (selection) {
        const canonical = compileCanvasStylePreset(selection);
        if (!sameMetadata(original, canonical)) return original;
        const resolved = canonical.selection!;
        const world = t(`styleMetadata.world.${resolved.world}` as MessageKey);
        const tone = t(`styleMetadata.tone.${resolved.tone}` as MessageKey);
        const medium = t(`styleMetadata.medium.${resolved.medium}` as MessageKey);
        const character = t(`styleMetadata.character.${resolved.character}` as MessageKey);
        return {
            title: `${world} · ${tone} · ${medium}`,
            category: `${world} / ${medium}`,
            description: [t(`styleMetadata.worldDescription.${resolved.world}` as MessageKey), t(`styleMetadata.toneDescription.${resolved.tone}` as MessageKey), t(`styleMetadata.mediumDescription.${resolved.medium}` as MessageKey)].join(" "),
            tags: [world, tone, medium, character],
        };
    }
    if (legacyIds.has(preset.id)) {
        const read = (field: string, translate: ReturnType<typeof useI18n>["t"]) => translate(`styleMetadata.legacy.${preset.id}.${field}` as MessageKey);
        const chinese = (key: MessageKey) => translateMessage("zh-CN", key);
        const canonical = { title: read("title", chinese), category: read("category", chinese), description: read("description", chinese), tags: read("tags", chinese).split("|") };
        if (!sameMetadata(original, canonical)) return original;
        return { title: read("title", t), category: read("category", t), description: read("description", t), tags: read("tags", t).split("|") };
    }
    return original;
}
