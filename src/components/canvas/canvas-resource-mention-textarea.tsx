import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ClipboardEvent, DragEvent, KeyboardEvent, MouseEvent, PointerEvent, TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, FileText, Folder, Image as ImageIcon, Music2, Pencil, Search, UserRound, Video, Workflow } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useI18n } from "@/i18n/use-i18n";
import { localizedCanvasReferenceLabel } from "@/i18n/canvas-reference-label";
import { translateMessage, type MessageKey } from "@/i18n/messages";
import { ASSET_CATEGORY_LABELS } from "@/lib/asset-category";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { buildAssetMentionReferences, canvasResourceMentionToken, findCanvasResourceAutoLinkMatch, type CanvasResourceAutoLinkMatch, type CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { useAssetStore, type AssetCategory } from "@/stores/use-asset-store";
import { CanvasNodeType } from "@/types/canvas";
import { resolveAppLocale } from "@/i18n/app-locale";
import { reportResourcePreviewFailure, useResolvedCanvasResourceReferences } from "./use-resolved-canvas-resource-references";
import { useCanvasReferenceHoverPreview } from "./canvas-reference-hover-preview";
import { canvasMentionTokenMatchesAt } from "@/lib/canvas/generation-mention-tokens";

import { clamp } from "@/lib/utils";
import { useCanvasTextEdit } from "./use-canvas-text-edit";
type MentionState = {
    start: number;
    end: number;
    query: string;
};

const categoryLabelKeys: Record<AssetCategory, MessageKey> = {
    character: "resourceMention.character",
    environment: "resourceMention.environment",
    prop: "resourceMention.prop",
    material: "resourceMention.material",
    other: "resourceMention.other",
    wardrobe: "resourceMention.wardrobe",
    weapon: "resourceMention.weapon",
    style: "resourceMention.style",
    shot: "assets.catShot",
};

type EditableSelection = {
    start: number;
    end: number;
};

type MentionTextPart =
    | {
          type: "text";
          text: string;
      }
    | {
          type: "mention";
          token: string;
          reference: CanvasResourceReference;
      };

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
    value: string;
    references: CanvasResourceReference[];
    onSelectReference?: (reference: CanvasResourceReference) => CanvasResourceReference | undefined;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    containerClassName?: string;
    highlightLabels?: boolean;
    mentionMenuWidth?: number;
    sendOnEnter?: boolean;
    onContentSizeChange?: (height: number) => void;
    includeAssetLibrary?: boolean;
    activeDropReferenceId?: string | null;
    onReferenceFilesDrop?: (reference: CanvasResourceReference, files: File[]) => void;
    autoLinkEnabled?: boolean;
    batchChanges?: boolean;
    /** Override the section title shown for references in the mention menu (default: "已连接节点" / "References"). */
    referenceSectionTitle?: string;
    /** Override the mention menu's search placeholder (default: nodes, assets or skills). */
    mentionSearchPlaceholder?: string;
};

