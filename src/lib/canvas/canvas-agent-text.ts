import type { MessageKey } from "@/i18n/messages";
import { translateMessage } from "@/i18n/messages";
import { resolveAppLocale } from "@/i18n/app-locale";

/**
 * Resolve a canvasAgent.* message against the active app locale.
 * Non-React modules (lib helpers and tool pipelines) use this instead of useI18n.
 */
export function canvasAgentText(key: MessageKey, values?: Record<string, string | number>) {
    return translateMessage(resolveAppLocale(), key, values);
}
