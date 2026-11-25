export type AccountMenuRouteId = "account" | "referrals" | "teams" | "settings" | "skills" | "admin";

export type AccountMenuRoute = {
    id: AccountMenuRouteId;
    label: string;
    description: string;
    to: string;
    requiresAdmin?: boolean;
    requiresCredits?: boolean;
    requiresReferrals?: boolean;
};

export const ACCOUNT_MENU_ROUTE_CATALOG: readonly AccountMenuRoute[] = [
    { id: "account", label: "账户中心", description: "概览、资料与订阅", to: "/account/overview" },
    { id: "referrals", label: "邀请好友", description: "邀请奖励与算力返利", to: "/account/referrals", requiresReferrals: true },
    { id: "teams", label: "团队空间", description: "成员、共享积分与资源", to: "/teams" },
    { id: "settings", label: "创作设置", description: "模型、自带模型与存储偏好", to: "/settings" },
    { id: "skills", label: "Skill 库", description: "技能助手与编排", to: "/skills" },
    { id: "admin", label: "管理员后台", description: "用户、模型与系统配置", to: "/admin", requiresAdmin: true },
];

export function accountMenuRoutes({ role, referralsEnabled = false }: { role: "admin" | "user"; creditsEnabled?: boolean; referralsEnabled?: boolean }) {
    return ACCOUNT_MENU_ROUTE_CATALOG.filter((route) => (!route.requiresAdmin || role === "admin") && (!route.requiresReferrals || referralsEnabled));
}

export type AccountSettingsShortcut = {
    id: string;
    label: string;
    to: string;
    requiresCustomChannels?: boolean;
    requiresRunningHub?: boolean;
    requiresComfyUI?: boolean;
};

export const ACCOUNT_SETTINGS_SHORTCUT_CATALOG: readonly AccountSettingsShortcut[] = [
    { id: "channels", label: "自带模型", to: "/settings?section=channels", requiresCustomChannels: true },
    { id: "runninghub", label: "RunningHub", to: "/settings?section=runninghub", requiresRunningHub: true },
    { id: "comfyui", label: "ComfyUI Bridge", to: "/settings?section=comfyui", requiresComfyUI: true },
    { id: "models", label: "模型选择", to: "/settings?section=models" },
    { id: "preferences", label: "生成偏好", to: "/settings?section=preferences" },
    { id: "prompts", label: "提示词偏好", to: "/settings?section=prompts" },
    { id: "storage", label: "对象存储", to: "/settings?section=storage" },
    { id: "diagnostics", label: "问题诊断", to: "/settings?section=diagnostics" },
];

export function accountSettingsShortcuts({ customChannelsEnabled, runningHubEnabled, comfyUIEnabled }: { customChannelsEnabled: boolean; runningHubEnabled: boolean; comfyUIEnabled: boolean }) {
    return ACCOUNT_SETTINGS_SHORTCUT_CATALOG.filter((shortcut) => (!shortcut.requiresCustomChannels || customChannelsEnabled) && (!shortcut.requiresRunningHub || runningHubEnabled) && (!shortcut.requiresComfyUI || comfyUIEnabled));
}

/** 未开通过订阅时保持诚实的空状态，不把价格目录伪装成当前套餐。 */
export const UNAVAILABLE_SUBSCRIPTION_SUMMARY = {
    label: "订阅状态",
    value: "当前账户暂无会员订阅",
    actionLabel: "查看可选套餐",
} as const;
