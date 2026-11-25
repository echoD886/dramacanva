import { lazy, memo, Suspense } from "react";

const Renderer = lazy(() => import("./ai-message-markdown-renderer").then((module) => ({ default: module.AIMessageMarkdown })));

type AIMessageMarkdownProps = {
    children: string;
    isStreaming?: boolean;
    className?: string;
};

export const AIMessageMarkdown = memo(function AIMessageMarkdown(props: AIMessageMarkdownProps) {
    if (!props.children.trim()) return null;
    // Show the plain source while the renderer chunk loads so text never flashes blank.
    return (
        <Suspense
            fallback={
                <div className={props.className} style={{ whiteSpace: "pre-wrap" }}>
                    {props.children}
                </div>
            }
        >
            <Renderer {...props} />
        </Suspense>
    );
});
