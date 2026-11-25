import { create } from "zustand";

import type { PublicAppearance } from "@/services/api/appearance";
import { DEFAULT_CLASSIC_SKIN, normalizeSkinDefinition } from "@/lib/skin-themes";
import { HOME_TITLE, HOME_DESCRIPTION, SITE_NAME } from "@/lib/site-identity";

// Historical appearance values resolve to the current public identity.
const LEGACY_BRAND_NAMES = ["I Say Action", "Say Action", "SayAction", "Say Action Studio", "DramaCanva"];

export const DEFAULT_PUBLIC_APPEARANCE: PublicAppearance = {
    schemaVersion: 6,
    brandName: SITE_NAME,
    brandSlug: "isayaction",
    authHeroTitle: "让一个故事，\n从文字走向银幕。",
    authHeroDescription: "",
    // 128px copies of the 512px marks (displayed at 24–48px); the PNG originals stay for OG/share images.
    logoUrl: "/brand/logo.png",
    darkLogoUrl: "/brand/logo.png",
    logoFrameEnabled: true,
    authVideoUrl: "",
    authVideoPosterUrl: "",
    skinId: "classic",
    activeSkin: DEFAULT_CLASSIC_SKIN,
    seoTitle: HOME_TITLE,
    seoDescription: HOME_DESCRIPTION,
    seoKeywords: "",
    footerCopyright: `© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.`,
    icpFilingEnabled: false,
    icpFilingNumber: "",
    logoConfigured: false,
    darkLogoConfigured: false,
    authVideoConfigured: false,
    authVideoPosterConfigured: false,
    configured: false,
    revision: "builtin",
};

type AppearanceStore = {
    appearance: PublicAppearance;
    resolved: boolean;
    setAppearance: (appearance: PublicAppearance) => void;
};

export const useAppearanceStore = create<AppearanceStore>((set) => ({
    appearance: DEFAULT_PUBLIC_APPEARANCE,
    resolved: false,
    setAppearance: (appearance) => set({ appearance, resolved: true }),
}));

export function normalizePublicAppearance(value?: Partial<PublicAppearance> | null): PublicAppearance {
    const brandName = String(value?.brandName || "").trim();
    const brandSlug = normalizeBrandSlug(value?.brandSlug);
    const authHeroTitle = normalizeAppearanceCopy(value?.authHeroTitle, DEFAULT_PUBLIC_APPEARANCE.authHeroTitle);
    const authHeroDescription = normalizeAppearanceCopy(value?.authHeroDescription, DEFAULT_PUBLIC_APPEARANCE.authHeroDescription, true);
    const customVideo = Boolean(value?.authVideoConfigured);
    const logoUrl = safeAppearanceURL(value?.logoUrl, DEFAULT_PUBLIC_APPEARANCE.logoUrl);
    const darkLogoUrl = safeAppearanceURL(value?.darkLogoUrl, logoUrl);
    const resolvedBrandName = !brandName || brandName === "影策" || LEGACY_BRAND_NAMES.includes(brandName) ? DEFAULT_PUBLIC_APPEARANCE.brandName : brandName;
    const seoTitle = normalizeAppearanceCopy(value?.seoTitle, resolvedBrandName);
    const seoDescription = normalizeAppearanceCopy(value?.seoDescription, `${resolvedBrandName}，面向 AI 影视与短剧创作的工作台。`, true);
    const seoKeywords = normalizeAppearanceCopy(value?.seoKeywords, "", true);
    const footerCopyright = normalizeAppearanceCopy(value?.footerCopyright, `© ${new Date().getFullYear()} ${resolvedBrandName}. All rights reserved.`);
    const icpFilingNumber = normalizeAppearanceCopy(value?.icpFilingNumber, "", true);
    return {
        ...DEFAULT_PUBLIC_APPEARANCE,
        ...value,
        schemaVersion: 6,
        brandName: resolvedBrandName,
        brandSlug,
        authHeroTitle,
        authHeroDescription,
        logoUrl,
        darkLogoUrl,
        logoFrameEnabled: value?.logoFrameEnabled !== false,
        authVideoUrl: safeAppearanceURL(value?.authVideoUrl, DEFAULT_PUBLIC_APPEARANCE.authVideoUrl),
        authVideoPosterUrl: safeAppearanceURL(value?.authVideoPosterUrl, customVideo ? "" : DEFAULT_PUBLIC_APPEARANCE.authVideoPosterUrl),
        skinId: normalizeSkinDefinition(value?.activeSkin).id,
        activeSkin: normalizeSkinDefinition(value?.activeSkin),
        seoTitle,
        seoDescription,
        seoKeywords,
        footerCopyright,
        icpFilingEnabled: Boolean(value?.icpFilingEnabled && icpFilingNumber),
        icpFilingNumber,
        logoConfigured: Boolean(value?.logoConfigured),
        darkLogoConfigured: Boolean(value?.darkLogoConfigured),
        authVideoConfigured: customVideo,
        authVideoPosterConfigured: Boolean(value?.authVideoPosterConfigured),
        configured: Boolean(value?.configured),
        revision: String(value?.revision || DEFAULT_PUBLIC_APPEARANCE.revision),
    };
}

function normalizeAppearanceCopy(value: unknown, fallback: string, allowEmpty = false) {
    if (typeof value !== "string") return fallback;
    const normalized = value.replace(/\r\n?/g, "\n").trim();
    return normalized || (allowEmpty ? "" : fallback);
}

export function appearanceLogoURL(appearance: PublicAppearance, theme: "light" | "dark") {
    if (theme === "dark" && appearance.darkLogoConfigured && appearance.darkLogoUrl) return appearance.darkLogoUrl;
    if (!appearance.logoConfigured) return theme === "dark" ? DEFAULT_PUBLIC_APPEARANCE.darkLogoUrl : DEFAULT_PUBLIC_APPEARANCE.logoUrl;
    return theme === "dark" ? appearance.darkLogoUrl || appearance.logoUrl : appearance.logoUrl || appearance.darkLogoUrl;
}

function normalizeBrandSlug(value: unknown) {
    const candidate = String(value || "")
        .trim()
        .toLocaleLowerCase();
    return /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(candidate) ? candidate : DEFAULT_PUBLIC_APPEARANCE.brandSlug;
}

function safeAppearanceURL(value: unknown, fallback: string) {
    const candidate = String(value || "").trim();
    if (!candidate) return fallback;
    if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol === "https:") return parsed.toString();
    } catch {
        // Invalid or unsafe asset locations fall back to the bundled appearance.
    }
    return fallback;
}
