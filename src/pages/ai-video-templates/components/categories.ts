import type { MessageKey } from "@/i18n/messages";

/** Category ids match backend `categories`; labels are i18n keys. */
export const CATEGORIES: readonly { id: string; key: MessageKey }[] = [
    { id: "all", key: "aiVideoTemplates.catAll" },
    { id: "dance", key: "aiVideoTemplates.catDance" },
    { id: "pet", key: "aiVideoTemplates.catPet" },
    { id: "couple", key: "aiVideoTemplates.catCouple" },
    { id: "friends", key: "aiVideoTemplates.catFriends" },
    { id: "prank", key: "aiVideoTemplates.catPrank" },
    { id: "celebrity", key: "aiVideoTemplates.catCelebrity" },
    { id: "glow-up", key: "aiVideoTemplates.catGlowUp" },
    { id: "christmas", key: "aiVideoTemplates.catChristmas" },
    { id: "halloween", key: "aiVideoTemplates.catHalloween" },
    { id: "new-year", key: "aiVideoTemplates.catNewYear" },
];

export function categoryLabelKey(id: string | undefined): MessageKey | undefined {
    if (!id) return undefined;
    const clean = id.toLowerCase().replace(/-trends$/, "");
    return CATEGORIES.find((c) => c.id === clean && c.id !== "all")?.key;
}

export function categoryPath(id: string) {
    return id === "all" ? "/ai-video-templates" : `/ai-video-templates/category/${id}`;
}
