import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { App } from "antd";
import { Check, Search, Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CanvasStylePickerModal, canvasStylePresets, userStylePreset, type CanvasStylePreset } from "./canvas-style-picker-modal";
import { upstreamImageStyles } from "@/lib/canvas/upstream-image-styles";
import { readStyleIds, STYLE_FAVORITES_KEY, STYLE_RECENT_KEY, stylePopoverPosition, uniquePublicStyles } from "@/lib/canvas/style-picker-library";
import { scopedLocalStorage } from "@/lib/user-scope";
import { listStyleProfiles, setStyleProfileFavorite, touchStyleProfile, type UserStyleProfile } from "@/services/api/style-profiles";
import { useUserStore } from "@/stores/use-user-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { useI18n } from "@/i18n/use-i18n";
import { styleDisplayMetadata } from "@/i18n/style-metadata";
import { communityImageMatchScore } from "@/lib/prompts/community-image-catalog";
import type { StyleProfileSnapshot } from "@/lib/canvas/style-profile";
import "./canvas-style-picker-popover.css";

type Tab = "public" | "favorites" | "custom";
type Item = { preset: CanvasStylePreset; entity?: UserStyleProfile };
const publicPresets = uniquePublicStyles([...upstreamImageStyles, ...canvasStylePresets]);
const PAGE_SIZE = 25;

