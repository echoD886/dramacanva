import { create } from "zustand";

import { DEFAULT_DRAWING_ENGINE, type CanvasDrawingEngineSetting } from "@/lib/canvas/canvas-drawing-engine";

export type LocalUser = {
    features?: { directorPrevisV2: boolean };
    hasPassword?: boolean;
    linkedProviders?: string[];
    id: string;
    username: string;
    email?: string;
    displayName: string;
    avatarUrl?: string;
    identityProvider?: string;
    identityId?: string;
    identityUsername?: string;
    role: "admin" | "user";
    status: "active" | "disabled";
    lastLoginAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type RuntimeLimits = {
    activeTaskLimit: number;
    resourceUploadMB: number;
    sessionUploadMB: number;
    recycleBinRetentionDays?: number;
};

export type FeatureAvailability = {
    generationScreeningEnabled?: boolean;
    promptSiftEnabled?: boolean;
    generationScreeningMinorThreshold?: number;
    generationScreeningSexualThreshold?: number;
    creativeAccessEnabled?: boolean;
    creativeAccessChannelId?: string;
    creativeSexualThreshold?: number;
    creativeImageThreshold?: number;
    creativeCelebrityThreshold?: number;
    upgradeCreditPhase2Enabled?: boolean;
    ecommerceEnabled?: boolean;
    shortDramaEnabled: boolean;
    taskCenterEnabled: boolean;
    creditsEnabled: boolean;
    customChannelsEnabled: boolean;
    frontendModelsEnabled: boolean;
    pluginCenterEnabled: boolean;
    systemPluginsVisibleToUsers: boolean;
    desktopLocalChannelsEnabled: boolean;
    configured?: boolean;
    updatedBy?: string;
    updatedAt?: string;
};

export const defaultFeatureAvailability: FeatureAvailability = {
    generationScreeningEnabled: false,
    promptSiftEnabled: false,
    generationScreeningMinorThreshold: 0.5,
    generationScreeningSexualThreshold: 0.9,
    upgradeCreditPhase2Enabled: false,
    ecommerceEnabled: false,
    shortDramaEnabled: true,
    taskCenterEnabled: true,
    creditsEnabled: true,
    customChannelsEnabled: true,
    frontendModelsEnabled: false,
    pluginCenterEnabled: true,
    systemPluginsVisibleToUsers: true,
    desktopLocalChannelsEnabled: false,
};

type UserStore = {
    watermarkRequired: boolean;
    setWatermarkRequired: (required?: boolean) => void;
    featuresLoaded: boolean;
    hydrated: boolean;
    user: LocalUser | null;
    runtimeLimits: RuntimeLimits;
    drawingEngine: CanvasDrawingEngineSetting;
    features: FeatureAvailability;
    setUser: (user: LocalUser | null) => void;
    setRuntimeLimits: (limits?: RuntimeLimits) => void;
    setDrawingEngine: (setting?: CanvasDrawingEngineSetting) => void;
    setFeatures: (features?: FeatureAvailability) => void;
    setHydrated: (hydrated: boolean) => void;
    clearSession: () => void;
};

export const useUserStore = create<UserStore>()((set) => ({
    watermarkRequired: false,
    setWatermarkRequired: (required) => set({ watermarkRequired: required === true }),
    featuresLoaded: false,
    hydrated: false,
    user: null,
    runtimeLimits: { activeTaskLimit: 5, resourceUploadMB: 50, sessionUploadMB: 32, recycleBinRetentionDays: 30 },
    drawingEngine: { defaultEngine: DEFAULT_DRAWING_ENGINE },
    features: defaultFeatureAvailability,
    setUser: (user) => set({ user }),
    setRuntimeLimits: (runtimeLimits) => set({ runtimeLimits: runtimeLimits || { activeTaskLimit: 5, resourceUploadMB: 50, sessionUploadMB: 32, recycleBinRetentionDays: 30 } }),
    setDrawingEngine: (drawingEngine) => set({ drawingEngine: drawingEngine || { defaultEngine: DEFAULT_DRAWING_ENGINE } }),
    setFeatures: (features) => set({ featuresLoaded: Boolean(features), features: features ? { ...defaultFeatureAvailability, ...features } : defaultFeatureAvailability }),
    setHydrated: (hydrated) => set({ hydrated }),
    clearSession: () =>
        set({
            watermarkRequired: false,
            featuresLoaded: false,
            user: null,
            runtimeLimits: { activeTaskLimit: 5, resourceUploadMB: 50, sessionUploadMB: 32, recycleBinRetentionDays: 30 },
            drawingEngine: { defaultEngine: DEFAULT_DRAWING_ENGINE },
            features: defaultFeatureAvailability,
        }),
}));
