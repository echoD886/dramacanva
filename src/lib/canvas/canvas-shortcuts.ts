import type { MessageKey } from "@/i18n/messages";

export type CanvasShortcutCategoryId = "common" | "navigation" | "selection" | "editing";

export type CanvasShortcutCategory = {
    id: CanvasShortcutCategoryId;
    label: MessageKey;
    description: MessageKey;
};

export type CanvasShortcutItem = {
    id: string;
    category: CanvasShortcutCategoryId;
    title: MessageKey;
    description: MessageKey;
    keys: string[][];
    /** 逗号分隔的同义词；按语言给值，外语用户才能用母语搜到命令。 */
    keywords?: MessageKey;
};

export const CANVAS_MODIFIER_KEY = "Ctrl / Cmd";

export const CANVAS_SHORTCUT_CATEGORIES: CanvasShortcutCategory[] = [
    { id: "common", label: "canvasExtra.shortcutCat.common.label", description: "canvasExtra.shortcutCat.common.desc" },
    { id: "navigation", label: "canvasExtra.shortcutCat.navigation.label", description: "canvasExtra.shortcutCat.navigation.desc" },
    { id: "selection", label: "canvasExtra.shortcutCat.selection.label", description: "canvasExtra.shortcutCat.selection.desc" },
    { id: "editing", label: "canvasExtra.shortcutCat.editing.label", description: "canvasExtra.shortcutCat.editing.desc" },
];

