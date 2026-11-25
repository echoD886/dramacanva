export type SettingsPlacement = "topLeft" | "top" | "topRight" | "bottomLeft" | "bottom" | "bottomRight";

export function settingsPopoverPosition(anchor: { left: number; right: number; top: number; bottom: number; width: number }, viewport: { width: number; height: number }, contentHeight: number, placement: SettingsPlacement = "bottomLeft", preferredWidth = 336) {
    const margin = 12;
    const gap = 8;
    const width = Math.max(0, Math.min(preferredWidth, viewport.width - margin * 2));
    const below = Math.max(0, viewport.height - anchor.bottom - gap - margin);
    const above = Math.max(0, anchor.top - gap - margin);
    const preferAbove = placement.startsWith("top");
    const primary = preferAbove ? above : below;
    const secondary = preferAbove ? below : above;
    const flipped = primary < contentHeight && secondary > primary;
    const placeAbove = preferAbove !== flipped;
    const maxHeight = placeAbove ? above : below;
    const height = Math.min(contentHeight, maxHeight);
    const left = placement.endsWith("Right") ? anchor.right - width : placement === "top" || placement === "bottom" ? anchor.left + (anchor.width - width) / 2 : anchor.left;
    return { width, maxHeight, left: Math.max(margin, Math.min(viewport.width - width - margin, left)), top: Math.max(margin, placeAbove ? anchor.top - gap - height : anchor.bottom + gap), placeAbove };
}