export const CanvasResourceMentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function CanvasResourceMentionTextarea(
    {
        value: externalValue,
        references,
        onSelectReference,
        onChange: onExternalChange,
        onSubmit,
        onKeyDown,
        className,
        containerClassName,
        style,
        highlightLabels = true,
        mentionMenuWidth = 320,
        sendOnEnter = true,
        onContentSizeChange,
        includeAssetLibrary = false,
        activeDropReferenceId,
        onReferenceFilesDrop,
        autoLinkEnabled = false,
        batchChanges = false,
        referenceSectionTitle,
        mentionSearchPlaceholder,
        ...props
    },
    forwardedRef,
) {
    const edit = useCanvasTextEdit(externalValue, onExternalChange, batchChanges);
    const { value, onChange } = edit;
    const { t, locale } = useI18n();
    const rawTheme = useActiveTheme();
    const assets = useAssetStore((state) => state.assets);
    const theme = canvasThemes[rawTheme as keyof typeof canvasThemes] ?? canvasThemes.dark;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);
    const composingRef = useRef(false);
    const pendingSelectionRef = useRef<number | null>(null);
    const restoreFocusRef = useRef(false);
    const assignTextareaRef = useCallback(
        (node: HTMLTextAreaElement | null) => {
            if (!node && textareaRef.current && document.activeElement === textareaRef.current) {
                pendingSelectionRef.current = textareaRef.current.selectionStart;
                pendingScrollTopRef.current = textareaRef.current.scrollTop;
                restoreFocusRef.current = true;
            }
            textareaRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
        },
        [forwardedRef],
    );
    const pendingScrollTopRef = useRef<number | null>(null);
    const lastRenderedValueRef = useRef("");
    const [mention, setMention] = useState<MentionState | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [autoLinkCursor, setAutoLinkCursor] = useState<number | null>(null);
    const autoLinkSuggestionRef = useRef<HTMLButtonElement | null>(null);
    const [autoLinkPosition, setAutoLinkPosition] = useState<{ left: number; top: number } | null>(null);
    const [nativeDropReferenceId, setNativeDropReferenceId] = useState<string | null>(null);
    const [previewReference, setPreviewReference] = useState<CanvasResourceReference | null>(null);
    const canvasReferences = useResolvedCanvasResourceReferences(references);
    const rawAssetReferences = useMemo(() => (includeAssetLibrary ? buildAssetMentionReferences(assets) : []), [assets, includeAssetLibrary]);
    const assetReferences = useResolvedCanvasResourceReferences(rawAssetReferences);
    const activeCanvasReferences = useMemo(() => canvasReferences.filter((item) => item.active), [canvasReferences]);
    const availableReferences = useMemo(() => [...(onSelectReference ? canvasReferences : activeCanvasReferences), ...assetReferences], [onSelectReference, canvasReferences, activeCanvasReferences, assetReferences]);
    const candidates = useMemo(() => {
        if (!mention) return [];
        const query = mention.query.trim().toLowerCase();
        if (!query) return onSelectReference ? canvasReferences : activeCanvasReferences;
        return availableReferences.filter((item) => `${localizedCanvasReferenceLabel(item, t)} ${item.label} ${item.title} ${item.kind} ${item.category || ""} ${item.text || ""}`.toLowerCase().includes(query));
    }, [onSelectReference, canvasReferences, activeCanvasReferences, availableReferences, mention, t]);
    const activeReferences = useMemo(() => {
        if (!highlightLabels) return [];
        return [...activeCanvasReferences, ...assetReferences.filter((item) => value.includes(canvasResourceMentionToken(item)))];
    }, [activeCanvasReferences, assetReferences, highlightLabels, value]);
    const useRichEditor = Boolean(activeReferences.length);
    const hoverPreview = useCanvasReferenceHoverPreview(activeReferences);
    const autoLinkMatch = useMemo<CanvasResourceAutoLinkMatch | null>(
        () => (autoLinkEnabled && autoLinkCursor !== null ? findCanvasResourceAutoLinkMatch(value, autoLinkCursor, activeCanvasReferences) : null),
        [activeCanvasReferences, autoLinkCursor, autoLinkEnabled, value],
    );
    const contentSizeCallback = useRef(onContentSizeChange);
    contentSizeCallback.current = onContentSizeChange;
    const hasContentSizeCallback = Boolean(onContentSizeChange);
    const referenceSizeKey = activeReferences.map((reference) => `${reference.id}:${localizedCanvasReferenceLabel(reference, t)}`).join("\n");
    const contentMeasured = useRef(false);
    const reportContentSize = useCallback((element: HTMLElement | null) => {
        if (!element || !contentSizeCallback.current) return;
        const previous = { height: element.style.height, minHeight: element.style.minHeight, maxHeight: element.style.maxHeight, overflow: element.style.overflow };
        element.style.height = "1px";
        element.style.minHeight = "0";
        element.style.maxHeight = "none";
        element.style.overflow = "hidden";
        const height = Math.ceil(element.scrollHeight);
        element.style.height = previous.height;
        element.style.minHeight = previous.minHeight;
        element.style.maxHeight = previous.maxHeight;
        element.style.overflow = previous.overflow;
        contentSizeCallback.current(height);
    }, []);

    useLayoutEffect(() => {
        if (!useRichEditor) pendingScrollTopRef.current = null;
    }, [useRichEditor, value]);

    useLayoutEffect(() => {
        if (!useRichEditor) return;
        const editor = editorRef.current;
        if (!editor || composingRef.current) return;
        const isFocused = document.activeElement === editor || restoreFocusRef.current;
        const currentValue = serializeEditableValue(editor);
        if (currentValue === value && lastRenderedValueRef.current === value && !editor.querySelector("div, p")) {
            syncInlineMentionPreviews(editor, activeReferences);
            pendingSelectionRef.current = null;
            return;
        }
        const selection = pendingSelectionRef.current ?? (isFocused ? (getEditableSelection(editor)?.start ?? null) : null);
        const scrollTop = pendingScrollTopRef.current;
        renderEditableContent(editor, value, activeReferences);
        lastRenderedValueRef.current = value;
        if (isFocused && selection !== null) {
            editor.focus({ preventScroll: true });
            setEditableSelection(editor, selection);
        }
        restoreFocusRef.current = false;
        pendingSelectionRef.current = null;
        if (scrollTop !== null) editor.scrollTop = scrollTop;
        pendingScrollTopRef.current = null;
    }, [activeReferences, locale, useRichEditor, value]);

    useLayoutEffect(() => {
        const anchor = useRichEditor ? editorRef.current : textareaRef.current;
        const suggestion = autoLinkSuggestionRef.current;
        if (!autoLinkMatch || !anchor || !suggestion) {
            setAutoLinkPosition(null);
            return;
        }
        const updatePosition = () => {
            const caret = mentionCaretRect(anchor, autoLinkMatch.end);
            const bounds = suggestion.getBoundingClientRect();
            setAutoLinkPosition({
                left: clamp(caret.right + 8, 12, window.innerWidth - bounds.width - 12),
                top: clamp(caret.bottom + 4, 12, window.innerHeight - bounds.height - 12),
            });
        };
        updatePosition();
        const observer = new ResizeObserver(updatePosition);
        observer.observe(anchor);
        observer.observe(suggestion);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [autoLinkMatch, useRichEditor, value]);

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const dropReferenceId = nativeDropReferenceId || activeDropReferenceId || "";
        editor.querySelectorAll<HTMLElement>("[data-mention-reference-id]").forEach((chip) => {
            chip.classList.toggle("is-replace-target", Boolean(dropReferenceId) && chip.dataset.mentionReferenceId === dropReferenceId);
        });
    }, [activeDropReferenceId, nativeDropReferenceId, useRichEditor, value]);

    useLayoutEffect(() => {
        const element = useRichEditor ? editorRef.current : textareaRef.current;
        const container = containerRef.current;
        if (!element || !container || !hasContentSizeCallback) return;
        // Measure once after React and the rich editor have committed the value.
        // Measuring in onChange as well forces two layouts for every keystroke.
        // On first mount the observer's initial callback (after layout, before paint) measures instead:
        // a synchronous read there forced a full layout of the whole freshly mounted page (~300 ms at 4× CPU).
        const initialMount = !contentMeasured.current;
        if (!initialMount) reportContentSize(element);
        contentMeasured.current = true;
        let width: number | undefined;
        const observer = new ResizeObserver(([entry]) => {
            const nextWidth = entry.contentRect.width;
            if (width === undefined) {
                width = nextWidth;
                if (initialMount) reportContentSize(element);
                return;
            }
            if (nextWidth === width) return;
            width = nextWidth;
            reportContentSize(element);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [referenceSizeKey, locale, hasContentSizeCallback, reportContentSize, useRichEditor, value, className, style?.fontSize, style?.lineHeight]);

    const focusEditor = (selectionStart?: number) => {
        requestAnimationFrame(() => {
            const editor = editorRef.current;
            if (editor) {
                const scrollTop = editor.scrollTop;
                editor.focus({ preventScroll: true });
                if (typeof selectionStart === "number") setEditableSelection(editor, selectionStart);
                editor.scrollTop = scrollTop;
                return;
            }
            const textarea = textareaRef.current;
            if (!textarea) return;
            const scrollTop = textarea.scrollTop;
            textarea.focus({ preventScroll: true });
            if (typeof selectionStart === "number") textarea.setSelectionRange(selectionStart, selectionStart);
            textarea.scrollTop = scrollTop;
        });
    };

    const updateValue = (next: string, selectionStart?: number) => {
        if (typeof selectionStart === "number") pendingSelectionRef.current = selectionStart;
        const editor = editorRef.current ?? textareaRef.current;
        pendingScrollTopRef.current = editor?.scrollTop ?? null;
        onChange(next);
        if (typeof selectionStart === "number") focusEditor(selectionStart);
    };

    const closeMention = () => {
        setMention(null);
        setActiveIndex(-1);
    };

    const syncMention = (nextValue: string, cursor: number) => {
        setAutoLinkCursor(cursor);
        const prefix = nextValue.slice(0, cursor);
        const match = /@([^\s@,.;:!?，。；：！？、)\]}】）]*)$/.exec(prefix);
        if (!match || !availableReferences.length) {
            closeMention();
            return;
        }
        const nextMention = { start: match.index, end: cursor, query: match[1] };
        const isSameMention = mention?.start === nextMention.start && mention.end === nextMention.end && mention.query === nextMention.query;
        if (!isSameMention) {
            setMention(nextMention);
            setActiveIndex(-1);
        }
    };

    const insertReference = (reference: CanvasResourceReference) => {
        if (!mention) return;
        const selected = onSelectReference ? onSelectReference(reference) : reference;
        if (!selected) return;
        const insertText = `${canvasResourceMentionToken(selected)} `;
        const next = `${value.slice(0, mention.start)}${insertText}${value.slice(mention.end)}`;
        closeMention();
        updateValue(next, mention.start + insertText.length);
    };

    const replaceEditableSelection = (insertText: string) => {
        const currentValue = editorRef.current ? serializeEditableValue(editorRef.current) : value;
        const textarea = textareaRef.current;
        const selection = getEditableSelection(editorRef.current) || (textarea ? { start: textarea.selectionStart, end: textarea.selectionEnd } : null) || { start: currentValue.length, end: currentValue.length };
        const next = `${currentValue.slice(0, selection.start)}${insertText}${currentValue.slice(selection.end)}`;
        const cursor = selection.start + insertText.length;
        updateValue(next, cursor);
        syncMention(next, cursor);
    };

    const insertAutoLink = (match: CanvasResourceAutoLinkMatch) => {
        const currentValue = editorRef.current ? serializeEditableValue(editorRef.current) : value;
        const insertText = `${canvasResourceMentionToken(match.reference)} `;
        const next = `${currentValue.slice(0, match.start)}${insertText}${currentValue.slice(match.end)}`;
        updateValue(next, match.start + insertText.length);
        setAutoLinkCursor(match.start + insertText.length);
    };

    const autoLinkSuggestion = autoLinkMatch
        ? createPortal(
              <button
                  ref={autoLinkSuggestionRef}
                  type="button"
                  data-canvas-no-zoom
                  className="fixed z-[var(--z-tooltip)] inline-flex max-w-[min(360px,calc(100vw-24px))] items-center gap-1.5 rounded-md border border-current/15 px-2 py-1 text-[var(--fs-micro)] shadow-sm"
                  style={{ ...autoLinkPosition, visibility: autoLinkPosition ? "visible" : "hidden", background: theme.node.panel, color: theme.node.text }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                  }}
                  onClick={(event) => {
                      event.stopPropagation();
                      insertAutoLink(autoLinkMatch);
                  }}
                  aria-label={t("resourceMention.reference", { label: localizedCanvasReferenceLabel(autoLinkMatch.reference, t) })}
              >
                  <span className="truncate">{t("resourceMention.autoLink", { query: autoLinkMatch.query, label: localizedCanvasReferenceLabel(autoLinkMatch.reference, t) })}</span>
                  <kbd className="shrink-0 rounded border border-current/20 px-1 font-mono text-[var(--fs-micro)]">Tab</kbd>
              </button>,
              referenceOverlayContainer(editorRef.current ?? textareaRef.current),
          )
        : null;

    const syncEditableValue = () => {
        if (composingRef.current) return;
        const editor = editorRef.current;
        if (!editor) return;
        const next = serializeEditableValue(editor);
        const cursor = getEditableSelection(editor)?.start ?? next.length;
        pendingSelectionRef.current = cursor;
        lastRenderedValueRef.current = next;
        onChange(next);
        syncMention(next, cursor);
    };

    const syncEditableMentionFromSelection = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const selection = getEditableSelection(editor);
        if (!selection || selection.start !== selection.end) {
            setAutoLinkCursor(null);
            return;
        }
        syncMention(serializeEditableValue(editor), selection.start);
    };

    const referenceForDropTarget = (target: EventTarget | null) => {
        const element = target instanceof Element ? target.closest<HTMLElement>("[data-mention-reference-id]") : null;
        const referenceId = element?.dataset.mentionReferenceId;
        return referenceId ? activeReferences.find((reference) => reference.id === referenceId) : undefined;
    };

    const imageFilesFromTransfer = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));

    const mergedStyle = {
        ...(style || {}),
        caretColor: style?.color || theme.node.text,
    } as CSSProperties;
    const menuAnchor = useRichEditor ? editorRef.current : textareaRef.current;
    const menu =
        mention && availableReferences.length && menuAnchor ? (
            <MentionMenu
                anchor={menuAnchor}
                connectedReferences={activeCanvasReferences}
                assetReferences={assetReferences}
                filteredReferences={candidates}
                query={mention.query}
                cursorOffset={mention.end}
                activeReferenceId={activeIndex >= 0 ? candidates[Math.min(activeIndex, candidates.length - 1)]?.id : undefined}
                preferredWidth={mentionMenuWidth}
                onQueryChange={(query) => setMention((current) => (current ? { ...current, query } : current))}
                onClose={closeMention}
                onSelect={insertReference}
                referenceSectionTitle={referenceSectionTitle}
                searchPlaceholder={mentionSearchPlaceholder}
            />
        ) : null;

    if (useRichEditor) {
        return (
            <div ref={containerRef} {...hoverPreview.handlers} data-canvas-no-zoom className={`relative w-full min-h-0 overflow-hidden ${containerClassName || "h-full"}`}>
                {!value && props.placeholder ? (
                    <div aria-hidden className={`${className || ""} pointer-events-none absolute inset-0 z-0`} style={{ ...style, color: style?.color || theme.node.text, opacity: 0.4 }}>
                        {props.placeholder}
                    </div>
                ) : null}
                <div
                    ref={editorRef}
                    role="textbox"
                    aria-multiline="true"
                    aria-label={props["aria-label"]}
                    aria-disabled={props.disabled}
                    contentEditable={!props.disabled && !props.readOnly}
                    suppressContentEditableWarning
                    spellCheck={props.spellCheck}
                    tabIndex={props.tabIndex}
                    className={`${className || ""} relative z-10 cursor-text select-text whitespace-pre-wrap break-words`}
                    style={{ ...mergedStyle, color: style?.color || theme.node.text }}
                    onInput={syncEditableValue}
                    onCompositionStart={(event) => {
                        edit.onCompositionStart();
                        composingRef.current = true;
                        props.onCompositionStart?.(event as unknown as React.CompositionEvent<HTMLTextAreaElement>);
                    }}
                    onCompositionEnd={(event) => {
                        composingRef.current = false;
                        syncEditableValue();
                        props.onCompositionEnd?.(event as unknown as React.CompositionEvent<HTMLTextAreaElement>);
                    }}
                    onPaste={(event: ClipboardEvent<HTMLDivElement>) => {
                        event.preventDefault();
                        replaceEditableSelection(event.clipboardData.getData("text/plain"));
                    }}
                    onDragOver={(event: DragEvent<HTMLDivElement>) => {
                        const reference = referenceForDropTarget(event.target);
                        const hasImageFile =
                            Array.from(event.dataTransfer.items).some((item) => item.kind === "file" && (!item.type || item.type.startsWith("image/"))) || Array.from(event.dataTransfer.files).some((file) => file.type.startsWith("image/"));
                        if (!onReferenceFilesDrop || reference?.kind !== "image" || !hasImageFile) {
                            setNativeDropReferenceId(null);
                            props.onDragOver?.(event as unknown as React.DragEvent<HTMLTextAreaElement>);
                            return;
                        }
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                        setNativeDropReferenceId(reference.id);
                        props.onDragOver?.(event as unknown as React.DragEvent<HTMLTextAreaElement>);
                    }}
                    onDragLeave={(event: DragEvent<HTMLDivElement>) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        if (event.clientX <= bounds.left || event.clientX >= bounds.right || event.clientY <= bounds.top || event.clientY >= bounds.bottom) setNativeDropReferenceId(null);
                        props.onDragLeave?.(event as unknown as React.DragEvent<HTMLTextAreaElement>);
                    }}
                    onDrop={(event: DragEvent<HTMLDivElement>) => {
                        const reference = referenceForDropTarget(event.target);
                        const files = imageFilesFromTransfer(event);
                        setNativeDropReferenceId(null);
                        if (onReferenceFilesDrop && reference?.kind === "image" && files.length) {
                            event.preventDefault();
                            onReferenceFilesDrop(reference, files);
                        }
                        props.onDrop?.(event as unknown as React.DragEvent<HTMLTextAreaElement>);
                    }}
                    onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                        if (event.key === "Enter" && (event.nativeEvent.isComposing || composingRef.current || event.keyCode === 229)) return;
                        if (autoLinkMatch && event.key === "Tab" && !event.shiftKey && !event.nativeEvent.isComposing && !composingRef.current) {
                            event.preventDefault();
                            insertAutoLink(autoLinkMatch);
                            return;
                        }
                        if (mention && candidates.length) {
                            if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setActiveIndex((index) => (index < 0 ? 0 : (index + 1) % candidates.length));
                                return;
                            }
                            if (event.key === "ArrowUp") {
                                event.preventDefault();
                                setActiveIndex((index) => (index < 0 ? candidates.length - 1 : (index - 1 + candidates.length) % candidates.length));
                                return;
                            }
                            if (event.key === "Enter" || event.key === "Tab") {
                                event.preventDefault();
                                insertReference(candidates[activeIndex < 0 ? 0 : Math.min(activeIndex, candidates.length - 1)]);
                                return;
                            }
                            if (event.key === "Escape") {
                                event.preventDefault();
                                closeMention();
                                return;
                            }
                        }
                        if (event.key === "Enter") {
                            event.preventDefault();
                            const shouldSubmit = sendOnEnter ? !event.ctrlKey && !event.metaKey && !event.shiftKey : (event.ctrlKey || event.metaKey) && !event.shiftKey;
                            if (onSubmit && shouldSubmit) {
                                onSubmit();
                                return;
                            }
                            replaceEditableSelection("\n");
                            return;
                        }
                        onKeyDown?.(event as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
                    }}
                    onKeyUp={(event) => {
                        syncEditableMentionFromSelection();
                        props.onKeyUp?.(event as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
                    }}
                    onMouseDown={(event) => props.onMouseDown?.(event as unknown as React.MouseEvent<HTMLTextAreaElement>)}
                    onPointerDown={(event) => props.onPointerDown?.(event as unknown as React.PointerEvent<HTMLTextAreaElement>)}
                    onDoubleClick={(event) => {
                        const chip = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-mention-reference-id]") : null;
                        const reference = chip ? availableReferences.find((item) => item.id === chip.dataset.mentionReferenceId) : undefined;
                        if (!reference || !referencePreviewUrl(reference)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setPreviewReference(reference);
                    }}
                    onPointerUp={(event) => {
                        syncEditableMentionFromSelection();
                        props.onPointerUp?.(event as unknown as React.PointerEvent<HTMLTextAreaElement>);
                    }}
                    onSelect={(event) => props.onSelect?.(event as unknown as React.SyntheticEvent<HTMLTextAreaElement>)}
                    onWheel={(event) => {
                        event.stopPropagation();
                        props.onWheel?.(event as unknown as React.WheelEvent<HTMLTextAreaElement>);
                    }}
                    onScroll={(event) => props.onScroll?.(event as unknown as React.UIEvent<HTMLTextAreaElement>)}
                    onFocus={(event) => {
                        edit.onFocus();
                        props.onFocus?.(event as unknown as React.FocusEvent<HTMLTextAreaElement>);
                    }}
                    onBlur={(event) => {
                        edit.onBlur();
                        setAutoLinkCursor(null);
                        if (event.relatedTarget instanceof Element && event.relatedTarget.closest("[data-canvas-resource-mention-menu]")) return;
                        window.setTimeout(() => {
                            if (document.activeElement?.closest("[data-canvas-resource-mention-menu]")) return;
                            closeMention();
                        }, 120);
                        props.onBlur?.(event as unknown as React.FocusEvent<HTMLTextAreaElement>);
                    }}
                ></div>
                {autoLinkSuggestion}
                {menu}
                {hoverPreview.preview}
                {previewReference ? <InlineReferencePreview reference={previewReference} anchor={containerRef.current} onClose={() => setPreviewReference(null)} /> : null}
            </div>
        );
    }

    return (
        <div ref={containerRef} data-canvas-no-zoom className={`relative w-full min-h-0 overflow-hidden ${containerClassName || "h-full"}`}>
            <textarea
                {...props}
                ref={assignTextareaRef}
                value={value}
                onFocus={(event) => {
                    edit.onFocus();
                    props.onFocus?.(event);
                }}
                className={`${className || ""} relative z-10`}
                style={mergedStyle}
                onChange={(event) => {
                    const next = event.target.value;
                    onChange(next);
                    syncMention(next, event.target.selectionStart);
                }}
                onCompositionStart={(event) => {
                    edit.onCompositionStart();
                    composingRef.current = true;
                    props.onCompositionStart?.(event);
                }}
                onCompositionEnd={(event) => {
                    composingRef.current = false;
                    syncMention(event.currentTarget.value, event.currentTarget.selectionStart);
                    props.onCompositionEnd?.(event);
                }}
                onSelect={(event) => {
                    const textarea = event.currentTarget;
                    setAutoLinkCursor(textarea.selectionStart === textarea.selectionEnd ? textarea.selectionStart : null);
                    props.onSelect?.(event);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.nativeEvent.isComposing || composingRef.current || event.keyCode === 229)) return;
                    if (autoLinkMatch && event.key === "Tab" && !event.shiftKey && !event.nativeEvent.isComposing && !composingRef.current) {
                        event.preventDefault();
                        insertAutoLink(autoLinkMatch);
                        return;
                    }
                    if (mention && candidates.length) {
                        if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setActiveIndex((index) => (index < 0 ? 0 : (index + 1) % candidates.length));
                            return;
                        }
                        if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setActiveIndex((index) => (index < 0 ? candidates.length - 1 : (index - 1 + candidates.length) % candidates.length));
                            return;
                        }
                        if (event.key === "Enter") {
                            event.preventDefault();
                            insertReference(candidates[activeIndex < 0 ? 0 : Math.min(activeIndex, candidates.length - 1)]);
                            return;
                        }
                        if (event.key === "Escape") {
                            event.preventDefault();
                            closeMention();
                            return;
                        }
                    }
                    const shouldSubmit = event.key === "Enter" && (sendOnEnter ? !event.ctrlKey && !event.metaKey && !event.shiftKey : (event.ctrlKey || event.metaKey) && !event.shiftKey);
                    if (shouldSubmit && onSubmit) {
                        event.preventDefault();
                        onSubmit();
                        return;
                    }
                    onKeyDown?.(event);
                }}
                onWheel={(event) => {
                    event.stopPropagation();
                    const textarea = event.currentTarget;
                    const deltaY = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * textarea.clientHeight : event.deltaY;
                    if (deltaY) {
                        const previousTop = textarea.scrollTop;
                        textarea.scrollTop += deltaY;
                        if (textarea.scrollTop !== previousTop) event.preventDefault();
                    }
                    props.onWheel?.(event);
                }}
                onBlur={(event) => {
                    edit.onBlur();
                    setAutoLinkCursor(null);
                    if (event.relatedTarget instanceof Element && event.relatedTarget.closest("[data-canvas-resource-mention-menu]")) return;
                    window.setTimeout(() => {
                        if (document.activeElement?.closest("[data-canvas-resource-mention-menu]")) return;
                        closeMention();
                    }, 120);
                    props.onBlur?.(event);
                }}
            />
            {autoLinkSuggestion}
            {menu}
        </div>
    );
});

