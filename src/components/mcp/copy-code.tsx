import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { copyMcpCode, type CopyStatus } from "@/lib/mcp-copy";
import "./mcp.css";

export function CopyCode({ value, label, singleLine = false }: { value: string; label?: string; singleLine?: boolean }) {
    const { t } = useI18n();
    const [status, setStatus] = useState<CopyStatus>("idle");
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const epoch = useRef(0);
    useEffect(() => {
        epoch.current++;
        setStatus("idle");
        return () => {
            epoch.current++;
            clearTimeout(timer.current);
        };
    }, [value]);
    const copy = async () => {
        const current = ++epoch.current;
        clearTimeout(timer.current);
        await copyMcpCode(
            value,
            (text) => navigator.clipboard.writeText(text),
            setStatus,
            (callback, delay) => {
                timer.current = setTimeout(callback, delay);
            },
            () => current === epoch.current,
        );
    };
    return (
        <div className="mcp-copy-block">
            {label ? <span className="mcp-code-label">{label}</span> : null}
            <div className={`mcp-code-row${singleLine ? " is-single-line" : ""}`}>
                <pre tabIndex={0} title={singleLine ? value : undefined}>
                    <code>{singleLine ? value.replace(/\n\s*/g, " ") : value}</code>
                </pre>
                <button type="button" onClick={() => void copy()}>
                    {status === "copied" ? t("mcp.copied") : t("mcp.copy")}
                </button>
            </div>
            <span className="mcp-copy-status" role="status" aria-live="polite">
                {status === "copied" ? t("mcp.copied") : ""}
            </span>
            {status === "failed" ? <p role="alert">{t("mcp.copyFailed")}</p> : null}
        </div>
    );
}
