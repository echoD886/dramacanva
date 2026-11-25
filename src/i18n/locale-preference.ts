export type LocalePreferenceEnvironment<T extends string> = {
    normalize: (value: string | null | undefined) => T | null;
    read: () => string | null;
    write: (locale: T) => void;
    fallback: () => readonly string[];
    listen: (storageChanged: () => void, languageChanged: () => void) => () => void;
};

/** Only a UI preference: never use this fallback for authenticated user scope. */
export function createLocalePreference<T extends string>(defaultLocale: T, environment?: LocalePreferenceEnvironment<T>) {
    let inMemory: T | undefined;
    let stop: (() => void) | undefined;
    const listeners = new Set<() => void>();
    let savedValue: string | null | undefined;
    let savedLocale: T | null = null;
    function getSnapshot(): T {
        if (!environment) return defaultLocale;
        if (inMemory) return inMemory;
        try {
            const raw = environment.read();
            if (raw !== savedValue) {
                savedValue = raw;
                savedLocale = environment.normalize(raw);
            }
            if (savedLocale) return savedLocale;
        } catch {
            // Storage can be unavailable even when window.localStorage exists.
        }
        for (const candidate of environment.fallback()) {
            const locale = environment.normalize(candidate);
            if (locale) return locale;
        }
        return defaultLocale;
    }
    function notify() {
        for (const listener of [...listeners]) listener();
    }
    return {
        getSnapshot,
        getServerSnapshot: () => defaultLocale,
        setLocale(value: string): boolean {
            if (!environment) return false;
            const next = environment.normalize(value);
            if (!next) return false;
            const previous = getSnapshot();
            inMemory = next;
            try {
                environment.write(next);
                inMemory = undefined;
            } catch {
                // Keep this tab functional without claiming persistence succeeded.
            }
            if (next !== previous) notify();
            return true;
        },
        subscribe(listener: () => void) {
            listeners.add(listener);
            if (listeners.size === 1 && environment) {
                stop = environment.listen(() => {
                    inMemory = undefined;
                    notify();
                }, notify);
            }
            return () => {
                listeners.delete(listener);
                if (!listeners.size) {
                    stop?.();
                    stop = undefined;
                }
            };
        },
    };
}