function createInlineMentionChip(reference: CanvasResourceReference, token: string) {
    const chip = document.createElement("span");
    chip.contentEditable = "false";
    chip.dataset.mentionToken = token;
    chip.dataset.mentionReferenceId = reference.id;
    if (["image", "video", "audio", "character"].includes(reference.kind)) chip.tabIndex = 0;
    chip.className = "canvas-resource-inline-mention";
    if (reference.kind === "skill") chip.classList.add("is-skill");
    chip.title = translateMessage(resolveAppLocale(), "resourceMention.zoomHint");
    if (reference.kind === "skill") chip.style.setProperty("--canvas-skill-mention-color", skillMentionColor(reference));

    const prefix = document.createElement("span");
    prefix.className = reference.kind === "skill" ? "canvas-resource-inline-skill-icon" : "canvas-resource-inline-at";
    // “/” is an input command, not part of the selected Skill name. Keep the
    // command token in the serialized value, but render the chip as a normal
    // icon + label so it remains readable after selection and submission.
    prefix.textContent = reference.kind === "skill" ? "✦" : "@";
    chip.appendChild(prefix);

    // Skill chip 的前缀已经承担图标职责，不再追加 fallback preview，避免出现两个星标。
    if (reference.kind !== "skill") chip.appendChild(createInlinePreview(reference));

    const label = document.createElement("span");
    label.className = "canvas-resource-inline-label";
    label.textContent = localizedCanvasReferenceLabel(reference, (key, values) => translateMessage(resolveAppLocale(), key, values));
    chip.appendChild(label);

    return chip;
}

