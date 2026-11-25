import { Button, InputNumber } from "antd";
import { useId, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { UserAccessKey } from "@/services/api/access-keys";
import "./spend-limit.css";

export const SPEND_LIMIT_PRESETS = [200, 500, 1000, null] as const;

export function SpendLimitField({ value, onChange, disabled = false, title, description }: { value: number | null; onChange: (value: number | null) => void; disabled?: boolean; title?: string; description?: string }) {
    const { t } = useI18n();
    const id = useId();
    const [custom, setCustom] = useState(value !== null && !SPEND_LIMIT_PRESETS.includes(value as 200));
    const options = [200, 500, 1000, "custom", null] as const;
    const select = (option: (typeof options)[number]) => {
        setCustom(option === "custom");
        onChange(option === "custom" ? (value !== null ? Math.max(1, value) : 1) : option);
    };
    return (
        <section className="mcp-spend-limit" aria-labelledby={`${id}-title`} aria-describedby={`${id}-risk`}>
            <h3 id={`${id}-title`}>{title ?? t("mcp.limitTitle")}</h3>
            <p id={`${id}-risk`}>{description ?? t("mcp.limitRiskDetail")}</p>
            <div className="mcp-spend-options">
                <div className="mcp-spend-presets" role="group" aria-label={t("mcp.limit")}>
                    {options.map((limit, index) => (
                        <div className={`mcp-spend-option${limit === "custom" && custom ? " is-custom" : ""}`} key={limit ?? "unlimited"}>
                            <button
                                type="button"
                                aria-pressed={limit === "custom" ? custom : !custom && value === limit}
                                disabled={disabled}
                                onClick={() => select(limit)}
                                onKeyDown={(event) => {
                                    const offset = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
                                    if (!offset) return;
                                    event.preventDefault();
                                    const next = (index + offset + options.length) % options.length;
                                    event.currentTarget.parentElement?.parentElement?.children[next]?.querySelector("button")?.focus();
                                    select(options[next]);
                                }}
                            >
                                {limit === "custom" ? t("mcp.limitCustom") : (limit ?? t("mcp.unlimited"))}
                            </button>
                        </div>
                    ))}
                </div>
                {custom ? (
                    <div className="mcp-spend-custom-input">
                        <InputNumber
                            aria-label={t("mcp.limit")}
                            suffix={t("mcp.creditUnit")}
                            disabled={disabled}
                            min={1}
                            max={Number.MAX_SAFE_INTEGER / 1_000_000}
                            precision={2}
                            step={0.01}
                            value={value}
                            onChange={(next) => onChange(next === null ? 1 : Math.max(1, next))}
                        />
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export function isSpendLimitNear(key: Pick<UserAccessKey, "spendLimitMicrocredits" | "spentMicrocredits">) {
    return key.spendLimitMicrocredits !== null && key.spentMicrocredits >= key.spendLimitMicrocredits * 0.8;
}

export function KeySpendUsage({ accessKey, onEdit }: { accessKey: Pick<UserAccessKey, "spendLimitMicrocredits" | "spentMicrocredits">; onEdit?: () => void }) {
    const { t, number } = useI18n();
    const format = (value: number) => number(value / 1_000_000, { maximumFractionDigits: 2 });
    const limit = accessKey.spendLimitMicrocredits;
    const percent = limit === null ? null : limit === 0 ? 100 : Math.min(100, (accessKey.spentMicrocredits / limit) * 100);
    const reached = percent !== null && percent >= 100;
    return (
        <div className="mcp-spend-usage">
            <div className="mcp-spend-usage-row">
                {limit === null && accessKey.spentMicrocredits === 0 ? (
                    <span className="mcp-spend-unlimited">{t("mcp.unlimited")}</span>
                ) : (
                    <strong>{t("mcp.usage", { used: format(accessKey.spentMicrocredits), limit: limit === null ? t("mcp.unlimited") : format(limit) })}</strong>
                )}
                {percent !== null ? (
                    <div className={`mcp-spend-progress ${reached ? "is-reached" : percent >= 80 ? "is-warning" : ""}`} role="progressbar" aria-label={t("mcp.limit")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                        <span style={{ width: `${percent}%` }} />
                    </div>
                ) : null}
            </div>
            {limit === null && accessKey.spentMicrocredits > 0 ? (
                <div className="mcp-spend-suggestion">
                    <Info size={16} aria-hidden="true" />
                    <span>{t("mcp.limitSuggested")}</span>
                    {onEdit ? (
                        <Button size="small" onClick={onEdit}>
                            {t("mcp.setLimit")}
                        </Button>
                    ) : null}
                </div>
            ) : null}
            {isSpendLimitNear(accessKey) ? (
                <p role="status" className={`mcp-spend-warning${reached ? " is-reached" : ""}`}>
                    <TriangleAlert size={16} aria-hidden="true" />
                    {t(reached ? "mcp.limitReached" : "mcp.limitNear")}
                </p>
            ) : null}
        </div>
    );
}
