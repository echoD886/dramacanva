import { useRef, useState } from "react";
import { Button, Popover } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { formatAccountCredits } from "@/lib/account-credits";

export function ExactCredits({ value, signed = false }: { value: number; signed?: boolean }) {
    const { t, locale } = useI18n();
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const close = () => {
        setOpen(false);
        trigger.current?.focus();
    };
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            content={
                <div
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.stopPropagation();
                            close();
                        }
                    }}
                >
                    <span>{formatAccountCredits(value, locale, signed)}</span>
                    <Button type="text" onClick={close}>
                        {t("common.close")}
                    </Button>
                </div>
            }
        >
            <button
                ref={trigger}
                type="button"
                aria-label={t("ledger.exact")}
                aria-expanded={open}
                className="tabular-nums rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        event.stopPropagation();
                        close();
                    }
                }}
            >
                {formatAccountCredits(value, locale, signed)}
            </button>
        </Popover>
    );
}