const SKILL_MENTION_COLORS = ["#8b5cf6", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#84cc16", "#f97316", "#06b6d4"];

function skillMentionColor(reference: CanvasResourceReference) {
    const key = reference.skill?.skillId || reference.id;
    let hash = 0;
    for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    return SKILL_MENTION_COLORS[Math.abs(hash) % SKILL_MENTION_COLORS.length];
}

function referencePreviewUrl(reference: CanvasResourceReference) {
    return reference.previewUrl || (reference.kind === "video" ? reference.mediaUrl : "") || "";
}

function referenceOverlayContainer(anchor: HTMLElement | null) {
    // Keep reference overlays above their owning modal and inside its focus boundary.
    return anchor?.closest<HTMLElement>(".ant-modal-wrap") || document.body;
}

function InlineReferencePreview({ reference, anchor, onClose }: { reference: CanvasResourceReference; anchor: HTMLElement | null; onClose: () => void }) {
    const { t } = useI18n();
    const url = referencePreviewUrl(reference);
    if (!url) return null;
    return createPortal(
        <div className="fixed inset-0 z-[var(--z-dialog-popover)] grid place-items-center bg-black/80 p-6" role="dialog" aria-label={t("resourceMention.preview", { label: localizedCanvasReferenceLabel(reference, t) })} onClick={onClose}>
            <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
                <img src={url} alt={localizedCanvasReferenceLabel(reference, t)} className="max-h-[88vh] max-w-[88vw] rounded-xl object-contain shadow-2xl" />
                <button type="button" className="absolute -right-3 -top-3 rounded-full bg-black/75 p-2 text-white shadow-lg" onClick={onClose} aria-label={t("resourceMention.closePreview")}>
                    ×
                </button>
            </div>
        </div>,
        referenceOverlayContainer(anchor),
    );
}

const failedPreviewUrls = new Set<string>();
function usableInlineImageUrl(reference: CanvasResourceReference) {
    return ["image", "video", "character"].includes(reference.kind) && reference.previewUrl && !failedPreviewUrls.has(reference.previewUrl) ? reference.previewUrl : "";
}

function createInlinePreview(reference: CanvasResourceReference) {
    const imageUrl = usableInlineImageUrl(reference);
    if (imageUrl) {
        const media = document.createElement("img");
        media.className = `canvas-resource-inline-preview is-${reference.kind}`;
        media.setAttribute("src", imageUrl);
        media.setAttribute("alt", "");
        media.addEventListener(
            "error",
            () => {
                if (failedPreviewUrls.size >= 256) failedPreviewUrls.clear();
                failedPreviewUrls.add(imageUrl);
                if (media.isConnected) media.replaceWith(createInlinePreview(reference));
                reportResourcePreviewFailure(imageUrl);
            },
            { once: true },
        );
        return media;
    }
    if (reference.kind === "video" && reference.mediaUrl) {
        const media = document.createElement("video");
        media.className = "canvas-resource-inline-preview is-video";
        media.setAttribute("src", reference.mediaUrl);
        media.setAttribute("aria-hidden", "true");
        media.muted = true;
        media.playsInline = true;
        media.preload = "metadata";
        media.onloadedmetadata = () => primeVideoPreviewFrame(media);
        return media;
    }
    const fallback = document.createElement("span");
    fallback.className = "canvas-resource-inline-preview is-fallback";
    fallback.textContent = reference.sourceType === CanvasNodeType.Drawing ? "✎" : reference.kind === "audio" ? "♪" : reference.kind === "video" ? "▶" : reference.kind === "image" ? "□" : reference.kind === "skill" ? "✦" : "";
    return fallback;
}

/** Resource URLs resolve independently of prompt text; keep chips fresh without replacing the editable selection. */
function syncInlineMentionPreviews(editor: HTMLElement, references: CanvasResourceReference[]) {
    const byId = new Map(references.map((reference) => [reference.id, reference]));
    editor.querySelectorAll<HTMLElement>("[data-mention-reference-id]").forEach((chip) => {
        const reference = byId.get(chip.dataset.mentionReferenceId || "");
        if (!reference) return;
        const preview = chip.querySelector(".canvas-resource-inline-preview");
        const hasImage = Boolean(usableInlineImageUrl(reference));
        const hasVideo = !hasImage && reference.kind === "video" && Boolean(reference.mediaUrl);
        const tag = hasImage ? "IMG" : hasVideo ? "VIDEO" : "SPAN";
        const className = `canvas-resource-inline-preview is-${hasImage || hasVideo ? reference.kind : "fallback"}`;
        const src = hasImage ? reference.previewUrl : hasVideo ? reference.mediaUrl : null;
        if (preview && (preview.tagName !== tag || preview.className !== className || preview.getAttribute("src") !== src)) {
            preview.replaceWith(createInlinePreview(reference));
        }
        const label = chip.querySelector(".canvas-resource-inline-label");
        const displayLabel = localizedCanvasReferenceLabel(reference, (key, values) => translateMessage(resolveAppLocale(), key, values));
        if (label && label.textContent !== displayLabel) label.textContent = displayLabel;
    });
}

function MentionMenu({
    anchor,
    connectedReferences,
    assetReferences,
    filteredReferences,
    query,
    cursorOffset,
    activeReferenceId,
    preferredWidth,
    onQueryChange,
    onClose,
    onSelect,
    referenceSectionTitle,
    searchPlaceholder,
}: {
    anchor: HTMLElement;
    connectedReferences: CanvasResourceReference[];
    assetReferences: CanvasResourceReference[];
    filteredReferences: CanvasResourceReference[];
    query: string;
    cursorOffset: number;
    activeReferenceId?: string;
    preferredWidth: number;
    onQueryChange: (query: string) => void;
    onClose: () => void;
    onSelect: (reference: CanvasResourceReference) => void;
    referenceSectionTitle?: string;
    searchPlaceholder?: string;
}) {
    const { t } = useI18n();
    const menuRef = useRef<HTMLDivElement | null>(null);
    const selectedRef = useRef(false);
    const [category, setCategory] = useState<AssetCategory | null>(null);
    const [position, setPosition] = useState(() => mentionMenuPosition(anchor, cursorOffset, preferredWidth));

    useLayoutEffect(() => {
        let frame = 0;
        const updatePosition = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => setPosition(mentionMenuPosition(anchor, cursorOffset, preferredWidth)));
        };
        updatePosition();
        const observer = new ResizeObserver(updatePosition);
        observer.observe(anchor);
        const modal = anchor.closest(".ant-modal");
        modal?.addEventListener("animationend", updatePosition);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            modal?.removeEventListener("animationend", updatePosition);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [anchor, cursorOffset, preferredWidth]);

    const stopCanvasInteraction = (event: PointerEvent | MouseEvent) => {
        event.stopPropagation();
    };
    const selectReference = (reference: CanvasResourceReference) => {
        if (selectedRef.current) return;
        selectedRef.current = true;
        onSelect(reference);
    };
    const categoryItems = Object.entries(ASSET_CATEGORY_LABELS)
        .map(([value, label]) => ({ value: value as AssetCategory, label, count: assetReferences.filter((item) => item.category === value).length }))
        .filter((item) => item.count > 0);
    const directAttachments = connectedReferences.filter((item) => item.id.startsWith("attachment:"));
    const connectedNodes = connectedReferences.filter((item) => item.kind !== "skill" && !item.id.startsWith("attachment:"));
    const skillReferences = connectedReferences.filter((item) => item.kind === "skill");
    const visibleReferences = query ? filteredReferences : category ? assetReferences.filter((item) => item.category === category) : [];

    useLayoutEffect(() => {
        const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node) || menuRef.current?.contains(target) || anchor.contains(target)) return;
            onClose();
        };
        window.addEventListener("pointerdown", closeOnOutsidePointer, true);
        return () => window.removeEventListener("pointerdown", closeOnOutsidePointer, true);
    }, [anchor, onClose]);

    return createPortal(
        <div
            ref={menuRef}
            data-canvas-resource-mention-menu="true"
            className="canvas-resource-mention-menu fixed z-[var(--z-tooltip)]"
            data-placement={position.showAbove ? "top" : "bottom"}
            style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight, transform: position.showAbove ? "translateY(-100%)" : undefined }}
            onPointerDown={stopCanvasInteraction}
            onMouseDown={stopCanvasInteraction}
            onClick={(event) => event.stopPropagation()}
        >
            <div className="canvas-resource-mention-search">
                <Search aria-hidden />
                <input
                    value={query}
                    placeholder={searchPlaceholder || t("resourceMention.search")}
                    aria-label={t("resourceMention.searchAria")}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            onClose();
                            anchor.focus();
                            return;
                        }
                        if (event.key === "Enter" && filteredReferences.length) {
                            event.preventDefault();
                            selectReference(filteredReferences[0]);
                        }
                    }}
                />
            </div>
            <div className="canvas-resource-mention-scroll thin-scrollbar">
                {query ? (
                    <MentionReferenceList references={visibleReferences} activeReferenceId={activeReferenceId} onSelect={selectReference} />
                ) : category ? (
                    <>
                        <button type="button" className="canvas-resource-mention-back" onClick={() => setCategory(null)}>
                            <ArrowLeft aria-hidden />
                            <span>{t(categoryLabelKeys[category])}</span>
                            <small>{visibleReferences.length}</small>
                        </button>
                        <MentionReferenceList references={visibleReferences} activeReferenceId={activeReferenceId} onSelect={selectReference} />
                    </>
                ) : (
                    <>
                        {directAttachments.length ? (
                            <section className="canvas-resource-mention-section">
                                <h4>
                                    <span>{referenceSectionTitle || t("canvasPrompt.references")}</span>
                                    <small>{directAttachments.length}</small>
                                </h4>
                                <MentionReferenceList references={directAttachments} activeReferenceId={activeReferenceId} onSelect={selectReference} />
                            </section>
                        ) : null}
                        {connectedNodes.length ? (
                            <section className="canvas-resource-mention-section">
                                <h4>
                                    <span>{referenceSectionTitle || t("resourceMention.connected")}</span>
                                    <small>{connectedNodes.length}</small>
                                </h4>
                                <MentionReferenceList references={connectedNodes} activeReferenceId={activeReferenceId} onSelect={selectReference} />
                            </section>
                        ) : null}
                        {skillReferences.length ? (
                            <section className="canvas-resource-mention-section">
                                <h4>
                                    <span>{t("resourceMention.skills")}</span>
                                    <small>{skillReferences.length}</small>
                                </h4>
                                <MentionReferenceList references={skillReferences} activeReferenceId={activeReferenceId} onSelect={selectReference} />
                            </section>
                        ) : null}
                        {categoryItems.length ? (
                            <section className="canvas-resource-mention-section">
                                <h4>
                                    <span>{t("resourceMention.assets")}</span>
                                    <small>{assetReferences.length}</small>
                                </h4>
                                {categoryItems.map((item) => (
                                    <button key={item.value} type="button" className="canvas-resource-mention-folder" onClick={() => setCategory(item.value)}>
                                        <Folder aria-hidden />
                                        <span>{item.label}</span>
                                        <small>{item.count}</small>
                                        <ChevronRight aria-hidden />
                                    </button>
                                ))}
                            </section>
                        ) : null}
                    </>
                )}
            </div>
        </div>,
        referenceOverlayContainer(anchor),
    );
}

