import { scopedLocalStorage } from "@/lib/user-scope";
import type { OnboardingSession } from "./canvas-onboarding-flow";

export const ONBOARDING_IMAGE_SIZE = "1024x1824";
export type OnboardingPresetStory = {
    labelKey: string;
    textKey: string;
    defaultLabel: string;
    defaultText: string;
};

export const ONBOARDING_PRESET_STORIES: readonly OnboardingPresetStory[] = [
    {
        labelKey: "homeShowcase.onboarding.prompt1Label",
        textKey: "homeShowcase.onboarding.prompt1Text",
        defaultLabel: "雨夜街角对峙",
        defaultText: "暴雨倾盆的午夜街头，黑色轿车车门推开，撑黑伞的男人与台阶上的女人在路灯冷光下四目相对，雨水顺着伞骨滴落。",
    },
    {
        labelKey: "homeShowcase.onboarding.prompt2Label",
        textKey: "homeShowcase.onboarding.prompt2Text",
        defaultLabel: "宫殿屏风对弈",
        defaultText: "烛光摇曳的深夜宫殿，红木屏风映出两人对弈剪影，执白子的将军眉头微蹙，微风掀动案头军情密信。",
    },
    {
        labelKey: "homeShowcase.onboarding.prompt3Label",
        textKey: "homeShowcase.onboarding.prompt3Text",
        defaultLabel: "签约会场反转",
        defaultText: "顶层会议室玻璃幕墙前，年轻女主将补充合同推到谈判桌中央，对面董事长脸色骤变，阳光破云洒在签字笔上。",
    },
] as const;

export type OnboardingProgressState = OnboardingSession & {
    version: 2;
    storyIndex?: number;
    updatedAt: number;
};

export function parseOnboardingProgress(raw: string | null): OnboardingProgressState | null {
    if (!raw) return null;
    try {
        const value = JSON.parse(raw);
        if (
            value.version !== 2 ||
            !Number.isInteger(value.step) ||
            value.step < 0 ||
            value.step > 9 ||
            !["active", "paused", "skipped", "completed"].includes(value.status) ||
            !Number.isFinite(value.updatedAt) ||
            (value.storyIndex !== undefined && (!Number.isInteger(value.storyIndex) || value.storyIndex < 0 || value.storyIndex >= ONBOARDING_PRESET_STORIES.length))
        )
            return null;
        return value;
    } catch {
        return null;
    }
}

const progressKey = (projectId: string) => `canvas_onboarding_progress_${projectId}`;

export function getOnboardingProgress(projectId: string): OnboardingProgressState | null {
    if (!projectId || typeof window === "undefined") return null;
    try {
        const raw = scopedLocalStorage.getItem(progressKey(projectId));
        if (!raw) return null;
        return parseOnboardingProgress(raw);
    } catch {
        return null;
    }
}

export function saveOnboardingProgress(projectId: string, progress: OnboardingProgressState): void {
    if (!projectId || typeof window === "undefined") return;
    try {
        scopedLocalStorage.setItem(progressKey(projectId), JSON.stringify(progress));
    } catch {
        // Storage failure ignored
    }
}

export function clearOnboardingProgress(projectId: string): void {
    if (!projectId || typeof window === "undefined") return;
    try {
        scopedLocalStorage.removeItem(progressKey(projectId));
    } catch {
        // Ignored
    }
}
