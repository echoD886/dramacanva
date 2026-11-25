import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { createRetryableModuleLoader } from "@/lib/retryable-module-loader";

type AnnouncementContentProps = {
    content: string;
    className?: string;
};

const loadRenderer = createRetryableModuleLoader(() => import("./announcement-markdown").then((module) => module.AnnouncementContent));
let loadedRenderer: Awaited<ReturnType<typeof loadRenderer>> | undefined;

/** Closed announcement panels must not load Markdown on every public page. */
export function AnnouncementContent(props: AnnouncementContentProps) {
    const { t } = useI18n();
    const [Renderer, setRenderer] = useState(() => loadedRenderer);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (Renderer) return;
        let current = true;
        setFailed(false);
        void loadRenderer().then(
            (component) => {
                loadedRenderer = component;
                if (current) setRenderer(() => component);
            },
            () => {
                if (current) setFailed(true);
            },
        );
        return () => {
            current = false;
        };
    }, [Renderer, attempt]);

    if (Renderer) return <Renderer {...props} />;
    // React escapes this text. A failed chunk never hides the announcement or
    // turns administrator-supplied HTML into executable markup.
    return (
        <div className={props.className} aria-busy={!failed}>
            <p className="whitespace-pre-wrap break-words">{props.content}</p>
            {failed ? (
                <button type="button" className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setAttempt((value) => value + 1)}>
                    {t("miscPages.announcementReloadRenderer")}
                </button>
            ) : null}
        </div>
    );
}