function MentionReferenceList({ references, activeReferenceId, onSelect }: { references: CanvasResourceReference[]; activeReferenceId?: string; onSelect: (reference: CanvasResourceReference) => void }) {
    const { t } = useI18n();
    const hoverPreview = useCanvasReferenceHoverPreview(references);
    if (!references.length) return <div className="canvas-resource-mention-empty">{t("resourceMention.empty")}</div>;
    return (
        <div {...hoverPreview.handlers}>
            {references.map((reference) => (
                <button
                    key={reference.id}
                    data-media-preview-id={reference.id}
                    type="button"
                    className={`canvas-resource-mention-item ${reference.kind === "skill" ? "is-skill" : ""} ${reference.id === activeReferenceId ? "is-active" : ""}`}
                    aria-selected={reference.id === activeReferenceId}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelect(reference);
                    }}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelect(reference);
                    }}
                >
                    <ReferencePreview reference={reference} />
                    <span className="canvas-resource-mention-copy">
                        <span className="canvas-resource-mention-title-row">
                            <strong title={localizedCanvasReferenceLabel(reference, t)}>{localizedCanvasReferenceLabel(reference, t)}</strong>
                            {reference.kind === "skill" ? <em>{t("resourceMention.skill")}</em> : null}
                        </span>
                        {reference.kind === "skill" ? (
                            <>
                                {/* Legacy payload: reference.skill?.file_count; normalized public field: fileCount. */}
                                <span className="canvas-resource-mention-meta">
                                    <span>{reference.skill?.description || reference.text || t("resourceMention.workflowSkill")}</span>
                                    <small>
                                        {reference.skill?.version ? `v${reference.skill.version}` : ""}
                                        {reference.skill?.fileCount ? ` · ${t("resourceMention.files", { count: reference.skill.fileCount })}` : ""}
                                    </small>
                                </span>
                            </>
                        ) : reference.text && reference.text !== reference.title ? (
                            <span className="canvas-resource-mention-meta">
                                <span>{reference.text}</span>
                            </span>
                        ) : null}
                    </span>
                </button>
            ))}
            {hoverPreview.preview}
        </div>
    );
}