export const CANVAS_SHORTCUTS: CanvasShortcutItem[] = [
    {
        id: "search",
        category: "common",
        title: "canvasExtra.shortcut.search.title",
        description: "canvasExtra.shortcut.search.desc",
        keys: [[CANVAS_MODIFIER_KEY, "F"]],
        keywords: "canvasExtra.shortcut.search.kw",
    },
    {
        id: "shortcuts",
        category: "common",
        title: "canvasExtra.shortcut.shortcuts.title",
        description: "canvasExtra.shortcut.shortcuts.desc",
        keys: [["?"]],
        keywords: "canvasExtra.shortcut.shortcuts.kw",
    },
    {
        id: "save",
        category: "common",
        title: "canvasExtra.shortcut.save.title",
        description: "canvasExtra.shortcut.save.desc",
        keys: [[CANVAS_MODIFIER_KEY, "S"]],
        keywords: "canvasExtra.shortcut.save.kw",
    },
    {
        id: "focus",
        category: "common",
        title: "canvasExtra.shortcut.focus.title",
        description: "canvasExtra.shortcut.focus.desc",
        keys: [["Shift", CANVAS_MODIFIER_KEY, "F"]],
        keywords: "canvasExtra.shortcut.focus.kw",
    },
    {
        id: "pan",
        category: "navigation",
        title: "canvasExtra.shortcut.pan.title",
        description: "canvasExtra.shortcut.pan.desc",
        keys: [["canvasExtra.shortcutKey.trackpadTwoFinger"], ["Space", "canvasExtra.shortcutKey.leftDrag"], ["canvasExtra.shortcutKey.middleDrag"]],
        keywords: "canvasExtra.shortcut.pan.kw",
    },
    {
        id: "zoom-wheel",
        category: "navigation",
        title: "canvasExtra.shortcut.zoom_wheel.title",
        description: "canvasExtra.shortcut.zoom_wheel.desc",
        keys: [["canvasExtra.shortcutKey.wheel"]],
        keywords: "canvasExtra.shortcut.zoom_wheel.kw",
    },
    {
        id: "zoom-controls",
        category: "navigation",
        title: "canvasExtra.shortcut.zoom_controls.title",
        description: "canvasExtra.shortcut.zoom_controls.desc",
        keys: [["canvasExtra.shortcutKey.zoomSlider"]],
        keywords: "canvasExtra.shortcut.zoom_controls.kw",
    },
    {
        id: "zoom-steps",
        category: "navigation",
        title: "canvasExtra.shortcut.zoom_steps.title",
        description: "canvasExtra.shortcut.zoom_steps.desc",
        keys: [[CANVAS_MODIFIER_KEY, "+"], [CANVAS_MODIFIER_KEY, "-"]],
        keywords: "canvasExtra.shortcut.zoom_steps.kw",
    },
    {
        id: "zoom-presets",
        category: "navigation",
        title: "canvasExtra.shortcut.zoom_presets.title",
        description: "canvasExtra.shortcut.zoom_presets.desc",
        keys: [[CANVAS_MODIFIER_KEY, "0"], [CANVAS_MODIFIER_KEY, "1"], [CANVAS_MODIFIER_KEY, "2"], [CANVAS_MODIFIER_KEY, "3"]],
        keywords: "canvasExtra.shortcut.zoom_presets.kw",
    },
    {
        id: "box-select",
        category: "selection",
        title: "canvasExtra.shortcut.box_select.title",
        description: "canvasExtra.shortcut.box_select.desc",
        keys: [["canvasExtra.shortcutKey.emptyLeftDrag"], ["Shift", "canvasExtra.shortcutKey.drag"], [CANVAS_MODIFIER_KEY, "canvasExtra.shortcutKey.drag"], ["Alt", "canvasExtra.shortcutKey.drag"]],
        keywords: "canvasExtra.shortcut.box_select.kw",
    },
    {
        id: "box-select-tool",
        category: "selection",
        title: "canvasExtra.shortcut.box_select_tool.title",
        description: "canvasExtra.shortcut.box_select_tool.desc",
        keys: [["canvasExtra.shortcutKey.areaSelect", "canvasExtra.shortcutKey.drag"]],
        keywords: "canvasExtra.shortcut.box_select_tool.kw",
    },
    {
        id: "add-selection",
        category: "selection",
        title: "canvasExtra.shortcut.add_selection.title",
        description: "canvasExtra.shortcut.add_selection.desc",
        keys: [["Shift", "canvasExtra.shortcutKey.click"], [CANVAS_MODIFIER_KEY, "canvasExtra.shortcutKey.click"]],
        keywords: "canvasExtra.shortcut.add_selection.kw",
    },
    {
        id: "remove-selection",
        category: "selection",
        title: "canvasExtra.shortcut.remove_selection.title",
        description: "canvasExtra.shortcut.remove_selection.desc",
        keys: [["Alt", "canvasExtra.shortcutKey.clickOrBox"]],
        keywords: "canvasExtra.shortcut.remove_selection.kw",
    },
    {
        id: "select-all",
        category: "selection",
        title: "canvasExtra.shortcut.select_all.title",
        description: "canvasExtra.shortcut.select_all.desc",
        keys: [[CANVAS_MODIFIER_KEY, "A"]],
        keywords: "canvasExtra.shortcut.select_all.kw",
    },
    {
        id: "batch-connect",
        category: "selection",
        title: "canvasExtra.shortcut.batch_connect.title",
        description: "canvasExtra.shortcut.batch_connect.desc",
        keys: [["Alt", "L"]],
        keywords: "canvasExtra.shortcut.batch_connect.kw",
    },
    {
        id: "copy",
        category: "editing",
        title: "canvasExtra.shortcut.copy.title",
        description: "canvasExtra.shortcut.copy.desc",
        keys: [[CANVAS_MODIFIER_KEY, "C"]],
        keywords: "canvasExtra.shortcut.copy.kw",
    },
    {
        id: "paste",
        category: "editing",
        title: "canvasExtra.shortcut.paste.title",
        description: "canvasExtra.shortcut.paste.desc",
        keys: [[CANVAS_MODIFIER_KEY, "V"]],
        keywords: "canvasExtra.shortcut.paste.kw",
    },
    {
        id: "delete",
        category: "editing",
        title: "canvasExtra.shortcut.delete.title",
        description: "canvasExtra.shortcut.delete.desc",
        keys: [["Delete"], ["Backspace"]],
        keywords: "canvasExtra.shortcut.delete.kw",
    },
    {
        id: "undo",
        category: "editing",
        title: "canvasExtra.shortcut.undo.title",
        description: "canvasExtra.shortcut.undo.desc",
        keys: [[CANVAS_MODIFIER_KEY, "Z"]],
        keywords: "canvasExtra.shortcut.undo.kw",
    },
    {
        id: "redo",
        category: "editing",
        title: "canvasExtra.shortcut.redo.title",
        description: "canvasExtra.shortcut.redo.desc",
        keys: [[CANVAS_MODIFIER_KEY, "Shift", "Z"], [CANVAS_MODIFIER_KEY, "Y"]],
        keywords: "canvasExtra.shortcut.redo.kw",
    },
    {
        id: "escape",
        category: "editing",
        title: "canvasExtra.shortcut.escape.title",
        description: "canvasExtra.shortcut.escape.desc",
        keys: [["Esc"]],
        keywords: "canvasExtra.shortcut.escape.kw",
    },
    {
        id: "import-media",
        category: "editing",
        title: "canvasExtra.shortcut.import_media.title",
        description: "canvasExtra.shortcut.import_media.desc",
        keys: [["canvasExtra.shortcutKey.dropMedia"]],
        keywords: "canvasExtra.shortcut.import_media.kw",
    },
];

/** keys 里既有真实按键名（Shift、F），也有需要翻译的手势描述；只翻译消息键。 */
export function canvasShortcutKeyLabel(token: string, t: (key: MessageKey) => string) {
    return token.startsWith("canvasExtra.") ? t(token as MessageKey) : token;
}

export function filterCanvasShortcuts(query: string, category: CanvasShortcutCategoryId | "all" | undefined, t: (key: MessageKey) => string) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return CANVAS_SHORTCUTS.filter((shortcut) => {
        if (category && category !== "all" && shortcut.category !== category) return false;
        if (!terms.length) return true;

        const categoryLabelKey = CANVAS_SHORTCUT_CATEGORIES.find((entry) => entry.id === shortcut.category)?.label;
        // 匹配必须针对翻译后的文本，否则切到外语后搜索框对任何母语词都无结果。
        const searchableText = [t(shortcut.title), t(shortcut.description), categoryLabelKey ? t(categoryLabelKey) : "", shortcut.keys.flat().join(" "), shortcut.keywords ? t(shortcut.keywords) : ""]
            .join(" ")
            .toLocaleLowerCase();
        return terms.every((term) => searchableText.includes(term));
    });
}
