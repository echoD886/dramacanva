const storageKey = "infinite-canvas:editor-tab";
let sessionId: string | undefined;
let ready: Promise<string> | undefined;

/** A reload keeps its tab identity; a new/duplicated tab must claim a distinct one. */
export function canvasEditorSessionId() {
    if (sessionId) return sessionId;
    try {
        sessionId = sessionStorage.getItem(storageKey) || crypto.randomUUID();
        sessionStorage.setItem(storageKey, sessionId);
    } catch {
        sessionId = crypto.randomUUID();
    }
    return sessionId;
}

export function prepareCanvasEditorSession(): Promise<string> {
    if (ready) return ready;
    ready = new Promise<string>((resolve, reject) => {
        const claim = (id: string) => {
            const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
            if (!locks) {
                // Without cross-tab locks, only a real reload may reuse copied sessionStorage.
                const navigation = typeof performance !== "undefined" ? performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined : undefined;
                if (navigation && navigation.type !== "reload") id = crypto.randomUUID();
                remember(id);
                resolve(id);
                return;
            }
            void locks.request(`canvas-editor-tab:${id}`, { ifAvailable: true }, (lock) => {
                if (!lock) { claim(crypto.randomUUID()); return; }
                remember(id);
                resolve(id);
                // The browser releases this lock when the document is destroyed. Holding
                // it also distinguishes tabs created with a copy of sessionStorage.
                return new Promise<void>(() => undefined);
            }).catch(reject);
        };
        const remember = (id: string) => {
            sessionId = id;
            try { sessionStorage.setItem(storageKey, id); } catch { /* Memory identity still isolates this page. */ }
        };
        claim(canvasEditorSessionId());
    });
    return ready;
}