function ReferencePreview({ reference }: { reference: CanvasResourceReference }) {
    if (reference.kind === "image" && reference.previewUrl) return <img src={reference.previewUrl} alt="" className="canvas-resource-mention-preview is-image" />;
    if (reference.kind === "video" && reference.previewUrl) return <img src={reference.previewUrl} alt="" className="canvas-resource-mention-preview is-video" loading="lazy" decoding="async" />;
    if (reference.kind === "video" && reference.mediaUrl) {
        return <video src={reference.mediaUrl} aria-hidden="true" muted playsInline preload="metadata" className="canvas-resource-mention-preview is-video" onLoadedMetadata={(event) => primeVideoPreviewFrame(event.currentTarget)} />;
    }
    if (reference.kind === "character" && reference.previewUrl) return <img src={reference.previewUrl} alt="" className="canvas-resource-mention-preview is-character" />;
    if (reference.kind === "skill") {
        return (
            <span className="canvas-resource-mention-preview is-skill">
                <Workflow aria-hidden />
            </span>
        );
    }
    const Icon = reference.sourceType === CanvasNodeType.Drawing ? Pencil : reference.kind === "character" ? UserRound : reference.kind === "audio" ? Music2 : reference.kind === "video" ? Video : reference.kind === "image" ? ImageIcon : FileText;
    return (
        <span className="canvas-resource-mention-preview is-fallback">
            <Icon aria-hidden />
        </span>
    );
}

