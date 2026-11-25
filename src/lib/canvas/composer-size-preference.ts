/** 画布节点输入面板的宽度偏好：用户拖动右下角调整后，所有节点沿用同一宽度（仅 UI 偏好，存本机）。 */
const STORAGE_KEY = "canvas-composer-width";
export const COMPOSER_MIN_WIDTH = 480;
export const COMPOSER_MAX_WIDTH = 1280;

const listeners = new Set<() => void>();
let cached: number | null | undefined;

export function clampComposerWidth(width: number) {
    return Math.round(Math.min(COMPOSER_MAX_WIDTH, Math.max(COMPOSER_MIN_WIDTH, width)));
}

export function getComposerWidthPreference(): number | null {
    if (cached !== undefined) return cached;
    try {
        const value = Number(window.localStorage.getItem(STORAGE_KEY));
        cached = Number.isFinite(value) && value > 0 ? clampComposerWidth(value) : null;
    } catch {
        cached = null;
    }
    return cached;
}

/** 传 null 恢复为按节点大小自动计算的默认宽度。 */
export function setComposerWidthPreference(width: number | null) {
    cached = width === null ? null : clampComposerWidth(width);
    try {
        if (cached === null) window.localStorage.removeItem(STORAGE_KEY);
        else window.localStorage.setItem(STORAGE_KEY, String(cached));
    } catch {
        /* 存储不可用时本次会话仍生效。 */
    }
    for (const listener of listeners) listener();
}

export function subscribeComposerWidthPreference(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
