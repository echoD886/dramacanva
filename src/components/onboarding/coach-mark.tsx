import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, LoaderCircle, MousePointer2, X } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { createFrameThrottledUpdate } from "@/lib/canvas/canvas-onboarding-flow";
import { createCoachGeometrySnapshot } from "@/lib/coach-mark-dom";
import { clipCoachRect, coachArrowOffset, createCoachRevealTracker, expandCoachRect, mergeCoachHoles, placeCoachCard, placeCoachHand, roundedCoachPath, unionCoachRects, type CoachRect } from "@/lib/coach-mark-layout";
import "./coach-mark.css";

const POPUPS = ".ant-select-dropdown:not(.ant-select-dropdown-hidden),.ant-dropdown:not(.ant-dropdown-hidden),.ant-popover:not(.ant-popover-hidden),[data-connection-create-menu]";
const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
const visible = (element: HTMLElement) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
export type CoachRevealArea = { top: number; bottom: number; right: number; context: HTMLElement[]; minimumScale?: number };

export type CoachMarkProps = {
    id: string;
    title: string;
    description: string;
    menuDescription?: string;
    mobileDescription?: string;
    step?: number;
    target?: (isVisible?: (element: HTMLElement) => boolean) => HTMLElement | null;
    highlight?: () => HTMLElement[];
    highlightClip?: () => HTMLElement | null;
    highlightPadding?: number;
    gestureTarget?: () => HTMLElement | null;
    minimumScale?: number;
    generationTarget?: () => HTMLElement | null;
    context?: () => HTMLElement[];
    vertical?: boolean;
    gesture?: boolean;
    generationLabel?: string;
    children?: ReactNode;
    action?: { label: string; onClick: () => void };
    secondary?: { label: string; onClick: () => void };
    paused?: boolean;
    generating?: boolean;
    onPause: () => void;
    onResume: () => void;
    onSkip: (reason: "skipped" | "closed") => void;
    onConfirmChange?: (open: boolean) => void;
    onTargetActivate?: (target: HTMLElement) => boolean;
    onReveal?: (element: HTMLElement, area: CoachRevealArea) => void;
};