function primeVideoPreviewFrame(video: HTMLVideoElement) {
    if (video.currentTime !== 0 || !Number.isFinite(video.duration) || video.duration <= 0) return;
    try {
        // Metadata-only loading does not paint a frame consistently across browsers.
        // Seeking a tiny amount keeps this preview passive while forcing first-frame decode.
        video.currentTime = Math.min(0.001, video.duration);
    } catch {
        // A transient media error should leave the fallback element usable.
    }
}

export function splitMentionText(value: string, references: CanvasResourceReference[]) {
    if (!references.length || !value) return value ? [{ type: "text", text: value } as MentionTextPart] : [];
    const referenceByToken = new Map<string, { reference: CanvasResourceReference; serializedToken: string }>();
    references.forEach((reference) => {
        const serializedToken = canvasResourceMentionToken(reference);
        referenceByToken.set(serializedToken, { reference, serializedToken });
        referenceByToken.set(`@${reference.label}`, { reference, serializedToken });
        if (reference.nodeId && !reference.assetId) referenceByToken.set(`@[node:${reference.nodeId}]`, { reference, serializedToken });
    });
    const tokens = [...referenceByToken.keys()].sort((a, b) => b.length - a.length);
    const parts: MentionTextPart[] = [];
    let index = 0;
    while (index < value.length) {
        const token = tokens.find((item) => canvasMentionTokenMatchesAt(value, item, index));
        if (!token) {
            const nextTokenIndex = findNextMentionIndex(value, tokens, index + 1);
            const end = nextTokenIndex < 0 ? value.length : nextTokenIndex;
            parts.push({ type: "text", text: value.slice(index, end) });
            index = end;
            continue;
        }
        const matched = referenceByToken.get(token)!;
        parts.push({ type: "mention", token: matched.serializedToken, reference: matched.reference });
        index += token.length;
    }
    return parts;
}

function renderEditableContent(editor: HTMLElement, value: string, references: CanvasResourceReference[]) {
    const parts = splitMentionText(value, references);
    const nodes = parts.map((part) => (part.type === "mention" ? createInlineMentionChip(part.reference, part.token) : document.createTextNode(part.text)));
    if (value.endsWith("\n")) {
        // A final text-node newline alone has no editable last line in Chromium.
        const caret = document.createElement("br");
        caret.dataset.canvasCaret = "true";
        nodes.push(caret);
    }
    editor.replaceChildren(...nodes);
}

