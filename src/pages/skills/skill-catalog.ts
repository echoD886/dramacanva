import type { MessageKey } from "@/i18n/messages";
import type { SkillCategory } from "@/services/api/skills";

export const fallbackSkillCategories: Array<{ value: string; labelKey: MessageKey }> = [
    { value: "drama", labelKey: "skillsPage.category.drama" },
    { value: "screenplay", labelKey: "skillsPage.category.screenplay" },
    { value: "storyboard", labelKey: "skillsPage.category.storyboard" },
    { value: "video", labelKey: "skillsPage.category.video" },
    { value: "ecommerce", labelKey: "skillsPage.category.ecommerce" },
    { value: "creative", labelKey: "skillsPage.category.creative" },
    { value: "social", labelKey: "skillsPage.category.social" },
    { value: "others", labelKey: "skillsPage.category.others" },
];

export function skillCategoryLabel(value: string, categories: SkillCategory[] = [], t: (key: MessageKey) => string = (key) => key) {
    const builtin = fallbackSkillCategories.find((item) => item.value === value);
    if (builtin) return t(builtin.labelKey);
    const matched = categories.find((item) => item.value === value)?.label;
    if (matched) return matched;
    return t("skillsPage.category.others");
}

export function formatSkillCount(value: number) {
    return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

