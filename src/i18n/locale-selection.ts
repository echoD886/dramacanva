import { loadMessages, type MessageLocale } from "./messages";
export type LocaleSelectionState = { pending: MessageLocale | null; failed: MessageLocale | null };
const idle: LocaleSelectionState = { pending: null, failed: null };
/** All language controls share the latest intent. A slow import from another
 * control must not undo the user's newer choice or unrelated navigation. */
export function createLocaleSelection(load: (locale: MessageLocale) => Promise<void>) {
    let revision = 0;
    let state = idle;
    const listeners = new Set<() => void>();
    const publish = (next: LocaleSelectionState) => {
        state = next;
        for (const listener of [...listeners]) listener();
    };
    return {
        snapshot: () => state,
        serverSnapshot: () => idle,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        cancel() {
            revision++;
            if (state !== idle) publish(idle);
        },
        async select(locale: MessageLocale, isCurrent: () => boolean, commit: () => void) {
            const request = ++revision;
            publish({ pending: locale, failed: null });
            try {
                await load(locale);
                if (request !== revision) return false;
                if (!isCurrent()) {
                    publish(idle);
                    return false;
                }
                commit();
                publish(idle);
                return true;
            } catch {
                if (request === revision) publish(isCurrent() ? { pending: null, failed: locale } : idle);
                return false;
            }
        },
    };
}
export const localeSelection = createLocaleSelection(loadMessages);