function findNextMentionIndex(value: string, tokens: string[], fromIndex: number) {
    let next = -1;
    tokens.forEach((token) => {
        let index = value.indexOf(token, fromIndex);
        while (index >= 0 && !canvasMentionTokenMatchesAt(value, token, index)) index = value.indexOf(token, index + token.length);
        if (index >= 0 && canvasMentionTokenMatchesAt(value, token, index) && (next < 0 || index < next)) next = index;
    });
    return next;
}

function serializeEditableValue(root: HTMLElement) {
    return serializeNodeList(root.childNodes).replace(/\u00a0/g, " ");
}

function serializeNodeList(nodes: NodeListOf<ChildNode> | ChildNode[]) {
    let text = "";
    let previousBlock = false;
    nodes.forEach((node, index) => {
        const block = node instanceof HTMLElement && (node.tagName === "DIV" || node.tagName === "P");
        // Chromium inserts block elements for multiline CDP/IME input. The final
        // empty block contains a caret placeholder BR, not another user newline.
        if (index > 0 && (block || previousBlock)) text += "\n";
        const emptyBlock = block && node.childNodes.length === 1 && node.firstChild instanceof HTMLBRElement;
        text += emptyBlock ? "" : serializeNode(node);
        previousBlock = block;
    });
    return text;
}

function serializeNode(node: ChildNode): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof HTMLElement)) return "";
    if (node.dataset.canvasCaret) return "";
    const token = node.dataset.mentionToken;
    if (token) return token;
    if (node.tagName === "BR") return "\n";
    return serializeNodeList(node.childNodes);
}

function getEditableSelection(root: HTMLElement | null): EditableSelection | null {
    if (!root) return null;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
    const start = offsetForPoint(root, range.startContainer, range.startOffset);
    const end = offsetForPoint(root, range.endContainer, range.endOffset);
    return start <= end ? { start, end } : { start: end, end: start };
}

function offsetForPoint(root: Node, target: Node, targetOffset: number): number {
    const range = document.createRange();
    range.setStart(root, 0);
    range.setEnd(target, targetOffset);
    return serializeNodeList(range.cloneContents().childNodes).length;
}

function setEditableSelection(root: HTMLElement, offset: number) {
    const range = document.createRange();
    const point = pointForOffset(root, Math.max(0, offset));
    range.setStart(point.node, point.offset);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

function pointForOffset(root: Node, offset: number): { node: Node; offset: number } {
    if (root.nodeType === Node.TEXT_NODE) return { node: root, offset: Math.min(offset, root.textContent?.length || 0) };
    let remaining = offset;
    const children = Array.from(root.childNodes);
    for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        const length = plainTextLength(child);
        if (remaining > length) {
            remaining -= length;
            continue;
        }
        if (isMentionElement(child)) return { node: root, offset: remaining <= length / 2 ? index : index + 1 };
        return pointForOffset(child, remaining);
    }
    return { node: root, offset: children.length };
}

function plainTextLength(node: Node): number {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length || 0;
    if (node instanceof HTMLElement) {
        if (node.dataset.canvasCaret) return 0;
        const token = node.dataset.mentionToken;
        if (token) return token.length;
        if (node.tagName === "BR") return 1;
    }
    return Array.from(node.childNodes).reduce((total, child) => total + plainTextLength(child), 0);
}

function isMentionElement(node: Node): node is HTMLElement {
    return node instanceof HTMLElement && Boolean(node.dataset.mentionToken);
}

type MentionAnchorRect = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;

function mentionMenuPosition(anchor: HTMLElement, cursorOffset: number, preferredWidth: number) {
    const caret = mentionCaretRect(anchor, cursorOffset);
    const boundary = anchor.closest(".ant-modal-container")?.getBoundingClientRect() || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    const inset = 8;
    const gap = 8;
    const availableWidth = Math.max(0, boundary.right - boundary.left - inset * 2);
    const width = Math.min(preferredWidth, availableWidth);
    const left = clamp(caret.left, boundary.left + inset, boundary.right - width - inset);
    const spaceAbove = Math.max(0, caret.top - boundary.top - gap - inset);
    const spaceBelow = Math.max(0, boundary.bottom - caret.bottom - gap - inset);
    const showAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(320, showAbove ? spaceAbove : spaceBelow);
    const top = showAbove ? caret.top - gap : caret.bottom + gap;
    return { left, top, width, maxHeight, showAbove };
}

function mentionCaretRect(anchor: HTMLElement, cursorOffset: number): MentionAnchorRect {
    if (anchor instanceof HTMLTextAreaElement) return textareaCaretRect(anchor, cursorOffset);
    const point = pointForOffset(anchor, cursorOffset);
    const range = document.createRange();
    range.setStart(point.node, point.offset);
    range.collapse(true);
    const rangeRect = range.getClientRects()[0] || range.getBoundingClientRect();
    if (rangeRect && (rangeRect.height || rangeRect.width)) return rangeRect;
    return fallbackCaretRect(anchor);
}

function textareaCaretRect(textarea: HTMLTextAreaElement, cursorOffset: number): MentionAnchorRect {
    const rect = textarea.getBoundingClientRect();
    const computed = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    const marker = document.createElement("span");
    const copiedProperties = [
        "boxSizing",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "fontFamily",
        "fontSize",
        "fontStyle",
        "fontVariant",
        "fontWeight",
        "fontStretch",
        "lineHeight",
        "letterSpacing",
        "textAlign",
        "textIndent",
        "textTransform",
        "wordSpacing",
        "tabSize",
        "wordBreak",
        "overflowWrap",
    ] as const;
    copiedProperties.forEach((property) => {
        mirror.style[property] = computed[property];
    });
    Object.assign(mirror.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: "auto",
        minHeight: "0",
        maxHeight: "none",
        overflow: "hidden",
        visibility: "hidden",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
        zIndex: "-1",
    });
    mirror.append(document.createTextNode(textarea.value.slice(0, Math.max(0, cursorOffset))));
    marker.textContent = "\u200b";
    mirror.append(marker);
    document.body.append(mirror);
    const markerRect = marker.getBoundingClientRect();
    mirror.remove();

    const lineHeight = Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.4 || 20;
    const top = clamp(markerRect.top - textarea.scrollTop, rect.top, rect.bottom - lineHeight);
    const left = clamp(markerRect.left - textarea.scrollLeft, rect.left, rect.right);
    return { left, right: left, top, bottom: top + lineHeight, width: 0, height: lineHeight };
}

function fallbackCaretRect(anchor: HTMLElement): MentionAnchorRect {
    const rect = anchor.getBoundingClientRect();
    const computed = window.getComputedStyle(anchor);
    const lineHeight = Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.4 || 20;
    const left = rect.left + Number.parseFloat(computed.paddingLeft || "0");
    const top = rect.top + Number.parseFloat(computed.paddingTop || "0");
    return { left, right: left, top, bottom: top + lineHeight, width: 0, height: lineHeight };
}