export function CoachMark(props: CoachMarkProps) {
    const { t } = useI18n();
    const theme = useActiveTheme();
    const uid = useId();
    const cardRef = useRef<HTMLDivElement>(null);
    const capsuleRef = useRef<HTMLButtonElement>(null);
    const instantMenusRef = useRef(new Set<HTMLElement>());
    const latest = useRef(props);
    latest.current = props;
    const [confirming, setConfirming] = useState(false);
    const exitReason = useRef<"skipped" | "closed">("skipped");
    const [layout, setLayout] = useState({ holes: [] as CoachRect[], obstacles: [] as CoachRect[], anchor: undefined as CoachRect | undefined, context: undefined as CoachRect | undefined, hand: undefined as CoachRect | undefined, touch: false, targetInMenu: false, width: window.innerWidth, height: window.innerHeight, cardHeight: 230, suspended: false, capsuleStyle: {} as CSSProperties });
    const mode = props.generating ? "generating" : props.paused ? "paused" : "active";
    const active = mode === "active" && !layout.suspended;

    useEffect(() => () => {
        for (const menu of instantMenusRef.current) delete menu.dataset.coachInstantMenu;
        instantMenusRef.current.clear();
    }, []);

    useEffect(() => {
        setConfirming(false);
    }, [props.id]);
    useEffect(() => {
        latest.current.onConfirmChange?.(confirming);
    }, [confirming]);
    useLayoutEffect(() => {
        const emptyState = props.id === "C0" ? document.querySelector<HTMLElement>('[data-canvas-tour="empty-state"]') : null;
        if (emptyState) emptyState.dataset.coachWelcomeHidden = "true";
        const shouldReveal = createCoachRevealTracker<HTMLElement>();
        let markedNode: HTMLElement | null = null;
        let markedPopup: HTMLElement | null = null;
        const clearPopup = () => {
            if (!markedPopup) return;
            delete markedPopup.dataset.coachMenu;
            markedPopup.style.removeProperty("--coach-menu-offset-y");
            markedPopup.style.removeProperty("--coach-menu-max-height");
            markedPopup = null;
        };
        let markedContext: HTMLElement[] = [];
        const measure = () => {
            const geometry = createCoachGeometrySnapshot();
            const { visible, bounds } = geometry;
            const writes: (() => void)[] = [];
            const revealTarget = confirming ? null : latest.current.target?.(visible);
            const target = mode === "active" ? revealTarget : null;
            const targetPopup = target?.closest<HTMLElement>(POPUPS);
            if (targetPopup && targetPopup.dataset.coachInstantMenu !== "true") {
                writes.push(() => { targetPopup.dataset.coachInstantMenu = "true"; });
                instantMenusRef.current.add(targetPopup);
            }
            const nextNode = targetPopup ? markedNode : target?.matches("[data-canvas-connection-rail]") ? target.closest<HTMLElement>("[data-node-id]") : null;
            if (markedNode !== nextNode) {
                const previous = markedNode;
                if (previous) writes.push(() => { delete previous.dataset.canvasTourActive; });
                markedNode = nextNode || null;
                if (nextNode) writes.push(() => { nextNode.dataset.canvasTourActive = "true"; });
            }
            const touch = matchMedia("(max-width: 640px), (any-pointer: coarse)").matches;
            const visualTarget = (!touch && target?.querySelector<HTMLElement>("[data-canvas-connection-handle]")) || target;
            const elements = visualTarget && visible(visualTarget) ? (latest.current.highlight?.().filter(visible) || [visualTarget]) : [];
            const popups = elements.length ? [...document.querySelectorAll<HTMLElement>(POPUPS)].filter((popup) => visible(popup) && !popup.contains(target || null)) : [];
            const suspended = [...document.querySelectorAll<HTMLElement>(".ant-modal-wrap,[data-onboarding-suspend]")].some(visible);
            const width = window.innerWidth;
            const height = window.innerHeight;
            const cardHeight = cardRef.current?.offsetHeight || 230;
            if (markedPopup && (markedPopup !== targetPopup || width > 640)) {
                const previous = markedPopup;
                writes.push(() => {
                    delete previous.dataset.coachMenu;
                    previous.style.removeProperty("--coach-menu-offset-y");
                    previous.style.removeProperty("--coach-menu-max-height");
                });
                markedPopup = null;
            }
            if (targetPopup && width <= 640) {
                markedPopup = targetPopup;
                if (targetPopup.dataset.coachMenu !== "true") writes.push(() => { targetPopup.dataset.coachMenu = "true"; });
                const maxHeight = `${Math.max(80, height - cardHeight - 104)}px`;
                if (targetPopup.style.getPropertyValue("--coach-menu-max-height") !== maxHeight) writes.push(() => targetPopup.style.setProperty("--coach-menu-max-height", maxHeight));
                const rect = geometry.rect(targetPopup);
                const previousOffset = parseFloat(markedPopup.style.getPropertyValue("--coach-menu-offset-y")) || 0;
                const offset = `${Math.max(88 - (rect.top - previousOffset), Math.min(0, height - cardHeight - 16 - (rect.bottom - previousOffset)))}px`;
                if (targetPopup.style.getPropertyValue("--coach-menu-offset-y") !== offset) writes.push(() => targetPopup.style.setProperty("--coach-menu-offset-y", offset));
            }
            const compactDesktop = width > 640 && width < 1120;
            const vertical = latest.current.vertical || compactDesktop;
            const reservedBottom = mode === "generating" ? 116 : width <= 640 ? cardHeight + 32 : vertical ? cardHeight + 152 : 116;
            const reservedRight = mode === "generating" ? 24 : width > 640 && !vertical ? 388 : compactDesktop ? 12 : 24;
            const reservedTop = mode === "generating" && width <= 640 ? 208 : 132;
            const contextElements = latest.current.context?.().filter(visible) || [];
            for (const previous of markedContext) if (!contextElements.includes(previous)) writes.push(() => { delete previous.dataset.coachContext; previous.style.removeProperty("--coach-touch-size"); });
            for (const item of contextElements) {
                const kind = item.querySelector('[data-canvas-tour="script-prompt"]') ? "script" : "node";
                if (item.dataset.coachContext !== kind) writes.push(() => { item.dataset.coachContext = kind; });
                if (kind === "script" || item === markedNode) {
                    const size = `${Math.max(kind === "script" ? 44 : 55, Math.ceil(44 / (geometry.scale(item) || 1)))}px`;
                    if (item.style.getPropertyValue("--coach-touch-size") !== size) writes.push(() => item.style.setProperty("--coach-touch-size", size));
                }
            }
            markedContext = contextElements;
            const clip = latest.current.highlightClip?.();
            const context = unionCoachRects([...contextElements.map(bounds), ...elements.flatMap((el) => {
                const rect = clip ? clipCoachRect(bounds(el), bounds(clip), 6) : bounds(el);
                return rect ? [rect] : [];
            })]);
            const minimumScale = width <= 640 ? latest.current.minimumScale : undefined;
            let reveal: (() => void) | undefined;
            // A generation capsule does not highlight a control. Keep its camera
            // in place instead of synchronously refitting the canvas on feedback.
            if (revealTarget && visible(revealTarget) && !targetPopup && !suspended && mode === "active") {
                const rect = minimumScale ? bounds(revealTarget) : context || bounds(revealTarget);
                const inset = width <= 640 ? 24 : 10;
                const outside = rect.x < inset || rect.x + rect.width > width - (width < 1120 ? inset : reservedRight) || rect.y < 88 || rect.y + rect.height > height - reservedBottom;
                reveal = () => {
                    if (!shouldReveal(revealTarget, JSON.stringify([rect, width, height, reservedTop, reservedRight, reservedBottom, minimumScale]), outside)) return;
                    if (latest.current.onReveal) latest.current.onReveal(revealTarget, { top: reservedTop, bottom: reservedBottom, right: reservedRight, context: contextElements, minimumScale });
                    else if (outside) revealTarget.scrollIntoView({ block: "center", inline: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
                    batch.schedule();
                };
            }
            const region = unionCoachRects(elements.map(bounds));
            let anchor = region ? expandCoachRect({ ...region, radius: elements.length === 1 ? bounds(elements[0]).radius : 0 }, latest.current.highlightPadding) : undefined;
            if (anchor && clip) anchor = clipCoachRect(anchor, bounds(clip), 6);
            const holes = mergeCoachHoles([...(anchor ? [anchor] : []), ...popups.map((el) => expandCoachRect(bounds(el)))]);
            const gestureTarget = (touch && latest.current.gestureTarget?.()) || visualTarget;
            const hand = latest.current.gesture !== false && target?.matches('button,[role="menuitem"],a') && gestureTarget ? bounds(gestureTarget) : undefined;
            const launcher = document.querySelector<HTMLElement>(".canvas-agent-launcher")?.getBoundingClientRect();
            const dock = document.querySelector<HTMLElement>(".canvas-floating-dock")?.getBoundingClientRect();
            const generatingNode = latest.current.generationTarget?.()?.getBoundingClientRect();
            const capsuleWidth = capsuleRef.current?.offsetWidth || 300;
            const capsuleHeight = capsuleRef.current?.offsetHeight || 58;
            const capsuleStyle: CSSProperties = mode === "generating"
                ? width <= 640
                    ? { top: 72, left: "50%", transform: "translateX(-50%)", right: "auto", bottom: "auto" }
                    : { left: Math.max(16, Math.min(width - capsuleWidth - 16, (generatingNode ? generatingNode.x + generatingNode.width / 2 : width / 2) - capsuleWidth / 2)), top: Math.min(height - capsuleHeight - 104, Math.max(88, (context ? context.y + context.height : generatingNode ? generatingNode.bottom : 88) + 16)), right: "auto", bottom: "auto" }
                : width <= 640
                    ? { left: 16, right: "auto", bottom: dock ? height - dock.top + 16 : 80, maxWidth: launcher ? Math.max(160, launcher.left - 32) : width - 32 }
                    : { bottom: launcher ? height - launcher.top + 16 : 116 };
            const obstacles = [...contextElements.map(bounds), ...(targetPopup ? [bounds(targetPopup)] : []), ...popups.map(bounds)];
            // The next pass reads the resulting geometry; never flush layout
            // between a context/menu write and another read in this pass.
            const scriptControl = width > 640 && !targetPopup && target?.matches('[data-canvas-tour="script-generate"]');
            if (writes.length && !scriptControl) {
                for (const write of writes) write();
                batch.schedule();
                return;
            }
            const next = { holes, obstacles, anchor, context, hand, touch, targetInMenu: Boolean(targetPopup), width, height, cardHeight, suspended, capsuleStyle };
            setLayout((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
            reveal?.();
            // The desktop script button keeps its geometry after marker writes.
            // Composers, ports and inactive modes retain the frame handoff.
            for (const write of writes) write();
        };
        const batch = createFrameThrottledUpdate(measure);
        const observer = new MutationObserver((records) => {
            if (records.some((record) => !(record.target instanceof Element) || !record.target.closest("[data-coach-root]"))) batch.schedule();
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "aria-expanded"] });
        const resize = new ResizeObserver(batch.schedule);
        if (cardRef.current) resize.observe(cardRef.current);
        if (capsuleRef.current) resize.observe(capsuleRef.current);
        window.addEventListener("resize", batch.schedule);
        document.addEventListener("scroll", batch.schedule, true);
        document.addEventListener("canvas:viewport-preview", batch.schedule, true);
        measure();
        return () => {
            if (emptyState) delete emptyState.dataset.coachWelcomeHidden;
            if (markedNode) delete markedNode.dataset.canvasTourActive;
            clearPopup();
            for (const item of markedContext) { delete item.dataset.coachContext; item.style.removeProperty("--coach-touch-size"); }
            batch.cancel();
            observer.disconnect();
            resize.disconnect();
            window.removeEventListener("resize", batch.schedule);
            document.removeEventListener("scroll", batch.schedule, true);
            document.removeEventListener("canvas:viewport-preview", batch.schedule, true);
        };
    }, [props.id, mode, confirming, layout.suspended]);

    useEffect(() => {
        if (!active) return;
        const previous = document.activeElement as HTMLElement | null;
        cardRef.current?.focus({ preventScroll: true });
        let touchTarget: HTMLElement | null = null;
        const pointerdown = (event: PointerEvent) => {
            touchTarget = null;
            if (confirming || event.pointerType !== "touch" || !latest.current.onTargetActivate) return;
            const target = latest.current.target?.();
            if (!target?.matches("[data-canvas-connection-rail]") || !(event.target instanceof Node) || !target.contains(event.target)) return;
            // Opening on pointerup lets the same touch click hit the new menu.
            // Keep the rail in place until click, using its keyboard activation.
            touchTarget = target;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        const click = (event: MouseEvent) => {
            const target = touchTarget;
            touchTarget = null;
            if (!target || !(event.target instanceof Node) || !target.contains(event.target)) return;
            if (latest.current.onTargetActivate?.(target)) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        };
        const pointercancel = () => { touchTarget = null; };
        const keydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                exitReason.current = "closed";
                setConfirming((value) => !value);
                return;
            }
            if (!confirming && (event.key === "Enter" || event.key === " ") && document.activeElement instanceof HTMLElement && latest.current.onTargetActivate?.(document.activeElement)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            if (event.key !== "Tab") return;
            const target = latest.current.target?.();
            const roots = [cardRef.current, ...(confirming ? [] : [target, ...document.querySelectorAll<HTMLElement>(POPUPS)])].filter((el): el is HTMLElement => Boolean(el && visible(el)));
            const controls = [...new Set(roots.flatMap((root) => [...(root.matches(FOCUSABLE) ? [root] : []), ...root.querySelectorAll<HTMLElement>(FOCUSABLE)]))].filter(visible);
            if (!controls.length) {
                event.preventDefault();
                cardRef.current?.focus();
                return;
            }
            const index = controls.indexOf(document.activeElement as HTMLElement);
            const next = event.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length;
            event.preventDefault();
            controls[next].focus();
        };
        document.addEventListener("keydown", keydown, true);
        document.addEventListener("pointerdown", pointerdown, true);
        document.addEventListener("click", click, true);
        document.addEventListener("pointercancel", pointercancel, true);
        return () => {
            document.removeEventListener("keydown", keydown, true);
            document.removeEventListener("pointerdown", pointerdown, true);
            document.removeEventListener("click", click, true);
            document.removeEventListener("pointercancel", pointercancel, true);
            if (previous?.isConnected) previous.focus({ preventScroll: true });
        };
    }, [active, props.id, confirming]);

    const cardWidth = layout.width <= 640 ? layout.width : Math.min(328, layout.width - 32);
    const holes = confirming ? [] : layout.holes;
    const position = placeCoachCard(layout.anchor, layout, { width: cardWidth, height: layout.cardHeight }, { avoid: layout.obstacles, vertical: props.vertical || layout.width < 1120, center: confirming });
    const anchor = layout.anchor;
    const arrowOffset = coachArrowOffset(anchor, { ...position, width: cardWidth, height: layout.cardHeight }, position.placement);
    const arrowStyle: CSSProperties = ["left", "right"].includes(position.placement) ? { top: arrowOffset } : { left: arrowOffset };
    const handPosition = layout.hand && !layout.touch ? placeCoachHand(layout.hand, { ...position, width: cardWidth, height: layout.cardHeight }, layout) : undefined;
    const pulse = layout.hand ? expandCoachRect(layout.hand, 4) : undefined;
    const stepLabel = props.step === undefined ? t("coach.home.badge") : `${props.step} / 9`;
    const title = confirming ? t("coach.skipTitle") : props.title;
    const description = confirming ? t("coach.skipDescription") : layout.targetInMenu && props.menuDescription ? props.menuDescription : layout.width <= 640 && props.mobileDescription ? props.mobileDescription : props.description;
    const rootClass = `coach-mark canvas-onboarding-tour ${theme === "dark" ? "dark" : ""}`;
    return createPortal(
        <div className={rootClass} data-coach-root data-coach-step={props.id} data-coach-confirming={confirming || undefined} data-canvas-no-zoom data-canvas-wheel-scroll>
            <span className="coach-sr-only" role="status" aria-live="polite" aria-atomic="true">
                {mode === "generating" ? t("coach.generating", { type: props.generationLabel || "" }) : confirming ? `${title}. ${description}` : `${stepLabel}. ${title}. ${description}`}
            </span>
            {mode !== "active" ? (
                <button ref={capsuleRef} className="coach-capsule" style={layout.capsuleStyle} type="button" data-coach-capsule={mode} onClick={props.paused ? props.onResume : props.onPause}>
                    {mode === "generating" ? <LoaderCircle className="coach-spinner" size={16} /> : <MousePointer2 size={16} />}
                    {mode === "generating" ? <><span className="coach-capsule-copy"><strong>{t("coach.generating", { type: props.generationLabel || "" })}</strong><span>{t("coach.generatingNext")}</span></span><span className="coach-step">{stepLabel}</span></> : <span>{t("coach.resume", { step: props.step ?? 1, title: props.title })}</span>}
                    {mode === "paused" && <ArrowRight size={16} />}
                </button>
            ) : !layout.suspended ? (
                <>
                    <svg
                        className="coach-mask"
                        width={layout.width}
                        height={layout.height}
                        aria-hidden="true"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (!confirming) props.onPause();
                        }}
                    >
                        <defs>
                            <mask id={`${uid}-mask`}>
                                <rect width="100%" height="100%" fill="white" />
                                {holes.map((rect, i) => (
                                    <path key={i} d={roundedCoachPath(rect)} fill="black" />
                                ))}
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" mask={`url(#${uid}-mask)`} className="coach-shade" style={{ pointerEvents: "none" }} />
                        <path d={`M0,0H${layout.width}V${layout.height}H0Z ${holes.map(roundedCoachPath).join(" ")}`} fill="transparent" fillRule="evenodd" pointerEvents="fill" />
                        {holes.map((rect, i) => (
                            <path key={i} d={roundedCoachPath(rect)} className="coach-ring" />
                        ))}
                    </svg>
                    {!confirming && layout.hand && <>
                        {handPosition && <svg className="coach-hand" style={{ left: handPosition.x, top: handPosition.y, width: handPosition.width, height: handPosition.height }} viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V4a2 2 0 0 1 4 0v6l2-1 5 3v6l-4 4h-5l-7-8a2 2 0 0 1 3-2l2 2" /></svg>}
                        {!handPosition && pulse && <span className="coach-touch-pulse" style={{ left: pulse.x + pulse.width / 2, top: pulse.y + pulse.height / 2, width: pulse.width, height: pulse.height, borderRadius: pulse.radius }} aria-hidden="true" />}
                    </>}
                    <div
                        ref={cardRef}
                        role="dialog"
                        aria-labelledby={`${uid}-title`}
                        aria-describedby={`${uid}-description`}
                        tabIndex={-1}
                        className={`coach-card is-${position.placement}`}
                        data-coach-card
                        style={{ left: position.x, top: position.y, width: cardWidth } as CSSProperties}
                    >
                        {position.placement === "drawer" && <span className="coach-drawer-handle" aria-hidden="true" />}
                        {!confirming && <><button className="coach-close" type="button" aria-label={t("coach.close")} onClick={() => { exitReason.current = "closed"; setConfirming(true); }}>
                            <X size={18} />
                        </button>
                        <span className="coach-step">{stepLabel}</span></>}
                        <h2 id={`${uid}-title`}>{title}</h2>
                        <p id={`${uid}-description`}>{description}</p>
                        {!confirming && props.children}
                        <div className="coach-actions">
                            {confirming ? (
                                <>
                                    <button className="coach-primary" type="button" onClick={() => setConfirming(false)}>
                                        {t("coach.keepGoing")}
                                    </button>
                                    <button className="coach-secondary coach-exit" type="button" onClick={() => props.onSkip(exitReason.current)}>
                                        {t("coach.confirmSkip")}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {props.action ? (
                                        <button className="coach-primary" type="button" onClick={props.action.onClick}>
                                            {props.action.label}
                                            <ArrowRight size={15} />
                                        </button>
                                    ) : (
                                        <span className="coach-point">
                                            {t("coach.tapTarget")}
                                        </span>
                                    )}
                                    <button className="coach-secondary" type="button" onClick={props.secondary?.onClick || (() => { exitReason.current = "skipped"; setConfirming(true); })}>
                                        {props.secondary?.label || t("coach.skip")}
                                    </button>
                                </>
                            )}
                        </div>
                        {!confirming && arrowOffset !== undefined && holes.length > 0 && <span className="coach-arrow" style={arrowStyle} aria-hidden="true" />}
                    </div>
                </>
            ) : null}
        </div>,
        document.body,
    );
}
