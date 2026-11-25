import { useI18n } from "@/i18n/use-i18n";
import { cloneElement, useEffect, useRef, useState, type PointerEvent, type ReactElement } from "react";
import { Popover, Switch, Tooltip } from "antd";
import { Settings2, X, type LucideIcon } from "lucide-react";
import { useLocation } from "react-router";

import { useNavigationPreferences } from "@/stores/use-navigation-preferences";
import "./libtv-navigation-controls.css";
import { LocalePicker } from "@/i18n/locale-picker";

export function LibTVNavHint({ title, description, icon: Icon, enabled = true, children }: { title: string; description: string; icon: LucideIcon; enabled?: boolean; children: ReactElement }) {
    const detailedHints = useNavigationPreferences((state) => state.detailedHints);
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    // A click starts a route change; a hint whose hover delay expires afterwards would measure layout
    // while the next page mounts (a ~125 ms forced layout). Suppress it until the pointer leaves.
    const suppressed = useRef(false);

    useEffect(() => {
        setOpen(false);
    }, [pathname, enabled]);
    useEffect(() => {
        if (!open) return;
        const dismiss = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", dismiss);
        return () => document.removeEventListener("keydown", dismiss);
    }, [open]);

    return (
        <Tooltip
            open={enabled && open}
            onOpenChange={(next) => setOpen(next && !suppressed.current)}
            trigger={["hover", "focus"]}
            placement="right"
            mouseEnterDelay={0.25}
            mouseLeaveDelay={0.1}
            getPopupContainer={() => document.body}
            color="var(--popover)"
            classNames={{ root: "ll-nav-hint", container: "ll-nav-hint-surface" }}
            title={
                <div className="ll-nav-hint-content">
                    <div className="ll-nav-hint-heading">
                        <Icon aria-hidden />
                        <strong className="ll-nav-hint-title">{title}</strong>
                    </div>
                    {detailedHints ? <p>{description}</p> : null}
                </div>
            }
        >
            {cloneElement(children as ReactElement<{ onPointerDownCapture?: (event: PointerEvent<HTMLElement>) => void; onPointerLeave?: (event: PointerEvent<HTMLElement>) => void }>, {
                onPointerDownCapture: (event: PointerEvent<HTMLElement>) => {
                    suppressed.current = true;
                    setOpen(false);
                    (children.props as { onPointerDownCapture?: (event: PointerEvent<HTMLElement>) => void }).onPointerDownCapture?.(event);
                },
                onPointerLeave: (event: PointerEvent<HTMLElement>) => {
                    suppressed.current = false;
                    (children.props as { onPointerLeave?: (event: PointerEvent<HTMLElement>) => void }).onPointerLeave?.(event);
                },
            })}
        </Tooltip>
    );
}

export function LibTVNavigationPreferences({ expanded }: { expanded: boolean }) {
    const { t } = useI18n();
    const { iconMotion, detailedHints, setIconMotion, setDetailedHints } = useNavigationPreferences();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const { pathname } = useLocation();
    const close = () => {
        setOpen(false);
        triggerRef.current?.focus();
    };

    useEffect(() => {
        setOpen(false);
    }, [pathname]);
    useEffect(() => {
        if (!open) return;
        const dismiss = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener("keydown", dismiss, true);
        return () => document.removeEventListener("keydown", dismiss, true);
    }, [open]);

    return (
        <LibTVNavHint title={t("nav.display")} description={t("nav.displayHint")} icon={Settings2} enabled={!expanded && !open}>
            <Popover
                open={open}
                onOpenChange={setOpen}
                trigger="click"
                placement={expanded ? "topLeft" : "rightBottom"}
                getPopupContainer={() => document.body}
                classNames={{ root: "ll-nav-preferences-popover" }}
                afterOpenChange={(visible) => {
                    if (visible) panelRef.current?.querySelector<HTMLButtonElement>('[role="switch"]')?.focus();
                }}
                content={
                    <section ref={panelRef} className="ll-nav-preferences" role="dialog" aria-label={t("nav.displaySettings")}>
                        <div className="ll-nav-preferences-heading">
                            <strong>{t("nav.display")}</strong>
                            <button type="button" aria-label={t("nav.closeDisplay")} onClick={close}>
                                <X aria-hidden />
                            </button>
                        </div>
                        <div className="ll-nav-preference-row">
                            <label htmlFor="ll-nav-detailed-hints">
                                <strong>{t("nav.showHints")}</strong>
                                <span>{t("nav.showHintsDetail")}</span>
                            </label>
                            <Switch id="ll-nav-detailed-hints" checked={detailedHints} onChange={setDetailedHints} aria-label={t("nav.showHints")} />
                        </div>
                        <div className="ll-nav-preference-row">
                            <label htmlFor="ll-nav-icon-motion">
                                <strong>{t("nav.iconMotion")}</strong>
                                <span>{t("nav.iconMotionDetail")}</span>
                            </label>
                            <Switch id="ll-nav-icon-motion" checked={iconMotion} onChange={setIconMotion} aria-label={t("nav.iconMotion")} />
                        </div>
                        <div className="ll-nav-preference-row">
                            <LocalePicker />
                        </div>
                        <p>{t("nav.preferenceNote")}</p>
                    </section>
                }
            >
                <button ref={triggerRef} type="button" className="ll-home-side-item" aria-label={t("nav.displaySettings")} aria-haspopup="dialog" aria-expanded={open}>
                    <Settings2 aria-hidden />
                    <span>{t("nav.display")}</span>
                </button>
            </Popover>
        </LibTVNavHint>
    );
}