export function CanvasStylePickerPopover({
    open,
    applying,
    currentProfile,
    currentPrompt = "",
    projectStyle,
    onOpenChange,
    onSelect,
    onClear,
    children,
}: {
    open: boolean;
    applying: boolean;
    currentProfile: StyleProfileSnapshot | null;
    currentPrompt?: string;
    projectStyle?: CanvasStylePreset;
    onOpenChange: (open: boolean) => void;
    onSelect: (preset: CanvasStylePreset) => void;
    onClear: () => void;
    children: ReactNode;
}) {
    const { t, locale, number } = useI18n();
    const panelId = useId();
    const { message } = App.useApp();
    const theme = canvasThemes[useActiveTheme()];
    const userId = useUserStore((state) => state.user?.id);
    const queryClient = useQueryClient();
    const anchorRef = useRef<HTMLSpanElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<ReturnType<typeof stylePopoverPosition> | null>(null);
    const [modalLayer, setModalLayer] = useState<number>();
    const [tab, setTab] = useState<Tab>("public");
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [managing, setManaging] = useState(false);
    const profiles = useQuery({ queryKey: ["style-profiles", userId], queryFn: listStyleProfiles, enabled: open });
    const favoriteMutation = useMutation({
        mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => setStyleProfileFavorite(id, favorite),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["style-profiles"] }),
        onError: (error) => message.error(error instanceof Error ? error.message : t("styleCenter.favoriteError")),
    });

    useEffect(() => {
        if (!open) return;
        setFavoriteIds(readStyleIds(STYLE_FAVORITES_KEY));
    }, [open, userId]);
    useEffect(() => {
        setTab("public");
        setQuery("");
        setCategory("");
        setManaging(false);
        onOpenChange(false);
        // Close account-specific views before they can show a different account's data.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
    useEffect(() => {
        setLimit(PAGE_SIZE);
        scrollRef.current?.scrollTo({ top: 0 });
    }, [tab, query, category]);

    useLayoutEffect(() => {
        if (!open) {
            setPosition(null);
            return;
        }
        let frame = 0;
        let active = true;
        function update() {
            if (!active) return;
            const anchor = anchorRef.current;
            if (!anchor) return;
            const rect = anchor.getBoundingClientRect();
            const modalWrap = anchor.closest(".ant-modal-wrap");
            setModalLayer(modalWrap ? (Number.parseInt(getComputedStyle(modalWrap).zIndex, 10) || 0) + 1 : undefined);
            const composer = anchor.closest(".canvas-node-composer, .canvas-prompt-editor-modal .ant-modal-container") || anchor;
            const next = stylePopoverPosition(rect, composer.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
            setPosition((previous) => (previous && Object.keys(next).every((key) => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next));
            // Canvas pan and zoom use transforms; scroll/resize events alone cannot track the anchor.
            frame = requestAnimationFrame(update);
        }
        update();
        return () => {
            active = false;
            cancelAnimationFrame(frame);
        };
    }, [open]);
    useEffect(() => {
        if (!open || !position) return;
        searchRef.current?.focus({ preventScroll: true });
        // Only focus when the portal first becomes visible, not when its anchor moves.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, Boolean(position)]);
    useEffect(() => {
        if (!open) return;
        function outside(event: PointerEvent) {
            if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !anchorRef.current?.contains(event.target)) onOpenChange(false);
        }
        function escape(event: globalThis.KeyboardEvent) {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            onOpenChange(false);
            anchorRef.current?.querySelector("button")?.focus({ preventScroll: true });
        }
        document.addEventListener("pointerdown", outside, true);
        document.addEventListener("keydown", escape, true);
        return () => {
            document.removeEventListener("pointerdown", outside, true);
            document.removeEventListener("keydown", escape, true);
        };
    }, [open, onOpenChange]);

    const customItems = useMemo<Item[]>(() => {
        if (!open) return [];
        const items: Item[] = (profiles.data?.profiles || []).flatMap((entity) => {
            const preset = userStylePreset(entity, t("stylePicker.custom"));
            return preset ? [{ preset, entity }] : [];
        });
        if (projectStyle && !items.some((item) => item.preset.id === projectStyle.id)) items.unshift({ preset: projectStyle.profile?.source !== "builtin" ? { ...projectStyle, category: t("stylePicker.custom") } : projectStyle });
        if (currentProfile && currentProfile.source !== "builtin" && !items.some((item) => item.preset.id === currentProfile.presetId)) {
            items.push({
                preset: {
                    id: currentProfile.presetId,
                    title: currentProfile.title,
                    description: currentProfile.description,
                    tags: currentProfile.tags,
                    prompt: currentProfile.prompt,
                    category: t("stylePicker.custom"),
                    imageUrl: currentProfile.coverUrl || "/short-drama-styles/real-life.jpg",
                    profile: currentProfile,
                },
            });
        }
        return items;
    }, [open, profiles.data, projectStyle, currentProfile, t]);
    const source = useMemo<Item[]>(
        () =>
            !open ? [] : tab === "public"
                ? publicPresets.map((preset) => ({ preset }))
                : tab === "custom"
                  ? customItems
                  : Array.from(new Map([...publicPresets.map<Item>((preset) => ({ preset })), ...customItems].map((item) => [item.preset.id, item])).values()).filter((item) => (item.entity ? item.entity.favorite : favoriteIds.includes(item.preset.id))),
        [open, tab, customItems, favoriteIds],
    );
    const categories = useMemo(() => Array.from(new Map(source.map(({ preset }) => [preset.category, styleDisplayMetadata(preset, t, locale).category]))), [source, t, locale]);
    const recommendedIds = useMemo(() => {
        if (!open || !currentPrompt.trim()) return new Set<string>();
        const ranked = publicPresets
            .map((preset) => ({ id: preset.id, score: communityImageMatchScore(currentPrompt, { title: preset.title, category: preset.category, styles: preset.tags, scenes: [] }) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        return new Set(ranked.map(({ id }) => id));
    }, [open, currentPrompt]);
    const visible = useMemo(() => {
        const keyword = query.trim().toLocaleLowerCase(locale);
        const filtered = source.filter(({ preset }) => {
            const display = styleDisplayMetadata(preset, t, locale);
            return (!category || category === preset.category) && (!keyword || [display.title, display.category, ...display.tags, preset.title, preset.category, ...preset.tags].join(" ").toLocaleLowerCase(locale).includes(keyword));
        });
        if (tab === "public" && !query && !category && recommendedIds.size) filtered.sort((a, b) => Number(recommendedIds.has(b.preset.id)) - Number(recommendedIds.has(a.preset.id)));
        return filtered;
    }, [source, category, query, t, locale, tab, recommendedIds]);

    function favorite(item: Item) {
        if (item.entity) {
            favoriteMutation.mutate({ id: item.entity.id, favorite: !item.entity.favorite });
            return;
        }
        const next = favoriteIds.includes(item.preset.id) ? favoriteIds.filter((id) => id !== item.preset.id) : [item.preset.id, ...favoriteIds].slice(0, 100);
        try {
            scopedLocalStorage.setItem(STYLE_FAVORITES_KEY, JSON.stringify(next));
            setFavoriteIds(next);
        } catch {
            message.error(t("styleCenter.favoriteError"));
        }
    }
    function select(item: Item) {
        if (applying) return;
        if (currentProfile?.presetId === item.preset.id) {
            onClear();
            message.success(t("stylePicker.cleared"));
            return;
        }
        onSelect(item.preset);
        message.success(t("stylePicker.applied", { name: styleDisplayMetadata(item.preset, t, locale).title }));
        try {
            scopedLocalStorage.setItem(STYLE_RECENT_KEY, JSON.stringify([item.preset.id, ...readStyleIds(STYLE_RECENT_KEY).filter((id) => id !== item.preset.id)].slice(0, 12)));
        } catch {
            message.warning(t("styleCenter.recentError"));
        }
        if (item.entity)
            void touchStyleProfile(item.entity.id)
                .then(() => queryClient.invalidateQueries({ queryKey: ["style-profiles"] }))
                .catch(() => message.warning(t("styleCenter.recentError")));
    }
    function moveFocus(event: KeyboardEvent<HTMLElement>) {
        const container = (event.target as HTMLElement).closest("[data-style-navigation]");
        if (!container) return;
        const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-style-option]:not(:disabled)"));
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        const cols = container.classList.contains("canvas-style-popover-grid") ? getComputedStyle(container).gridTemplateColumns.split(" ").length : 1;
        const next =
            event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "ArrowDown" ? index + cols : event.key === "ArrowUp" ? index - cols : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : null;
        if (next === null) return;
        event.preventDefault();
        const target = buttons[Math.max(0, Math.min(next, buttons.length - 1))];
        target?.focus();
        if (target?.getAttribute("role") === "tab") target.click();
    }
    const tokens = {
        "--style-picker-bg": theme.node.panel,
        "--style-picker-text": theme.node.text,
        "--style-picker-muted": theme.node.muted,
        "--style-picker-border": theme.node.stroke,
        "--style-picker-hover": theme.toolbar.itemHover,
        "--style-picker-selected": theme.toolbar.activeBg,
        "--style-picker-accent": theme.node.activeStroke,
    } as CSSProperties;
    return (
        <>
            <span ref={anchorRef} className="inline-flex">
                {children}
            </span>
            {open && position
                ? createPortal(
                      <div
                          ref={panelRef}
                          className="canvas-style-popover"
                          role="dialog"
                          aria-modal="false"
                          aria-label={t("canvasAgentEntry.style")}
                          data-canvas-no-zoom
                          data-canvas-wheel-scroll
                          style={{ ...tokens, ...position, zIndex: modalLayer }}
                          onPointerDown={(event) => event.stopPropagation()}
                          onWheel={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                              moveFocus(event);
                              event.stopPropagation();
                          }}
                          onBlur={(event) => {
                              if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && !anchorRef.current?.contains(event.relatedTarget)) onOpenChange(false);
                          }}
                      >
                          <header className="canvas-style-popover-header">
                              <div role="tablist" aria-label={t("stylePicker.tabs")} data-style-navigation>
                                  {(["public", "favorites", "custom"] as const).map((name) => (
                                      <button
                                          type="button"
                                          role="tab"
                                          key={name}
                                          id={`${panelId}-${name}`}
                                          aria-controls={panelId}
                                          aria-selected={tab === name}
                                          tabIndex={tab === name ? 0 : -1}
                                          data-style-option
                                          onClick={() => {
                                              setTab(name);
                                              setCategory("");
                                          }}
                                      >
                                          {t(name === "favorites" ? "styleCenter.favorites" : name === "custom" ? "stylePicker.custom" : "stylePicker.public")}
                                      </button>
                                  ))}
                              </div>
                              <label className="canvas-style-popover-search">
                                  <Search size={14} aria-hidden />
                                  <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("stylePicker.search")} aria-label={t("stylePicker.search")} />
                              </label>
                              <button
                                  type="button"
                                  className="canvas-style-popover-manage"
                                  onClick={() => {
                                      onOpenChange(false);
                                      setManaging(true);
                                  }}
                              >
                                  {t("stylePicker.manage")}
                              </button>
                          </header>
                          <div className="canvas-style-popover-categories thin-scrollbar" aria-label={t("styleCenter.category")} data-style-navigation>
                              <button type="button" data-style-option aria-pressed={!category} onClick={() => setCategory("")}>
                                  {t("stylePicker.all")}
                              </button>
                              {categories.map(([id, label]) => (
                                  <button type="button" key={id} data-style-option aria-pressed={category === id} onClick={() => setCategory(id)}>
                                      {label}
                                  </button>
                              ))}
                          </div>
                          <div ref={scrollRef} id={panelId} className="canvas-style-popover-scroll thin-scrollbar" role="tabpanel" aria-labelledby={`${panelId}-${tab}`}>
                              <div className="canvas-style-popover-grid" data-style-navigation>
                                  {visible.slice(0, limit).map((item) => {
                                      const display = styleDisplayMetadata(item.preset, t, locale);
                                      const active = currentProfile?.presetId === item.preset.id;
                                      const saved = item.entity ? item.entity.favorite : favoriteIds.includes(item.preset.id);
                                      return (
                                          <div key={item.preset.id} className={`canvas-style-popover-card ${active ? "is-selected" : ""}`}>
                                              <button type="button" className="canvas-style-popover-select" data-style-option aria-pressed={active} aria-label={display.title} disabled={applying} title={display.description} onClick={() => select(item)}>
                                                  <img
                                                      src={item.preset.imageUrl}
                                                      alt={t("styleCenter.previewAlt", { name: display.title })}
                                                      width={160}
                                                      height={100}
                                                      loading="lazy"
                                                      decoding="async"
                                                      onError={(event) => {
                                                          if (!event.currentTarget.src.endsWith("/short-drama-styles/real-life.jpg")) event.currentTarget.src = "/short-drama-styles/real-life.jpg";
                                                      }}
                                                  />
                                                  <span>{display.title}</span>
                                                  {tab === "public" && !query && !category && recommendedIds.has(item.preset.id) ? <span className="canvas-style-popover-recommended">{t("stylePicker.recommended")}</span> : null}
                                                  {active ? <Check className="canvas-style-popover-check" size={16} aria-hidden /> : null}
                                              </button>
                                              <button
                                                  type="button"
                                                  className="canvas-style-popover-favorite"
                                                  aria-pressed={saved}
                                                  aria-label={t(saved ? "stylePicker.unfavoriteNamed" : "stylePicker.favoriteNamed", { name: display.title })}
                                                  disabled={Boolean(item.entity) && favoriteMutation.isPending}
                                                  onClick={() => favorite(item)}
                                              >
                                                  <Star size={13} fill={saved ? "currentColor" : "none"} />
                                              </button>
                                          </div>
                                      );
                                  })}
                              </div>
                              {tab !== "public" && profiles.isError ? (
                                  <div className="canvas-style-popover-empty" role="status">
                                      {t("styleCenter.loadError")}{" "}
                                      <button type="button" onClick={() => void profiles.refetch()}>
                                          {t("stylePicker.retry")}
                                      </button>
                                  </div>
                              ) : null}
                              {!visible.length ? (
                                  <p className="canvas-style-popover-empty" role="status">
                                      {tab !== "public" && profiles.isLoading
                                          ? t("styleCenter.loading")
                                          : query || category
                                            ? t("stylePicker.emptySearch")
                                            : tab === "custom"
                                              ? t("styleCenter.emptyMine")
                                              : tab === "favorites"
                                                ? t("styleCenter.emptyFavorites")
                                                : t("styleCenter.emptySystem")}
                                  </p>
                              ) : null}
                              {visible.length > limit ? (
                                  <button type="button" className="canvas-style-popover-more" onClick={() => setLimit((count) => count + PAGE_SIZE)}>
                                      {t("stylePicker.more")}
                                  </button>
                              ) : null}
                          </div>
                          <footer className="canvas-style-popover-footer">
                              {t("styleCenter.count", { count: number(visible.length) })}
                              <span>{t("stylePicker.hint")}</span>
                          </footer>
                      </div>,
                      document.body,
                  )
                : null}
            <CanvasStylePickerModal
                open={managing}
                includeImageStyles
                value={currentProfile?.presetId}
                currentProfile={currentProfile}
                applying={applying}
                onClose={() => {
                    setManaging(false);
                    anchorRef.current?.querySelector("button")?.focus();
                }}
                onSelect={(preset) => {
                    onSelect(preset);
                    setManaging(false);
                    message.success(t("stylePicker.applied", { name: styleDisplayMetadata(preset, t, locale).title }));
                }}
            />
        </>
    );
}
