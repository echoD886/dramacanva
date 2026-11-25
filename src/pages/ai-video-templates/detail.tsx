import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import localforage from "localforage";
import { useParams, Link, useNavigate, useLocation } from "react-router";
import { ChevronRight, Loader2, AlertCircle, RefreshCw, Coins, RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { useUserStore } from "@/stores/use-user-store";
import { useAssetStore } from "@/stores/use-asset-store";
import type { AIVideoTemplateCard, AIVideoTemplateClip, AIVideoTemplateDetail, AIVideoTemplateQuote, UploadSlotState } from "@/types/ai-video-template";
import {
    getAIVideoTemplate,
    getAIVideoTemplateQuote,
    quoteAIVideoTemplateGeneration,
    createAIVideoTemplateGeneration,
    createAIVideoTemplateCheckout,
    extractTaskVideoUrl,
    pollGenerationTaskUntilDone,
    listAIVideoTemplates,
} from "@/services/api/ai-video-templates";
import { uploadResourceFile } from "@/services/api/resources";
import { useQuery } from "@tanstack/react-query";
import { createStripeCheckout, getPaymentOptions } from "@/services/api/wallet";
import { checkoutErrorText, goToCheckout, releaseCheckoutTab, reserveCheckoutTab } from "@/lib/checkout-tab";
import { filterSupportedProviders } from "@/components/payments/payment-provider-popover";
import { classifyGenerationError, generationFailurePresentation } from "@/lib/generation-failure";
import { isInsufficientCreditsError } from "@/lib/generation-error";
import { formatCredits } from "@/constant/credits";
import { ClipPlayer } from "./components/clip-player";
import { TemplateCard } from "./components/template-card";
import { selectRelatedTemplates } from "./related-templates";
import { UploadSlots, effectiveSlots } from "./components/upload-slots";
import type { MessageKey } from "@/i18n/messages";
import { GenerationOptions } from "./components/generation-options";
import { ExtraField, PromptCard } from "./components/prompt-card";
import { ArticleSection } from "./components/article-section";
import { BackToTop, scrollPageTop } from "./components/back-to-top";
import { categoryLabelKey, categoryPath } from "./components/categories";
import { isGenerationWorking, type GenerationPhase, type GenerationErrorState } from "./components/generation-types";
import { formatClipLength, formatCount, heatStageKey, templateRechargeOffer, TEMPLATE_RECHARGE_RETURN_KEY } from "./utils";
import "./ai-video-templates.css";

const GUEST_DRAFT_KEY_PREFIX = "aivt_guest_draft_";

const guestPendingFiles = new Map<string, Record<number, File>>();
const guestPhotoCache = localforage.createInstance({ name: "aivt-guest-photos" });
function guestPhotoKey(slug: string) {
    const key = "aivt-guest-session";
    let session = sessionStorage.getItem(key);
    if (!session) {
        session = crypto.randomUUID();
        sessionStorage.setItem(key, session);
    }
    return `${session}:${slug}`;
}

export default function AIVideoTemplateDetailPage() {
    const { t, locale } = useI18n();
    const { slug = "" } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useUserStore((state) => state.user);
    const isGuest = !user;

    const [detail, setDetail] = useState<AIVideoTemplateDetail | null>(null);
    const [activeClip, setActiveClip] = useState<AIVideoTemplateClip | null>(null);
    const [relatedTemplates, setRelatedTemplates] = useState<AIVideoTemplateCard[]>([]);
    const [attention, setAttention] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const makeAreaRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // Per-slot upload states
    const [slotStates, setSlotStates] = useState<Record<number, UploadSlotState>>({});
    const uploadControllersRef = useRef<Record<number, AbortController>>({});

    // Form configuration state
    const [mode, setMode] = useState<"face_replace" | "scene_match">("face_replace");
    const [replacement, setReplacement] = useState("person");
    const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
    const [sceneInput, setSceneInput] = useState("");
    const [extraInstruction, setExtraInstruction] = useState("");
    const [resolution, setResolution] = useState<"480p" | "720p">("720p");
    const [quote, setQuote] = useState<AIVideoTemplateQuote | null>(null);
    // Below the card minimum there is no one-time payment; offer the smallest credit pack instead.
    const rechargeOptions = useQuery({
        queryKey: ["payment-options", user?.id ?? "guest"],
        queryFn: getPaymentOptions,
        staleTime: 60_000,
        retry: false,
        enabled: Boolean(quote) && !quote?.directPayAvailable,
    });
    const [rechargeState, setRechargeState] = useState<"idle" | "opening" | "waiting">("idle");
    const [rechargeError, setRechargeError] = useState<string | null>(null);
    const refetchRechargeOptions = rechargeOptions.refetch;
    // Coming back from the cashier tab: refresh the offer (a bought trial pack disappears).
    useEffect(() => {
        if (rechargeState !== "waiting") return;
        const onReturn = () => {
            if (document.visibilityState === "visible") void refetchRechargeOptions();
        };
        window.addEventListener("focus", onReturn);
        document.addEventListener("visibilitychange", onReturn);
        return () => {
            window.removeEventListener("focus", onReturn);
            document.removeEventListener("visibilitychange", onReturn);
        };
    }, [rechargeState, refetchRechargeOptions]);
    const [model, setModel] = useState<string | undefined>();

    // Generation state machine
    const [generationPhase, setGenerationPhase] = useState<GenerationPhase>("idle");
    const [generationProgress, setGenerationProgress] = useState(0);
    const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<GenerationErrorState | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const genAbortControllerRef = useRef<AbortController | null>(null);
    const guestPhotoWriteRef = useRef<Promise<unknown>>(Promise.resolve());
    const [guestPhotosRestored, setGuestPhotosRestored] = useState(false);

    // Scroll to top on mount or template switch
    useEffect(() => {
        document.querySelector(".aivt-page-root")?.scrollTo({ top: 0 });
    }, [slug]);

    const handleRetry = useCallback(() => {
        setError(null);
        setRetryCount((c) => c + 1);
    }, []);

    // Restore guest draft settings
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`${GUEST_DRAFT_KEY_PREFIX}${slug}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.mode) setMode(parsed.mode);
                if (parsed.selectedOptionIds) setSelectedOptionIds(parsed.selectedOptionIds);
                if (parsed.sceneInput) setSceneInput(parsed.sceneInput);
                if (parsed.extraInstruction) setExtraInstruction(parsed.extraInstruction);
                if (parsed.resolution) setResolution(parsed.resolution);
            }
        } catch {
            // Ignore parse errors
        }
    }, [slug]);

    // Restore guest picked files if previously selected
    useEffect(() => {
        let current = true;
        void (async () => {
            const pending = guestPendingFiles.get(slug) || (await guestPhotoCache.getItem<Record<number, File>>(guestPhotoKey(slug)));
            if (!current) return;
            if (pending && Object.keys(pending).length > 0) {
                guestPendingFiles.set(slug, pending);
                setSlotStates((prev) => {
                    const next = { ...prev };
                    Object.entries(pending).forEach(([idxStr, file]) => {
                        const idx = Number(idxStr);
                        if (!next[idx]?.previewUrl) {
                            next[idx] = {
                                file,
                                previewUrl: URL.createObjectURL(file),
                                status: "ready",
                                progress: 100,
                            };
                        }
                    });
                    return next;
                });
            }
        })()
            .catch(() => {})
            .finally(() => {
                if (current) setGuestPhotosRestored(true);
            });
        return () => {
            current = false;
        };
    }, [slug]);

    // When returning logged in, automatically upload staged files
    useEffect(() => {
        if (!user || !guestPhotosRestored) return;
        const pending = guestPendingFiles.get(slug);
        if (!pending || Object.keys(pending).length === 0) return;

        Object.entries(pending).forEach(([idxStr, file]) => {
            const idx = Number(idxStr);
            const controller = new AbortController();
            uploadControllersRef.current[idx] = controller;

            setSlotStates((prev) => ({
                ...prev,
                [idx]: {
                    file,
                    previewUrl: prev[idx]?.previewUrl || URL.createObjectURL(file),
                    status: "uploading",
                    progress: 0,
                },
            }));

            uploadResourceFile(
                file,
                "image",
                { fileName: file.name },
                (uploadedBytes, totalBytes) => {
                    const progress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 50;
                    setSlotStates((prev) => {
                        if (!prev[idx] || prev[idx].status !== "uploading") return prev;
                        return {
                            ...prev,
                            [idx]: { ...prev[idx], progress },
                        };
                    });
                },
                controller.signal,
            )
                .then((resource) => {
                    delete uploadControllersRef.current[idx];
                    const current = guestPendingFiles.get(slug);
                    if (current) {
                        delete current[idx];
                        if (Object.keys(current).length === 0) {
                            guestPendingFiles.delete(slug);
                            void guestPhotoCache.removeItem(guestPhotoKey(slug));
                        }
                    }
                    setSlotStates((prev) => {
                        if (!prev[idx]) return prev;
                        return {
                            ...prev,
                            [idx]: {
                                ...prev[idx],
                                status: "ready",
                                progress: 100,
                                resourceId: resource.id,
                            },
                        };
                    });
                })
                .catch((err) => {
                    delete uploadControllersRef.current[idx];
                    if (controller.signal.aborted) return;
                    setSlotStates((prev) => {
                        if (!prev[idx]) return prev;
                        return {
                            ...prev,
                            [idx]: {
                                ...prev[idx],
                                status: "error",
                                error: err instanceof Error ? err.message : String(err),
                            },
                        };
                    });
                });
        });
    }, [user, slug, guestPhotosRestored]);

    // Cleanup uploads on unmount
    useEffect(() => {
        return () => {
            Object.values(uploadControllersRef.current).forEach((ctrl) => ctrl.abort());
            uploadControllersRef.current = {};
            genAbortControllerRef.current?.abort();
        };
    }, []);

    // Fetch template details, then related templates from the same category (topped up from the hub).
    useEffect(() => {
        let isCurrent = true;
        setIsLoading(true);
        setError(null);

        void getAIVideoTemplate(slug, locale)
            .then(async (data) => {
                if (!isCurrent) return;
                setDetail(data);
                setReplacement(data.replacementDefault || "person");
                setModel(data.models?.find((item) => item.id.includes("2.5"))?.id || data.models?.[0]?.id);
                setActiveClip(data.clips[0] || null);
                setIsLoading(false);
                const category = data.categories[0];
                const byCategory = category ? await listAIVideoTemplates({ category, sort: "hot", limit: 9, locale }).catch(() => ({ items: [] as AIVideoTemplateCard[] })) : { items: [] as AIVideoTemplateCard[] };
                let items = selectRelatedTemplates(slug, category, byCategory.items, []);
                if (items.length < 8) {
                    const hub = await listAIVideoTemplates({ sort: "hot", limit: 17, locale }).catch(() => ({ items: [] as AIVideoTemplateCard[] }));
                    items = selectRelatedTemplates(slug, category, byCategory.items, hub.items);
                }
                if (isCurrent) setRelatedTemplates(items.slice(0, 8));
            })
            .catch((err) => {
                if (!isCurrent) return;
                setError(err instanceof Error ? err.message : String(err));
                setIsLoading(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [slug, locale, retryCount]);

    // Price comes only from the backend quote. If it is unavailable the button shows no number rather than a guess.
    useEffect(() => {
        if (!activeClip) return;
        let isCurrent = true;
        setQuote(null);
        void getAIVideoTemplateQuote(slug, { clipId: activeClip.id, resolution, model })
            .then((q) => {
                if (isCurrent) setQuote(q);
            })
            .catch(() => {
                if (isCurrent) setQuote(null);
            });
        return () => {
            isCurrent = false;
        };
    }, [slug, activeClip, resolution, model]);

    // Save draft for guest
    useEffect(() => {
        if (isGuest) {
            try {
                localStorage.setItem(
                    `${GUEST_DRAFT_KEY_PREFIX}${slug}`,
                    JSON.stringify({
                        mode,
                        selectedOptionIds,
                        sceneInput,
                        extraInstruction,
                        resolution,
                    }),
                );
            } catch {
                // Ignore storage errors
            }
        }
    }, [isGuest, slug, mode, selectedOptionIds, sceneInput, extraInstruction, resolution]);

    // Handle picking a photo
    const handlePickPhoto = useCallback(
        (slotIndex: number, file: File) => {
            const existingController = uploadControllersRef.current[slotIndex];
            if (existingController) {
                existingController.abort();
                delete uploadControllersRef.current[slotIndex];
            }

            const prevPreview = slotStates[slotIndex]?.previewUrl;
            if (prevPreview && prevPreview.startsWith("blob:")) {
                URL.revokeObjectURL(prevPreview);
            }

            const previewUrl = URL.createObjectURL(file);

            if (isGuest) {
                const currentPending = guestPendingFiles.get(slug) || {};
                currentPending[slotIndex] = file;
                guestPendingFiles.set(slug, currentPending);
                guestPhotoWriteRef.current = guestPhotoCache.setItem(guestPhotoKey(slug), { ...currentPending });

                setSlotStates((prev) => ({
                    ...prev,
                    [slotIndex]: {
                        file,
                        previewUrl,
                        status: "ready",
                        progress: 100,
                    },
                }));
                return;
            }

            const controller = new AbortController();
            uploadControllersRef.current[slotIndex] = controller;

            setSlotStates((prev) => ({
                ...prev,
                [slotIndex]: {
                    file,
                    previewUrl,
                    status: "uploading",
                    progress: 0,
                },
            }));

            uploadResourceFile(
                file,
                "image",
                { fileName: file.name },
                (uploadedBytes, totalBytes) => {
                    const progress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 50;
                    setSlotStates((prev) => {
                        if (!prev[slotIndex] || prev[slotIndex].status !== "uploading") return prev;
                        return {
                            ...prev,
                            [slotIndex]: { ...prev[slotIndex], progress },
                        };
                    });
                },
                controller.signal,
            )
                .then((resource) => {
                    delete uploadControllersRef.current[slotIndex];
                    setSlotStates((prev) => {
                        if (!prev[slotIndex]) return prev;
                        return {
                            ...prev,
                            [slotIndex]: {
                                ...prev[slotIndex],
                                status: "ready",
                                progress: 100,
                                resourceId: resource.id,
                            },
                        };
                    });
                })
                .catch((err) => {
                    delete uploadControllersRef.current[slotIndex];
                    if (controller.signal.aborted) return;
                    setSlotStates((prev) => {
                        if (!prev[slotIndex]) return prev;
                        return {
                            ...prev,
                            [slotIndex]: {
                                ...prev[slotIndex],
                                status: "error",
                                error: err instanceof Error ? err.message : String(err),
                            },
                        };
                    });
                });
        },
        [isGuest, slug, slotStates],
    );

    // Remove photo
    const handleRemovePhoto = useCallback(
        (slotIndex: number) => {
            const controller = uploadControllersRef.current[slotIndex];
            if (controller) {
                controller.abort();
                delete uploadControllersRef.current[slotIndex];
            }

            const prevPreview = slotStates[slotIndex]?.previewUrl;
            if (prevPreview && prevPreview.startsWith("blob:")) {
                URL.revokeObjectURL(prevPreview);
            }

            const currentPending = guestPendingFiles.get(slug);
            if (currentPending) {
                delete currentPending[slotIndex];
                guestPhotoWriteRef.current = guestPhotoCache.setItem(guestPhotoKey(slug), { ...currentPending });
            }

            setSlotStates((prev) => {
                const next = { ...prev };
                delete next[slotIndex];
                return next;
            });
        },
        [slug, slotStates],
    );

    const handleModeChange = useCallback((newMode: "face_replace" | "scene_match") => {
        setMode(newMode);
        if (newMode === "scene_match") {
            setSelectedOptionIds((prev) => prev.filter((id) => id !== "keep-background-light"));
        }
    }, []);

    const handleToggleOption = useCallback(
        (optionId: string) => {
            const opt = detail?.options.find((o) => o.id === optionId);
            if (!opt) return;

            setSelectedOptionIds((prev) => {
                const isSelected = prev.includes(optionId);
                if (isSelected) {
                    return prev.filter((id) => id !== optionId);
                }
                if (opt.group) {
                    const optionsList = detail?.options || [];
                    const sameGroupOtherIds = new Set(optionsList.filter((o) => o.group === opt.group && o.id !== optionId).map((o) => o.id));
                    return [...prev.filter((id) => !sameGroupOtherIds.has(id)), optionId];
                }
                return [...prev, optionId];
            });
        },
        [detail],
    );

    // Check if can generate
    const canGenerate = useMemo(() => {
        if (!detail) return false;
        return effectiveSlots(detail.slots, replacement).every((slot, idx) => {
            if (!slot.required) return true;
            const state = slotStates[idx];
            if (!state) return false;
            if (isGuest) return Boolean(state.file || state.previewUrl);
            return Boolean(state.resourceId);
        });
    }, [detail, slotStates, isGuest, replacement]);

    useEffect(() => {
        if (canGenerate) setAttention(false);
    }, [canGenerate]);

    const hasUploadingSlot = useMemo(() => {
        return Object.values(slotStates).some((s) => s.status === "uploading");
    }, [slotStates]);

    const isWorking = isGenerationWorking(generationPhase);

    // Generation submission
    const handleGenerate = useCallback(
        async (directPay = false) => {
            if (isWorking || !activeClip) return;
            if (directPay && !quote?.directPayAvailable) return;
            if (!canGenerate) {
                // Never a dead grey button: point at the photo slots that still need a picture.
                setAttention(true);
                makeAreaRef.current?.querySelector(".aivt-drops")?.scrollIntoView({ block: "center", behavior: "smooth" });
                return;
            }

            if (isGuest) {
                await guestPhotoWriteRef.current;
                const returnUrl = encodeURIComponent(location.pathname + location.search);
                navigate(`/login?next=${returnUrl}`);
                return;
            }

            genAbortControllerRef.current?.abort();
            const abortController = new AbortController();
            genAbortControllerRef.current = abortController;

            setGenerationError(null);
            setResultVideoUrl(null);
            setGenerationProgress(0);
            setIsSaved(false);

            try {
                const sortedIndices = Object.keys(slotStates)
                    .map(Number)
                    .filter((index) => index < effectiveSlots(detail!.slots, replacement).length)
                    .sort((a, b) => a - b);

                const resourceIds: string[] = [];
                for (const idx of sortedIndices) {
                    const state = slotStates[idx];
                    if (!state) continue;

                    if (state.resourceId) {
                        resourceIds.push(state.resourceId);
                    } else if (state.file) {
                        setGenerationPhase("uploading");
                        const res = await uploadResourceFile(state.file, "image", { fileName: state.file.name }, (u, t) => setGenerationProgress(t > 0 ? Math.round((u / t) * 100) : 50), abortController.signal);
                        resourceIds.push(res.id);
                        setSlotStates((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], resourceId: res.id, status: "ready", progress: 100 },
                        }));
                    }
                }

                if (resourceIds.length === 0) {
                    throw new Error("No uploaded photos available");
                }

                const requestBody = {
                    replacement,
                    model,
                    clipId: activeClip.id,
                    images: resourceIds,
                    mode,
                    optionIds: selectedOptionIds,
                    scene: sceneInput.trim() || undefined,
                    extra: extraInstruction.trim().slice(0, 200) || undefined,
                    resolution,
                    locale,
                };

                setGenerationPhase("quoting");
                const priceConfirmation = await quoteAIVideoTemplateGeneration(slug, requestBody, abortController.signal);

                if (directPay) {
                    const { checkoutUrl, taskId } = await createAIVideoTemplateCheckout(slug, { ...requestBody, priceConfirmation }, abortController.signal);
                    if (taskId) sessionStorage.setItem(`aivt-checkout:${taskId}`, location.pathname);
                    window.location.assign(checkoutUrl);
                    return;
                }

                setGenerationPhase("queued");
                const task = await createAIVideoTemplateGeneration(slug, { ...requestBody, priceConfirmation }, abortController.signal);

                setGenerationPhase(task.status === "running" ? "generating" : "queued");
                const completed = await pollGenerationTaskUntilDone(task.id, {
                    signal: abortController.signal,
                    onProgress: (p, current) => {
                        setGenerationProgress(p);
                        if (current.status === "running") {
                            setGenerationPhase("generating");
                        } else if (current.status === "queued") {
                            setGenerationPhase("queued");
                        }
                    },
                });

                const videoUrl = extractTaskVideoUrl(completed);
                if (!videoUrl) {
                    throw new Error(t("aiVideoTemplates.errorLoad"));
                }
                setResultVideoUrl(videoUrl);
                setGenerationPhase("done");
            } catch (err) {
                if (abortController.signal.aborted) return;
                const isCredits = isInsufficientCreditsError(err) || classifyGenerationError(err) === "insufficient_credits";
                const presentation = generationFailurePresentation(err, t);
                setGenerationError({
                    title: presentation.title,
                    message: presentation.detail.refundedMicrocredits !== undefined ? `${presentation.text} ${t("generationFailure.refunded", { amount: formatCredits(presentation.detail.refundedMicrocredits) })}` : presentation.text,
                    isInsufficientCredits: isCredits,
                    canRetry: !isCredits,
                });
                setGenerationPhase("failed");
            }
        },
        [canGenerate, isWorking, activeClip, isGuest, location.pathname, location.search, navigate, slotStates, mode, replacement, selectedOptionIds, sceneInput, extraInstruction, resolution, model, locale, slug, t, quote],
    );

    // The paid webhook creates the task; the checkout return carries its ID.
    useEffect(() => {
        const taskId = new URLSearchParams(location.search).get("taskId");
        if (!taskId || !user) return;
        const controller = new AbortController();
        setGenerationPhase("queued");
        setGenerationError(null);
        void pollGenerationTaskUntilDone(taskId, {
            signal: controller.signal,
            waitForPaidTask: true,
            onProgress: (progress, task) => {
                setGenerationProgress(progress);
                setGenerationPhase(task.status === "queued" ? "queued" : "generating");
            },
        })
            .then((task) => {
                const url = extractTaskVideoUrl(task);
                if (!url) throw new Error(t("aiVideoTemplates.errorLoad"));
                setResultVideoUrl(url);
                setGenerationPhase("done");
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                const presentation = generationFailurePresentation(error, t);
                setGenerationError({ title: presentation.title, message: presentation.text, canRetry: false, isInsufficientCredits: false });
                setGenerationPhase("failed");
            });
        return () => controller.abort();
    }, [location.search, user, t]);

    const handleMakeAgain = useCallback(() => {
        setResultVideoUrl(null);
        setGenerationPhase("idle");
        setGenerationError(null);
        setGenerationProgress(0);
        setIsSaved(false);
    }, []);

    const handleSaveToLibrary = useCallback(async () => {
        if (!resultVideoUrl || !detail) return;
        try {
            useAssetStore.getState().addAsset({
                kind: "video",
                title: `${detail.title} - AI Result`,
                coverUrl: activeClip?.coverUrl || detail.coverUrl,
                tags: ["ai-video-template", "generated"],
                data: {
                    url: resultVideoUrl,
                    width: resolution === "720p" ? 720 : 480,
                    height: resolution === "720p" ? 1280 : 854,
                    bytes: 1024 * 1024 * 3,
                    mimeType: "video/mp4",
                },
            });
            setIsSaved(true);
        } catch {
            // Error handling
        }
    }, [resultVideoUrl, detail, activeClip?.coverUrl, resolution]);

    const listHref = localizedPublicPath("/ai-video-templates", locale as "en-US");

    if (error || (!isLoading && !detail)) {
        return (
            <div className="aivt-page-root">
                <div className="aivt-state is-page">
                    <AlertCircle aria-hidden="true" />
                    <p>{t("aiVideoTemplates.errorLoad")}</p>
                    <div className="aivt-state-actions">
                        <button type="button" onClick={handleRetry} className="aivt-btn-quiet">
                            <RefreshCw aria-hidden="true" />
                            <span>{t("aiVideoTemplates.retry")}</span>
                        </button>
                        <Link to={listHref} className="aivt-btn-quiet">
                            {t("aiVideoTemplates.backToList")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading || !detail || !activeClip) {
        return (
            <div className="aivt-page-root">
                <div className="aivt-state is-page" role="status">
                    <Loader2 className="aivt-spin" aria-hidden="true" />
                    <p>{t("aiVideoTemplates.loading")}</p>
                </div>
            </div>
        );
    }

    const content = detail.content[locale] || detail.content["en-US"];
    // `title` is the short template name (cards, breadcrumb, copy); `headline` is the localized long H1.
    const displayTitle = detail.title || content?.title || detail.slug.replace(/-/g, " ");
    const headline = detail.headline?.trim() || displayTitle;
    const summary = content?.summary?.trim() || "";
    const slots = effectiveSlots(detail.slots, replacement);
    const missingCount = slots.filter((slot, idx) => slot.required && !slotStates[idx]?.previewUrl).length;
    const price = quote ? quote.totalCredits.toFixed(1) : "";
    const directPrice = quote?.directPayAvailable && typeof quote.directPayUsd === "number" ? quote.directPayUsd.toFixed(2) : null;
    const rechargeOffer = templateRechargeOffer(quote, rechargeOptions.data);
    // Pays for the pack in a cashier tab so this page and its uploaded photos stay as they are.
    const openRecharge = async () => {
        if (!rechargeOffer || rechargeState === "opening") return;
        if (isGuest) {
            await guestPhotoWriteRef.current;
            navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
            return;
        }
        try {
            // window.open copies sessionStorage, so only the cashier tab carries the return marker.
            sessionStorage.setItem(TEMPLATE_RECHARGE_RETURN_KEY, location.pathname);
            reserveCheckoutTab(t("aiVideoTemplates.rechargeOpening"));
            sessionStorage.removeItem(TEMPLATE_RECHARGE_RETURN_KEY);
        } catch {
            reserveCheckoutTab(t("aiVideoTemplates.rechargeOpening"));
        }
        setRechargeState("opening");
        setRechargeError(null);
        try {
            const providers = filterSupportedProviders(rechargeOptions.data?.paymentProviders || [], "credits");
            const provider = (providers.find((p) => p.id === "creem") ?? providers[0])?.id;
            const result = await createStripeCheckout(rechargeOffer.sku, crypto.randomUUID(), { locale, ...(provider ? { provider } : {}) });
            const target = new URL(result.url);
            if (target.protocol !== "https:") throw new Error(t("pricing.invalidCheckout"));
            if (goToCheckout(target.toString()) === "same") {
                try {
                    sessionStorage.setItem(TEMPLATE_RECHARGE_RETURN_KEY, location.pathname);
                } catch {
                    // The pricing page still shows the purchase result without the marker.
                }
            }
            setRechargeState("waiting");
        } catch (err) {
            releaseCheckoutTab();
            setRechargeError(checkoutErrorText(err, t("checkout.error")));
            setRechargeState("idle");
        }
    };
    const stageKey = heatStageKey(detail.heatStage);
    const categoryId = detail.categories[0]?.replace(/-trends$/, "");
    const categoryKey = categoryLabelKey(categoryId);
    const clipLength = formatClipLength(activeClip.durationMs);
    const prompt = detail.prompt && detail.prompt.text?.trim() ? detail.prompt : undefined;
    const firstPhoto = slotStates[0]?.previewUrl;

    const ctaLabel = isWorking
        ? generationPhase === "uploading"
            ? t("aiVideoTemplates.uploadingPhotos")
            : generationPhase === "queued"
              ? t("aiVideoTemplates.taskQueued")
              : t("aiVideoTemplates.generating")
        : price
          ? t("aiVideoTemplates.makeMyVideo", { credits: price })
          : t("aiVideoTemplates.makeMyVideoNoPrice");
    const scrollToMake = () => {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        makeAreaRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
        makeAreaRef.current?.querySelector<HTMLElement>(".aivt-drop-empty, .aivt-primary")?.focus({ preventScroll: true });
    };
    const attentionText = attention && missingCount > 0 ? (missingCount === 1 ? t("aiVideoTemplates.addPhotoFirst") : t("aiVideoTemplates.addPhotosFirst", { count: missingCount })) : "";

    return (
        <div className="aivt-page-root aivt-detail-page">
            <div className="aivt-shell is-narrow">
                <nav className="aivt-crumbs" aria-label={t("aiVideoTemplates.breadcrumbLabel")}>
                    <ol>
                        <li>
                            <Link to={listHref}>{t("aiVideoTemplates.title")}</Link>
                        </li>
                        {categoryId && categoryKey && (
                            <li>
                                <ChevronRight aria-hidden="true" />
                                <Link to={localizedPublicPath(categoryPath(categoryId), locale as "en-US")}>{t(categoryKey)}</Link>
                            </li>
                        )}
                        <li aria-current="page">
                            <ChevronRight aria-hidden="true" />
                            <span>{displayTitle}</span>
                        </li>
                    </ol>
                </nav>

                <section className="aivt-stage">
                    <div className="aivt-stage-media">
                        <ClipPlayer
                            clips={detail.clips}
                            activeClip={activeClip}
                            onSelectClip={setActiveClip}
                            resultVideoUrl={resultVideoUrl}
                            generationPhase={generationPhase}
                            generationProgress={generationProgress}
                            generationError={generationError}
                            onMakeAgain={handleMakeAgain}
                            onRetry={() => void handleGenerate()}
                            onSaveToLibrary={handleSaveToLibrary}
                            isSaved={isSaved}
                            templateTitle={displayTitle}
                        />
                    </div>

                    <div className="aivt-make" ref={makeAreaRef}>
                        {stageKey && (
                            <p className="aivt-eyebrow aivt-make-eyebrow">
                                <span className={`aivt-dot is-${detail.heatStage}`} aria-hidden="true" />
                                {t(stageKey)} · {t("aiVideoTemplates.playsCount", { count: formatCount(detail.plays) })}
                            </p>
                        )}
                        <h1 className="aivt-serif aivt-make-title">{headline}</h1>
                        {summary && (
                            <div className="aivt-make-summary-wrap">
                                <p id="aivt-summary" className={`aivt-lede aivt-make-summary${summaryOpen ? "" : " is-clamped"}`}>
                                    {summary}
                                </p>
                                {summary.length > 140 && (
                                    <button type="button" className="aivt-link-btn" aria-expanded={summaryOpen} aria-controls="aivt-summary" onClick={() => setSummaryOpen((v) => !v)}>
                                        {summaryOpen ? t("aiVideoTemplates.showLess") : t("aiVideoTemplates.showMore")}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="aivt-more-row">
                            <p className="aivt-label">{t("aiVideoTemplates.replaceTitle")}</p>
                            <div className="aivt-segmented is-block aivt-replacements" role="group" aria-label={t("aiVideoTemplates.replaceTitle")}>
                                {(detail.replacementChoices || ["person", "background"]).map((choice) => (
                                    <button
                                        key={choice}
                                        type="button"
                                        aria-pressed={replacement === choice}
                                        className={replacement === choice ? "is-active" : undefined}
                                        onClick={() => {
                                            setReplacement(choice);
                                            setMode("face_replace");
                                        }}
                                    >
                                        {t(`aiVideoTemplates.replace.${choice}` as MessageKey)}
                                    </button>
                                ))}
                            </div>
                            <p className="aivt-more-desc">{t(`aiVideoTemplates.replaceHint.${replacement}` as MessageKey)}</p>
                        </div>
                        <UploadSlots replacement={replacement} slots={detail.slots} slotStates={slotStates} onPickFile={handlePickPhoto} onRemovePhoto={handleRemovePhoto} attention={attention && missingCount > 0} />
                        {attentionText && (
                            <p className="aivt-attention" role="alert">
                                {attentionText}
                            </p>
                        )}

                        <div className="aivt-cta">
                            <button type="button" className="aivt-primary" onClick={() => void handleGenerate()} disabled={isWorking || hasUploadingSlot || (!isGuest && !quote)} aria-busy={isWorking || undefined}>
                                {(isWorking || hasUploadingSlot) && <Loader2 className="aivt-spin" aria-hidden="true" />}
                                <span>{ctaLabel}</span>
                            </button>
                            {directPrice && (
                                <button type="button" className={generationError?.isInsufficientCredits ? "aivt-primary" : "aivt-link-btn"} disabled={isWorking || hasUploadingSlot} onClick={() => void handleGenerate(true)}>
                                    {t("aiVideoTemplates.directPay", { amount: directPrice })}
                                </button>
                            )}
                            {!directPrice && rechargeOffer && (
                                <button
                                    type="button"
                                    className={generationError?.isInsufficientCredits ? "aivt-primary" : "aivt-link-btn"}
                                    disabled={rechargeState === "opening"}
                                    aria-busy={rechargeState === "opening" || undefined}
                                    onClick={() => void openRecharge()}
                                >
                                    {rechargeState === "opening" && <Loader2 className="aivt-spin" aria-hidden="true" />}
                                    <span>{t("aiVideoTemplates.rechargeOffer", rechargeOffer)}</span>
                                </button>
                            )}
                            {!directPrice && (rechargeError || rechargeState === "waiting") && (
                                <p className={rechargeError ? "aivt-attention" : "aivt-recharge-note"} role={rechargeError ? "alert" : "status"}>
                                    {rechargeError || t("aiVideoTemplates.rechargeWaiting")}
                                </p>
                            )}
                            <ul className="aivt-cta-meta">
                                {price && (
                                    <li>
                                        <Coins aria-hidden="true" />
                                        {t("aiVideoTemplates.priceBreakdown", { rate: quote!.creditsPerSecond, seconds: quote!.durationSeconds.toFixed(1) })}
                                    </li>
                                )}
                                <li>
                                    <RotateCcw aria-hidden="true" />
                                    {t("aiVideoTemplates.refundIfFails")}
                                </li>
                            </ul>
                        </div>

                        {prompt && <PromptCard prompt={prompt} activeClip={activeClip} slots={slots} slotStates={slotStates} />}

                        <ExtraField id="aivt-extra" value={extraInstruction} length={Array.from(extraInstruction).length} onChange={setExtraInstruction} />

                        <dl className="aivt-glass aivt-details">
                            <div>
                                <dt>{t("aiVideoTemplates.resolutionTitle")}</dt>
                                <dd>{resolution}</dd>
                            </div>
                            {clipLength && (
                                <div>
                                    <dt>{t("aiVideoTemplates.detailLength")}</dt>
                                    <dd>{clipLength}</dd>
                                </div>
                            )}
                            <div>
                                <dt>{t("aiVideoTemplates.detailPhotos")}</dt>
                                <dd>{slots.length}</dd>
                            </div>
                            <div>
                                <dt>{t("aiVideoTemplates.detailSound")}</dt>
                                <dd>{t("aiVideoTemplates.soundOriginalKept")}</dd>
                            </div>
                        </dl>

                        <GenerationOptions
                            models={detail.models}
                            model={model}
                            onModelChange={(id) => {
                                setQuote(null);
                                setModel(id);
                                const supported = detail.models?.find((item) => item.id === id)?.resolutions;
                                if (supported?.length && !supported.includes(resolution)) setResolution(supported[0]);
                            }}
                            mode={mode}
                            onModeChange={handleModeChange}
                            options={detail.options}
                            selectedOptionIds={selectedOptionIds}
                            onToggleOption={handleToggleOption}
                            sceneInput={sceneInput}
                            onSceneInputChange={setSceneInput}
                            resolution={resolution}
                            onResolutionChange={setResolution}
                        />
                    </div>
                    <aside className="aivt-related-rail" aria-label={t("aiVideoTemplates.relatedRailTitle")}>
                        <div className="aivt-related-rail-head">
                            <p className="aivt-h3">{t("aiVideoTemplates.relatedRailTitle")}</p>
                            <Link to={localizedPublicPath(categoryPath(categoryId || "all"), locale as "en-US")}>{t("homeShowcase.viewAll")} →</Link>
                        </div>
                        <div className="aivt-related-rail-list">
                            {relatedTemplates.map((item) => (
                                <TemplateCard key={item.slug} template={item} compact />
                            ))}
                        </div>
                    </aside>
                </section>

                <ArticleSection
                    content={content}
                    name={displayTitle}
                    clipCoverUrl={activeClip.coverUrl}
                    photoUrl={firstPhoto}
                    resultUrl={generationPhase === "done" ? resultVideoUrl : null}
                    related={relatedTemplates}
                    currentSlug={detail.slug}
                    ctaLabel={price ? t("aiVideoTemplates.makeMyVideo", { credits: price }) : t("aiVideoTemplates.makeMyVideoNoPrice")}
                    onMake={scrollToMake}
                    onTop={scrollPageTop}
                />
            </div>

            <BackToTop />
            <div className="aivt-mobile-bar">
                <span className="aivt-mobile-bar-price">{price ? t("aiVideoTemplates.creditsUnit", { credits: price }) : displayTitle}</span>
                {directPrice && (
                    <button type="button" className="aivt-link-btn" disabled={isWorking || hasUploadingSlot} onClick={() => void handleGenerate(true)}>
                        {t("aiVideoTemplates.directPayShort", { amount: directPrice })}
                    </button>
                )}
                {!directPrice && rechargeOffer && (
                    <button type="button" className="aivt-link-btn" disabled={rechargeState === "opening"} onClick={() => void openRecharge()}>
                        {t("aiVideoTemplates.rechargeShort", { amount: rechargeOffer.amount })}
                    </button>
                )}
                <button type="button" className="aivt-primary" onClick={() => void handleGenerate()} disabled={isWorking || hasUploadingSlot || (!isGuest && !quote)}>
                    {(isWorking || hasUploadingSlot) && <Loader2 className="aivt-spin" aria-hidden="true" />}
                    <span>{ctaLabel}</span>
                </button>
            </div>
        </div>
    );
}
