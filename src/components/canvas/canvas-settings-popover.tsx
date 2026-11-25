import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "antd";
import { Settings2 } from "lucide-react";
import { canvasThemes } from "@/lib/canvas-theme";
import { settingsPopoverPosition, type SettingsPlacement } from "@/lib/canvas/settings-popover-position";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";

export function CanvasSettingsPopover({
    summary,
    label,
    title,
    placement = "bottomLeft",
    buttonClassName,
    onOpenChange,
    children,
}: {
    summary: string;
    label: string;
    title: string;
    placement?: SettingsPlacement;
    buttonClassName?: string;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}) {
    const theme = canvasThemes[useActiveTheme()];
    const id = useId();
    const trigger = useRef<HTMLSpanElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<ReturnType<typeof settingsPopoverPosition>>();
    const changeOpen = (next: boolean) => {
        setOpen(next);
        onOpenChange?.(next);
    };

    useLayoutEffect(() => {
        if (!open) return;
        const sync = () => {
            const anchor = trigger.current?.getBoundingClientRect();
            if (!anchor) return;
            setPosition(settingsPopoverPosition(anchor, { width: window.innerWidth, height: window.innerHeight }, (content.current?.scrollHeight || 280) + 34, placement));
        };
        const closeOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !trigger.current?.contains(event.target) && !panel.current?.contains(event.target)) changeOpen(false);
        };
        const closeEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            changeOpen(false);
            trigger.current?.querySelector("button")?.focus();
        };
        const observer = new ResizeObserver(sync);
        if (content.current) observer.observe(content.current);
        sync();
        window.addEventListener("resize", sync);
        window.addEventListener("scroll", sync, true);
        window.addEventListener("pointerdown", closeOutside, true);
        window.addEventListener("keydown", closeEscape, true);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", sync);
            window.removeEventListener("scroll", sync, true);
            window.removeEventListener("pointerdown", closeOutside, true);
            window.removeEventListener("keydown", closeEscape, true);
        };
    }, [open, placement]);

    return (
        <>
            <span ref={trigger} className="canvas-generation-settings-anchor inline-flex min-w-0">
                <Button
                    size="small"
                    type="text"
                    className={`canvas-generation-settings-trigger ${buttonClassName || "!h-8 !max-w-[180px] !justify-start !rounded-full !px-2.5"}`}
                    style={{ background: theme.node.fill, color: theme.node.text }}
                    icon={<Settings2 className="size-3.5 shrink-0" />}
                    aria-expanded={open}
                    aria-controls={open ? id : undefined}
                    aria-label={label}
                    title={summary || title}
                    onClick={() => changeOpen(!open)}
                >
                    <span className="truncate">{summary}</span>
                </Button>
            </span>
            {open
                ? createPortal(
                      <div
                          ref={panel}
                          id={id}
                          role="dialog"
                          aria-label={title}
                          data-canvas-no-zoom
                          data-canvas-wheel-scroll
                          className="canvas-generation-parameters"
                          style={{
                              position: "fixed",
                              zIndex: "var(--z-dialog-popover)",
                              width: position?.width || 336,
                              maxWidth: "calc(100vw - 24px)",
                              maxHeight: position?.maxHeight,
                              top: position?.top,
                              left: position?.left,
                              visibility: position ? "visible" : "hidden",
                              boxSizing: "border-box",
                              overflowY: "auto",
                              overscrollBehavior: "contain",
                              background: theme.node.panel,
                              color: theme.node.text,
                              border: `1px solid ${theme.toolbar.border}`,
                              borderRadius: 16,
                              boxShadow: theme.node.shadow,
                              padding: 16,
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                          onWheel={(event) => event.stopPropagation()}
                      >
                          <div ref={content}>
                              <div className="mb-3 text-[var(--fs-tiny)]" aria-label={label}>
                                  {summary}
                              </div>
                              {children}
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
