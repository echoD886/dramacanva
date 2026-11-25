import { DcMotion, type DcActivity } from "@/components/layout/dc-motion";
import type { AgentQuestionField } from "./canvas-agent-question-form";
import { agentUpgradeText } from "@/i18n/agent-upgrade-copy";
import { AgentMediaBatchBar } from "./canvas-cloud-agent-media-batch-bar";
import { latestAgentMediaBatch, mergeAgentMediaBatchProgress } from "@/lib/canvas/cloud-agent-media-batch";
import { AgentLauncher } from "./canvas-agent-launcher";
import { useSkillCuration, curationQuery } from "@/components/skills/skill-curation-browser";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { Button, Dropdown, Input, Popconfirm } from "antd";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Bot, Check, CircleDot, Clock3, Download, History, LoaderCircle, MessageSquarePlus, RotateCcw, Settings2, ShieldCheck, Trash2, Sparkles, Minus } from "lucide-react";
import { saveAs } from "file-saver";
import { dispatchDirectorPreview } from "@/lib/canvas/director/director-preview";
import { selectImageInspectionModel, modelSupportsImageInspection } from "@/lib/canvas/image-to-previs-agent";
import { buildAgentDebugExport } from "@/lib/canvas/agent-debug-export";
import { agentPlanVisible, latestAgentPlanItems, pendingAgentQuestion } from "@/lib/canvas/cloud-agent-plan";
import { markdownPlainText } from "@/lib/markdown-plain-text";
import { agentHistoryDate, conversationSummary, filterAgentHistory, sortAgentHistory } from "@/lib/canvas/canvas-agent-history";
import { nanoid } from "nanoid";
import { useI18n } from "@/i18n/use-i18n";
import { type MessageKey } from "@/i18n/messages";
import { agentToolText } from "@/lib/canvas/agent-tool-presentation";

import { ModelPicker } from "@/components/model-picker";
import { cn } from "@/lib/utils";
import { formatCredits } from "@/constant/credits";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { selectCloudAgentTextModel } from "@/lib/canvas/cloud-agent-text-model";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { canvasThemes, type CanvasTheme } from "@/lib/canvas-theme";
import { agentErrorPresentation, agentSubmissionErrorTitle, isHiddenAgentToolStep } from "@/lib/canvas/agent-error-presentation";
import { upsertAgentRunFailure } from "@/lib/canvas/agent-run-failure";
import {
    cancelAgentRun,
    getAgentCapabilities,
    getAgentProfile,
    getAgentRun,
    createAgentRun,
    decideAgentApproval,
    quoteAgentApproval,
    sendAgentInterjection,
    sendAgentMessage,
    subscribeAgentEvents,
    updateAgentProfile,
    type AgentEvent,
    type AgentPermissionMode,
    type AgentProfileScope,
    type AgentProfileView,
    type AgentReasoningMode,
    type AgentRun,
} from "@/services/api/agent";
import { agentApprovalPresentation } from "@/lib/canvas/agent-approval-presentation";
import { agentApprovalMatchesSettings, agentImageApproval, agentMediaSettingsEqual } from "@/lib/canvas/agent-media-approval";
import type { AgentMediaSettings } from "@/services/api/agent";
import { CanvasAgentImageApprovalSettings } from "./canvas-agent-image-approval-settings";
import { addSkill, listAddedSkills, listSkillPresets, listSkills, type Skill, type SkillCategory, type SkillPreset } from "@/services/api/skills";
import { getActiveUserScope } from "@/lib/user-scope";
import { buildAgentSceneBuckets, confirmedAgentSkillIds } from "@/lib/canvas/agent-scene-presets";
import { buildAgentFeedSegments } from "@/lib/canvas/agent-operation-feed";
import { AgentWelcome } from "./canvas-agent-welcome";
import { AgentSceneCapsules, agentPresetCopy } from "./canvas-agent-scene-capsules";
import { AgentOperationFeed } from "./canvas-agent-operation-feed";
import { AgentConnectorsBar } from "./canvas-cloud-agent-connectors";
import "./canvas-agent-surfaces.css";
import {
    clearCloudAgentPendingSubmission,
    cloudAgentConversationTitle,
    loadCloudAgentConversations,
    legacyAgentConversations,
    loadCloudAgentPendingSubmission,
    saveCloudAgentConversations,
    saveCloudAgentPendingSubmission,
    type CloudAgentConversation,
    type CloudAgentPendingSubmission,
} from "@/services/cloud-agent-conversations";
import { logicalModelIDForConfig, modelOptionName, resolveModelRequestConfig, useEffectiveConfig } from "@/stores/use-config-store";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { applyAgentCanvasPatches, refreshCanvasAfterAgent, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { acquireCanvasAgentSync as createAgentCanvasSync } from "@/services/canvas-agent-sync-session";
import { buildSkillMentionReferences, resolveSkillMentions } from "@/services/skill-runtime";
import { AgentChatComposer, AgentChatMessage, AgentPlanBar, AgentQuestionBar, AgentWorkingMessage, type CloudAgentChatMessage, type CloudAgentPlanItem } from "./canvas-cloud-agent-chat-ui";
import { CanvasAgentSkillLibraryModal } from "./canvas-agent-skill-library-modal";
import type { CanvasAssistantSession } from "@/types/canvas";
import { CanvasCloudAgentSettings, agentPermissionLabel, agentPermissionMenuItems, agentPermissionVisual, type AgentContextKey } from "./canvas-cloud-agent-settings";
import { useAgentPanelLayout } from "./use-agent-panel-layout";
import "./canvas-cloud-agent.css";

export type CanvasAgentPrefillRequest = {
    id: number;
    canvasId: string;
    text: string;
    displayText?: string;
    contextText?: string;
    requiresVision?: boolean;
    autoSubmit?: boolean;
};

export function composeAgentPrefillSubmission(activePrefill: Pick<CanvasAgentPrefillRequest, "text" | "displayText" | "contextText"> | null, inputPrompt: string): { prompt: string; visibleText: string } {
    const visibleText = inputPrompt.trim();
    if (!visibleText || !activePrefill) return { prompt: visibleText, visibleText };
    const context = (activePrefill.contextText ?? (activePrefill.displayText ? activePrefill.text : "")).trim();
    if (!context) return { prompt: visibleText, visibleText };
    const baseDisplay = (activePrefill.displayText || "").trim();
    if (baseDisplay && visibleText === baseDisplay) return { prompt: context, visibleText };
    if (visibleText === context) return { prompt: context, visibleText: baseDisplay || visibleText };
    return { prompt: `${context}\n\n${visibleText}`, visibleText };
}
type CloudAgentPanelProps = {
    canvasId: string;
    domainProjectId?: string;
    nodeCount: number;
    references: CanvasResourceReference[];
    legacySessions?: CanvasAssistantSession[];
    open: boolean;
    prefillPrompt?: string;
    prefillRequest?: CanvasAgentPrefillRequest | null;
    onOpen: () => void;
    onActivityChange?: (activity: DcActivity) => void;
    onCollapse: () => void;
    onRecordDecision?: (id: string, title: string, content: string) => Promise<void>;
    onFocusNode?: (nodeId: string) => void;
};
type ApprovalState = { approvalId: string; detail: Record<string, unknown>; reason: string };
type AgentPanelView = "chat" | "history" | "settings";

const AGENT_PROFILE_RETRIES = 3;
const AGENT_PROFILE_RETRY_MS = 3000;

export function CanvasCloudAgentPanel({ canvasId, domainProjectId, nodeCount, references, legacySessions, open, prefillPrompt, prefillRequest, onOpen, onCollapse, onFocusNode, onActivityChange, onRecordDecision }: CloudAgentPanelProps) {
    const { t, locale } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const config = useEffectiveConfig();
    const [manualTextModel, setManualTextModel] = useState("");
    const reducedMotion = useReducedMotion();
    const [view, setView] = useState<AgentPanelView>("chat");
    const [run, setRun] = useState<AgentRun | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting" | "disconnected">("connecting");
    const [connectionEpoch, setConnectionEpoch] = useState(0);
    const [messages, setMessages] = useState<CloudAgentChatMessage[]>([]);
    const [prompt, setPrompt] = useState("");
    const lastPrefillPromptRef = useRef("");
    const [reasoningMode, setReasoningMode] = useState<AgentReasoningMode>("off");
    const [profileView, setProfileView] = useState<AgentProfileView | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState<string>();
    const profileRequestRef = useRef(0);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
    const [scenePresets, setScenePresets] = useState<SkillPreset[]>([]);
    const [createdSkills, setCreatedSkills] = useState<Skill[]>([]);
    const [presetApplyingId, setPresetApplyingId] = useState<string | null>(null);
    const [connectorsVisible, setConnectorsVisible] = useState(true);
    const [recommendationError, setRecommendationError] = useState<MessageKey | null>(null);
    const presetApplyingRef = useRef<string | null>(null);
    const skillScope = getActiveUserScope();
    const [marketSkills, setMarketSkills] = useState<Skill[]>([]);
    const [skillSearch, setSkillSearch] = useState("");
    const [debouncedSkillSearch, setDebouncedSkillSearch] = useState("");
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [skillHasMore, setSkillHasMore] = useState(false);
    const [skillPage, setSkillPage] = useState(1);
    const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
    const { curation } = useSkillCuration(open);
    const [skillTag, setSkillTag] = useState("all");
    const [skillsOpen, setSkillsOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [approvalSubmitting, setApprovalSubmitting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [stopping, setStopping] = useState(false);
    const [approval, setApproval] = useState<ApprovalState | null>(null);
    const [permissionMode, setPermissionMode] = useState<AgentPermissionMode>("request_approval");
    const [contextScope, setContextScope] = useState<AgentContextKey[]>(["canvas"]);
    const [maxCredits, setMaxCredits] = useState("200");
    const [maxGenerationTasks, setMaxGenerationTasks] = useState("0");
    const [maxVideoSeconds, setMaxVideoSeconds] = useState("0");
    const [conversations, setConversations] = useState<CloudAgentConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState(() => nanoid());
    const legacySources = useRef<string[]>([]);
    const [historyHydrated, setHistoryHydrated] = useState(false);
    const [pendingHydrated, setPendingHydrated] = useState(false);
    const [planMinimized, setPlanMinimized] = useState(false);
    const planItems = useMemo(() => latestAgentPlanItems(messages), [messages]);
    const planVisible = agentPlanVisible(planItems);
    const pendingQuestion = useMemo(() => pendingAgentQuestion(messages), [messages]);
    const panelLayout = useAgentPanelLayout();
    const lastSeqRef = useRef(0);
    const canvasSyncRef = useRef<ReturnType<typeof createAgentCanvasSync> | null>(null);
    useEffect(() => {
        if (!canvasId) return;
        const sync = createAgentCanvasSync({
            canvasId,
            applyPatches: (patches) => applyAgentCanvasPatches(canvasId, patches),
            refresh: () => refreshCanvasAfterAgent(canvasId),
            onError: (cause) => setMessages((current) => appendAgentError(current, `canvas-sync-${canvasId}`, cause, "canvasCloudAgent.syncConflict")),
        });
        canvasSyncRef.current = sync;
        return () => {
            sync.dispose();
            if (canvasSyncRef.current === sync) canvasSyncRef.current = null;
        };
    }, [canvasId]);
    const skillPageRequestRef = useRef(false);
    const approvalRequestRef = useRef<string | null>(null);
    const pendingSubmission = useRef<CloudAgentPendingSubmission | null>(null);
    const submissionRequestRef = useRef(false);
    const conversationScope = activeConversationId;
    const currentCanvas = useRef(canvasId);
    currentCanvas.current = canvasId;
    const currentScope = useRef(conversationScope);
    currentScope.current = conversationScope;
    useEffect(() => {
        presetApplyingRef.current = null;
        setPresetApplyingId(null);
        setRecommendationError(null);
    }, [conversationScope, skillScope]);
    const running = Boolean(run?.cleanupPending) || run?.status === "running" || run?.status === "queued" || run?.status === "waiting_approval";
    const runningElsewhere = running && (run?.canvasId ?? "") !== canvasId;
    const [hasOpened, setHasOpened] = useState(open);
    useEffect(() => {
        if (open) setHasOpened(true);
    }, [open]);
    const needsAnswer = !runningElsewhere && !approvalSubmitting && Boolean(approval || run?.status === "waiting_approval" || (!busy && pendingQuestion));
    const awaitingPrompt = (hasOpened || open) && !run && !messages.some((message) => message.role === "user");
    const activity: DcActivity = needsAnswer ? "waiting" : busy || (running && !runningElsewhere) ? "working" : awaitingPrompt ? "waiting" : "idle";
    useEffect(() => {
        onActivityChange?.(activity);
    }, [activity, onActivityChange]);
    useEffect(() => () => onActivityChange?.("idle"), [onActivityChange]);
    const legacyReadonly = conversations.some((conversation) => conversation.id === activeConversationId && conversation.legacy === true);
    const selectedModel = useMemo(() => selectCloudAgentTextModel(config, manualTextModel), [config, manualTextModel]);
    const reasoningSupported = Boolean(modelCapabilityConfigFor(config, selectedModel).text?.thinking);
    useEffect(() => {
        if (!reasoningSupported && reasoningMode !== "off") setReasoningMode("off");
    }, [reasoningSupported, reasoningMode]);
    const installedSkills = useMemo(() => skills.filter((skill) => skill.isAdded), [skills]);
    const enabledSkills = useMemo(() => installedSkills.filter((skill) => selectedSkillIds.includes(skill.skillId)), [installedSkills, selectedSkillIds]);
    const sceneBuckets = useMemo(() => buildAgentSceneBuckets(scenePresets, installedSkills, createdSkills), [scenePresets, installedSkills, createdSkills]);
    const skillSelectionDisabled = legacyReadonly || busy || running || !historyHydrated || !pendingHydrated || Boolean(presetApplyingId);
    const status = run?.status || "idle";
    const statusLabel =
        status === "waiting_approval"
            ? t("canvasCloudAgent.status.waitingApproval")
            : status === "running" || status === "queued"
              ? t("canvasCloudAgent.status.running")
              : status === "completed"
                ? t("canvasCloudAgent.status.completed")
                : status === "failed"
                  ? t("canvasCloudAgent.status.failed")
                  : status === "cancelled"
                    ? t("canvasCloudAgent.status.cancelled")
                    : status === "rejected"
                      ? t("canvasCloudAgent.status.rejected")
                      : t("canvasCloudAgent.status.idle");
    const statusColor = status === "failed" ? "#e66b6b" : status === "rejected" || status === "cancelled" ? theme.node.muted : status === "waiting_approval" ? "#d6a24a" : status === "running" || status === "queued" ? "#69c29b" : theme.node.muted;

    useEffect(() => {
        const value = prefillPrompt?.trim();
        if (!value || value === lastPrefillPromptRef.current) return;
        lastPrefillPromptRef.current = value;
        activePrefillRef.current = null;
        setPrompt(value);
        setView("chat");
    }, [prefillPrompt]);

    const lastPrefillRequestRef = useRef<number | null>(null);
    const submittedPrefillRef = useRef<number | null>(null);
    const activePrefillRef = useRef<{ id: number; scope: string } | null>(null);
    const interjectMetaRef = useRef<{ value: string; visiblePrompt: string; prefill: { id: number; scope: string } | null } | null>(null);
    useEffect(() => {
        if (!historyHydrated || !pendingHydrated || !prefillRequest || prefillRequest.canvasId !== canvasId || lastPrefillRequestRef.current === prefillRequest.id) return;
        lastPrefillRequestRef.current = prefillRequest.id;
        activePrefillRef.current = { id: prefillRequest.id, scope: conversationScope };
        setPrompt(prefillRequest.displayText || prefillRequest.text);
        setView("chat");
        if (prefillRequest.requiresVision) {
            const model = selectImageInspectionModel(config, selectedModel);
            if (model) setManualTextModel(model);
            else setMessages((current) => appendUniqueMessage(current, { id: `vision-unavailable-${prefillRequest.id}`, role: "system", text: t("previs.visionUnavailable") }));
        }
    }, [canvasId, config, conversationScope, historyHydrated, pendingHydrated, prefillRequest, selectedModel, t]);

    useEffect(() => {
        if (!open || view !== "chat") setSkillsOpen(false);
    }, [open, view]);

    const fetchProfile = useCallback(async () => {
        const requestId = ++profileRequestRef.current;
        setProfileLoading(true);
        setProfileError(undefined);
        setProfileView(null);
        try {
            // 新画布先存本地、几秒后才上云；云端记录出现前读取会失败，稍等重试，避免面板一直显示错误。
            for (let attempt = 0; ; attempt++) {
                try {
                    const result = await getAgentProfile({ projectId: domainProjectId, canvasId });
                    if (profileRequestRef.current === requestId) setProfileView(result);
                    return result;
                } catch (cause) {
                    if (profileRequestRef.current !== requestId) return;
                    if (!canvasId || attempt >= AGENT_PROFILE_RETRIES) throw cause;
                    await new Promise((resolve) => window.setTimeout(resolve, AGENT_PROFILE_RETRY_MS));
                    if (profileRequestRef.current !== requestId) return;
                }
            }
        } catch (cause) {
            if (profileRequestRef.current === requestId) setProfileError(cause instanceof Error ? cause.message : String(cause));
            throw cause;
        } finally {
            if (profileRequestRef.current === requestId) setProfileLoading(false);
        }
    }, [canvasId, domainProjectId]);

    const reloadProfile = useCallback(async () => {
        await fetchProfile().catch(() => undefined);
    }, [fetchProfile]);

    useEffect(() => {
        void reloadProfile();
    }, [reloadProfile]);

    const saveProfile = async (input: { scope: AgentProfileScope; projectId?: string; canvasId?: string; content: string; revision: number }) => {
        setProfileSaving(true);
        try {
            const result = await updateAgentProfile(input);
            setProfileView(result);
            setProfileError(undefined);
            return result;
        } finally {
            setProfileSaving(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSkillSearch(skillSearch.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [skillSearch]);

    useEffect(() => {
        let active = true;
        const refresh = () => {
            void listAddedSkills()
                .then((result) => {
                    if (!active) return;
                    setSkills(result.skills);
                    setMessages((current) => current.filter((message) => message.id !== "skills-load-error"));
                })
                .catch((cause) => {
                    if (active) setMessages((current) => appendAgentError(current, "skills-load-error", cause, "canvasCloudAgent.skillsLoadFailed"));
                });
        };
        refresh();
        window.addEventListener("canvas-skills-changed", refresh);
        window.addEventListener("focus", refresh);
        return () => {
            active = false;
            window.removeEventListener("canvas-skills-changed", refresh);
            window.removeEventListener("focus", refresh);
        };
    }, [open, skillScope]);

    useEffect(() => {
        if (!open) return;
        let active = true;
        setScenePresets([]);
        setCreatedSkills([]);
        void Promise.allSettled([listSkillPresets(), listSkills({ scope: "created", pageSize: 50 })]).then(([presets, created]) => {
            if (!active || getActiveUserScope() !== skillScope) return;
            if (presets.status === "fulfilled" && Array.isArray(presets.value?.presets)) setScenePresets(presets.value.presets);
            else setRecommendationError("canvasAgentEntry.presetsLoadFailed");
            if (created.status === "fulfilled") setCreatedSkills(created.value.skills);
        });
        return () => {
            active = false;
        };
    }, [open, skillScope]);

    const applyRecommendedSkills = async (id: string, name: string, requestedIds: string[], append = false) => {
        if (skillSelectionDisabled || presetApplyingRef.current) return;
        const scope = conversationScope;
        const operation = `${scope}:${id}`;
        const active = () => currentScope.current === scope && getActiveUserScope() === skillScope && presetApplyingRef.current === operation;
        presetApplyingRef.current = operation;
        setPresetApplyingId(id);
        setRecommendationError(null);
        try {
            const ids = [...new Set(append ? [...selectedSkillIds, ...requestedIds] : requestedIds)];
            if (!ids.length || ids.length > 8) throw new Error("skill selection limit");
            const installed = new Set(installedSkills.map((skill) => skill.skillId));
            for (const skillId of ids) {
                if (!active()) return;
                if (!installed.has(skillId)) await addSkill(skillId);
            }
            if (!active()) return;
            const refreshed = await listAddedSkills();
            if (!active()) return;
            const confirmed = confirmedAgentSkillIds(ids, refreshed.skills);
            if (!confirmed) throw new Error("skill installation not confirmed");
            setSkills(refreshed.skills);
            setSelectedSkillIds(confirmed);
            setMessages((current) => appendUniqueMessage(current, { id: `preset-${nanoid()}`, role: "system", text: t("canvasAgentEntry.applied", { name, count: confirmed.length }) }));
        } catch {
            if (active()) setRecommendationError("canvasAgentEntry.installFailed");
        } finally {
            if (active()) {
                presetApplyingRef.current = null;
                setPresetApplyingId(null);
            }
        }
    };

    useEffect(() => {
        if (view !== "settings" && !skillsOpen) return;
        let active = true;
        setSkillsLoading(true);
        void listSkills({
            scope: "public",
            search: debouncedSkillSearch || undefined,
            ...(curation?.enabled ? curationQuery(curation, skillsOpen && skillTag !== "all" ? skillTag : "") : { tag: skillsOpen && skillTag !== "all" ? skillTag : undefined }),
            pageSize: 20,
            sort: "popular",
        })
            .then((result) => {
                if (active) {
                    setMarketSkills(result.skills);
                    setSkillHasMore(result.hasMore);
                    setSkillPage(result.page);
                    if (result.categories.length > 0) setSkillCategories(result.categories);
                }
            })
            .catch(() => {
                if (active) setMarketSkills([]);
            })
            .finally(() => {
                if (active) setSkillsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [curation, view, skillsOpen, debouncedSkillSearch, skillTag]);

    const loadMoreSkills = async () => {
        if (skillsLoading || skillPageRequestRef.current || !skillHasMore || skillSearch.trim() !== debouncedSkillSearch) return;
        skillPageRequestRef.current = true;
        setSkillsLoading(true);
        try {
            const result = await listSkills({
                scope: "public",
                search: debouncedSkillSearch || undefined,
                ...(curation?.enabled ? curationQuery(curation, skillsOpen && skillTag !== "all" ? skillTag : "") : { tag: skillsOpen && skillTag !== "all" ? skillTag : undefined }),
                page: skillPage + 1,
                pageSize: 20,
                sort: "popular",
            });
            setMarketSkills((current) => [...current, ...result.skills.filter((skill) => !current.some((item) => item.skillId === skill.skillId))]);
            setSkillPage(result.page);
            setSkillHasMore(result.hasMore);
        } finally {
            skillPageRequestRef.current = false;
            setSkillsLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        setHistoryHydrated(false);
        setPendingHydrated(false);
        pendingSubmission.current = null;
        setBusy(false);
        setConversations([]);
        setRun(null);
        setMessages([]);
        setApproval(null);
        setApprovalSubmitting(false);
        approvalRequestRef.current = null;
        setPrompt("");
        void loadCloudAgentConversations(canvasId)
            .then(async (document) => {
                if (!active) return;
                const sources = document.legacySources ?? [];
                const importCanvas = Boolean(canvasId && legacySessions?.length && !sources.includes(canvasId));
                const imported = importCanvas ? legacyAgentConversations(legacySessions ?? []) : [];
                const history = [...document.conversations, ...imported.filter((chat) => !document.conversations.some((saved) => saved.id === chat.id))];
                legacySources.current = importCanvas ? [...sources, canvasId] : sources;
                const current = history.find((conversation) => conversation.id === document.activeId) || history[0];
                setConversations(history);
                if (current) {
                    setActiveConversationId(current.id);
                    setMessages(current.messages);
                    setRun(current.run);
                    setPermissionMode(current.permissionMode);
                    setSelectedSkillIds(current.skillIds || []);
                    if (current.model) setModel(current.model);
                    const pending = await loadCloudAgentPendingSubmission(current.id, skillScope);
                    if (!active) return;
                    pendingSubmission.current = pending;
                    if (pending?.request) setPrompt(current.messages.find((item) => item.id === pending.messageId)?.text || pending.request.prompt);
                } else {
                    setActiveConversationId(nanoid());
                    pendingSubmission.current = null;
                }
                setPendingHydrated(true);
            })
            .catch((cause) => {
                if (!active) return;
                setMessages((current) => appendAgentError(current, "history-error", cause, "canvasCloudAgent.historyResumeFailed"));
            })
            .finally(() => {
                if (active) setHistoryHydrated(true);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!historyHydrated || !canvasId || !legacySessions?.length || legacySources.current.includes(canvasId)) return;
        legacySources.current = [...legacySources.current, canvasId];
        const imported = legacyAgentConversations(legacySessions);
        setConversations((current) => [...current, ...imported.filter((chat) => !current.some((existing) => existing.id === chat.id))]);
    }, [canvasId, legacySessions, historyHydrated]);

    useEffect(() => {
        if (!historyHydrated || (!messages.length && !run)) return;
        const now = new Date().toISOString();
        setConversations((current) => {
            const existing = current.find((conversation) => conversation.id === activeConversationId);
            const next: CloudAgentConversation = {
                id: activeConversationId,
                legacy: existing?.legacy,
                title: cloudAgentConversationTitle(messages),
                messages,
                run,
                model: selectedModel || undefined,
                permissionMode,
                skillIds: selectedSkillIds,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
            };
            return [next, ...current.filter((conversation) => conversation.id !== activeConversationId)];
        });
    }, [activeConversationId, historyHydrated, messages, permissionMode, run, selectedModel, selectedSkillIds]);

    useEffect(() => {
        if (!historyHydrated) return;
        const timer = window.setTimeout(() => {
            void saveCloudAgentConversations(activeConversationId, conversations, legacySources.current, skillScope);
        }, 180);
        return () => window.clearTimeout(timer);
    }, [activeConversationId, conversations, historyHydrated]);

    useEffect(() => {
        if (!run?.id) return;
        lastSeqRef.current = 0;
        return subscribeAgentEvents(
            run.id,
            (event) => {
                // Only persisted agent events participate in the replay cursor.
                // Snapshot-derived UI events intentionally use seq=0.
                if (event.seq > 0) {
                    if (event.seq <= lastSeqRef.current) return;
                    if (currentCanvas.current === run.canvasId && event.seq > lastSeqRef.current + 1) canvasSyncRef.current?.reconcile();
                    lastSeqRef.current = event.seq;
                }
                setMessages((current) => current.filter((item) => item.id !== `stream-error-${run.id}`));
                applyAgentEvent(event, setMessages, setRun, setApproval, setPrompt);
                if (currentCanvas.current === run.canvasId) canvasSyncRef.current?.receive(event);
            },
            {
                after: 0,
                onConnectionChange: setConnectionStatus,
                onError: (cause) => {
                    if (currentCanvas.current === run.canvasId) canvasSyncRef.current?.reconcile();
                    setMessages((current) => appendAgentError(current, `stream-error-${run.id}`, cause, "canvasCloudAgent.streamDisconnected"));
                    // The observation channel failed, not the durable run. Keep
                    // identity and approval so reconnect/cancel/continue remain available.
                    setConnectionStatus("disconnected");
                },
            },
        );
    }, [run?.id, connectionEpoch]);

    useEffect(() => {
        if (!run?.id || connectionStatus !== "disconnected") return;
        const reconnect = () => setConnectionEpoch((value) => value + 1);
        window.addEventListener("online", reconnect);
        return () => window.removeEventListener("online", reconnect);
    }, [run?.id, connectionStatus]);

    const interject = async (value: string) => {
        const meta = interjectMetaRef.current?.value === value ? interjectMetaRef.current : null;
        interjectMetaRef.current = null;
        const displayValue = meta?.visiblePrompt || value;
        const activeRun = run;
        if (!value || !activeRun?.id || runningElsewhere || legacyReadonly || busy || connectionStatus !== "connected" || currentScope.current !== conversationScope || !historyHydrated || !pendingHydrated) {
            if (meta?.prefill) activePrefillRef.current = meta.prefill;
            return;
        }
        const scope = conversationScope;
        const messageId = `user-${crypto.randomUUID()}`;
        setBusy(true);
        try {
            await sendAgentInterjection(activeRun.id, { text: value, messageId });
            if (currentScope.current !== scope) return;
            setPrompt("");
            setMessages((current) => appendUniqueMessage(current, { id: messageId, role: "user", text: displayValue, interjection: "sent" }));
        } catch (cause) {
            if (currentScope.current !== scope) return;
            setMessages((current) => appendAgentError(current, `interject-error-${activeConversationId}-${messageId}`, cause, "cloudAgent.theInterjectionWasNotDelivered"));
            if ((cause as { status?: number }).status === 409) {
                if (meta?.prefill) activePrefillRef.current = meta.prefill;
                setPrompt(displayValue);
            }
        } finally {
            if (currentScope.current === scope) setBusy(false);
        }
    };

    const submit = async (override?: string) => {
        if (presetApplyingRef.current) return;
        // A consumed image entry must not replace a later ordinary chat prompt.
        const activePrefill = prefillRequest?.canvasId === canvasId && activePrefillRef.current?.id === prefillRequest.id && activePrefillRef.current.scope === conversationScope ? prefillRequest : null;
        const pendingDisplayPrompt = pendingSubmission.current?.request && pendingSubmission.current.messageId ? messages.find((item) => item.id === pendingSubmission.current?.messageId)?.text : undefined;
        const composed =
            override !== undefined && override !== activePrefill?.text
                ? { prompt: override.trim(), visibleText: override.trim() }
                : !activePrefill && override === undefined && pendingDisplayPrompt && prompt.trim() === pendingDisplayPrompt
                  ? { prompt: pendingSubmission.current!.request!.prompt, visibleText: pendingDisplayPrompt }
                  : composeAgentPrefillSubmission(activePrefill, override ?? prompt);
        const value = composed.prompt;
        const visiblePrompt = composed.visibleText;
        if (running) {
            interjectMetaRef.current = { value, visiblePrompt, prefill: activePrefillRef.current };
            activePrefillRef.current = null;
            await interject(value);
            return;
        }
        if (!value || legacyReadonly || busy || (run && connectionStatus !== "connected") || submissionRequestRef.current || !historyHydrated || !pendingHydrated || currentScope.current !== conversationScope) return;
        const scope = conversationScope;
        const consumedPrefill = activePrefill ? activePrefillRef.current : null;
        submissionRequestRef.current = true;
        setBusy(true);
        let accepted = false;
        try {
            const pending = pendingSubmission.current;
            // An ambiguous previous POST owns its body/key until reconciled.
            // Editing model settings or prompt must not silently create a new charge.
            if (pending?.request && (pending.request.canvasId !== canvasId || pending.request.prompt !== value)) throw new Error(t("canvasCloudAgent.pendingRetryRequired"));
            if (!pending?.request) {
                const capabilities = await getAgentCapabilities();
                if (currentScope.current !== scope) return;
                if (!capabilities.permissionModes.includes(permissionMode)) throw new Error(t("canvasCloudAgent.permissionUnsupported"));
                if (selectedSkillIds.length && !capabilities.skills) throw new Error(t("canvasCloudAgent.skillsUnsupported"));
                if (canvasId) await saveRemoteUserDataNow();
                if (currentScope.current !== scope || currentCanvas.current !== canvasId) return;
                const profile = profileView && !profileError && !profileLoading ? profileView : await fetchProfile();
                if (currentScope.current !== scope || currentCanvas.current !== canvasId) return;
                if (!profile) throw new Error(t("canvasCloudAgent.profileNotReady"));
                const agentConfig = { ...config, model: selectedModel };
                const requestConfig = resolveModelRequestConfig(agentConfig, selectedModel);
                const logicalModelId = logicalModelIDForConfig(agentConfig);
                const input = {
                    canvasId,
                    prompt: value,
                    locale,
                    reasoningMode: reasoningSupported ? reasoningMode : "off",
                    profileRevision: profile.revision,
                    model: modelOptionName(selectedModel) || undefined,
                    ...(logicalModelId ? { logicalModelId } : requestConfig.channelId ? { channelId: requestConfig.channelId, channelModelKey: modelOptionName(selectedModel) || undefined } : {}),
                    skillIds: [...new Set([...selectedSkillIds, ...resolveSkillMentions(value, installedSkills).map((skill) => skill.skillId)])],
                    permissionMode,
                    contextScope: canvasId ? contextScope : [],
                    budget: { maxCredits: positiveNumber(maxCredits), maxGenerationTasks: permissionMode === "read_only" ? 0 : Number(maxGenerationTasks), maxVideoSeconds: permissionMode === "read_only" ? 0 : Number(maxVideoSeconds) },
                };
                const fingerprint = JSON.stringify({ scope, parent: run?.id, input });
                if (pending && pending.fingerprint !== fingerprint) throw new Error(t("canvasCloudAgent.pendingUnconfirmed"));
                const key = pending?.key || crypto.randomUUID();
                const next = { fingerprint, key, request: { ...input, idempotencyKey: key }, parentRunId: run?.id, messageId: `user-${key}` };
                // Persist before sending. A failed local save must not submit a request
                // whose recovery identity will disappear on reload.
                await saveCloudAgentPendingSubmission(activeConversationId, next, skillScope);
                if (currentScope.current !== scope) return;
                pendingSubmission.current = next;
            }
            const submission = pendingSubmission.current!;
            const request = submission.request!;
            const nextMessages = appendUniqueMessage(messages, { id: submission.messageId || `user-${submission.key}`, role: "user", text: activePrefill && request.prompt === value ? visiblePrompt : request.prompt });
            const now = new Date().toISOString();
            const existing = conversations.find((item) => item.id === activeConversationId);
            // Persist a discoverable conversation before POST as well as its key;
            // otherwise a reload of a brand-new chat can orphan the pending record.
            await saveCloudAgentConversations(
                activeConversationId,
                [
                    {
                        id: activeConversationId,
                        title: cloudAgentConversationTitle(nextMessages),
                        messages: nextMessages,
                        run,
                        model: selectedModel || undefined,
                        permissionMode,
                        skillIds: selectedSkillIds,
                        createdAt: existing?.createdAt || now,
                        updatedAt: now,
                    },
                    ...conversations.filter((item) => item.id !== activeConversationId),
                ],
                legacySources.current,
                skillScope,
            );
            if (currentScope.current !== scope) return;
            activePrefillRef.current = null;
            setPrompt("");
            setMessages(nextMessages);
            const result = submission.parentRunId ? await sendAgentMessage(submission.parentRunId, request) : await createAgentRun(request);
            accepted = true;
            if (currentScope.current === scope) setRun(result.run);
            await clearCloudAgentPendingSubmission(activeConversationId, skillScope);
            if (currentScope.current === scope) pendingSubmission.current = null;
        } catch (cause) {
            if (currentScope.current !== scope) return;
            if (!accepted) {
                if (consumedPrefill) activePrefillRef.current = consumedPrefill;
                setPrompt(visiblePrompt);
                const status = (cause as { status?: number }).status;
                if (status && [400, 401, 403, 404, 422].includes(status)) {
                    // These admission responses explicitly rejected the write.
                    // Transport errors and conflicts retain the pending identity.
                    try {
                        await clearCloudAgentPendingSubmission(activeConversationId, skillScope);
                        pendingSubmission.current = null;
                    } catch (storageError) {
                        setMessages((current) => appendAgentError(current, `pending-storage-${activeConversationId}`, storageError, "canvasCloudAgent.submissionUpdateFailed"));
                    }
                }
            }
            setMessages((current) => appendAgentError(current, `submit-error-${activeConversationId}`, cause, agentSubmissionErrorTitle(cause, accepted)));
        } finally {
            submissionRequestRef.current = false;
            if (currentScope.current === scope) setBusy(false);
        }
    };

    const stop = async () => {
        const activeRun = run;
        if (!activeRun?.id || stopping) return;
        setStopping(true);
        try {
            await cancelAgentRun(activeRun.id);
            const snapshot = await getAgentRun(activeRun.id, AbortSignal.timeout(5_000));
            if (currentScope.current === conversationScope) {
                setRun((current) => (current?.id === activeRun.id ? snapshot.run : current));
                if (!snapshot.run.approval) setApproval(null);
                setConnectionEpoch((value) => value + 1);
            }
        } catch (cause) {
            if (currentScope.current === conversationScope) {
                // An ambiguous cancellation is not proof of a terminal run. Keep
                // the run and approval until the server confirms their state.
                setConnectionEpoch((value) => value + 1);
                setMessages((current) => appendAgentError(current, `cancel-${activeRun.id}`, cause, "canvasCloudAgent.cancelUnconfirmed"));
            }
        } finally {
            setStopping(false);
        }
    };

    useEffect(() => {
        if (
            !prefillRequest?.autoSubmit ||
            prefillRequest.canvasId !== canvasId ||
            activePrefillRef.current?.id !== prefillRequest.id ||
            activePrefillRef.current.scope !== conversationScope ||
            submittedPrefillRef.current === prefillRequest.id ||
            !open ||
            running ||
            busy ||
            legacyReadonly ||
            !historyHydrated ||
            !pendingHydrated ||
            profileLoading ||
            permissionMode === "read_only"
        )
            return;
        if (prefillRequest.requiresVision && !modelSupportsImageInspection(config, selectedModel)) return;
        if (prompt !== (prefillRequest.displayText || prefillRequest.text)) return;
        if (run && connectionStatus !== "connected") return;
        submittedPrefillRef.current = prefillRequest.id;
        void submit(prefillRequest.text);
    }, [canvasId, conversationScope, prefillRequest, open, running, busy, legacyReadonly, historyHydrated, pendingHydrated, profileLoading, profileView, profileError, permissionMode, config, selectedModel, prompt, run, connectionStatus, submit]);

    const submitApproval = async (decision: "approve" | "reject", mediaSettings?: AgentMediaSettings) => {
        if (!run || !approval || connectionStatus !== "connected" || approvalRequestRef.current === approval.approvalId) return;
        const runId = run.id;
        const approvalId = approval.approvalId;
        const scope = conversationScope;
        approvalRequestRef.current = approvalId;
        setApprovalSubmitting(true);
        try {
            const initialMedia = agentImageApproval(approval.detail);
            if (decision === "approve" && mediaSettings && initialMedia && !agentMediaSettingsEqual(initialMedia, mediaSettings)) {
                const quoted = await quoteAgentApproval(runId, approvalId, mediaSettings, AbortSignal.timeout(15_000));
                if (currentScope.current === scope && quoted.run.approval?.approvalId === approvalId) {
                    setRun(quoted.run);
                    setApproval((current) => (current?.approvalId === approvalId ? { approvalId, detail: quoted.run.approval as unknown as Record<string, unknown>, reason: current.reason } : current));
                }
                return;
            }
            if (decision === "approve") await saveRemoteUserDataNow();
            if (currentScope.current !== scope) return;
            const quoteHash = decision === "approve" ? agentApprovalPresentation(approval.detail).quoteHash : undefined;
            await decideAgentApproval(runId, approvalId, decision, approval.reason, AbortSignal.timeout(15_000), mediaSettings, quoteHash);
            if (currentScope.current === scope) {
                setApproval((current) => (current?.approvalId === approvalId ? null : current));
                setRun((current) =>
                    current?.id === runId && current.status === "waiting_approval" && (!current.approval || current.approval.approvalId === approvalId)
                        ? { ...current, status: decision === "reject" ? "rejected" : "running", approval: undefined }
                        : current,
                );
            }
        } catch (cause) {
            if (currentScope.current !== scope) return;
            // A timed-out response is ambiguous: query the durable decision before
            // asking the user to retry. The backend treats identical decisions idempotently.
            try {
                const snapshot = await getAgentRun(runId, AbortSignal.timeout(5_000));
                const decided = snapshot.run.events?.some(
                    (event) => event.type === "approval_decided" && event.payload.approvalId === approvalId && event.payload.decision === decision && (!mediaSettings || agentApprovalMatchesSettings(event.payload.arguments, mediaSettings)),
                );
                if (decided) {
                    setApproval((current) => (current?.approvalId === approvalId ? null : current));
                    setRun(snapshot.run);
                    return;
                }
                setRun(snapshot.run);
                if (snapshot.run.approval?.approvalId === approvalId) {
                    setApproval((current) => (current?.approvalId === approvalId ? { approvalId, detail: snapshot.run.approval as unknown as Record<string, unknown>, reason: current.reason } : current));
                }
            } catch {
                // Preserve the pending approval so the same decision can be retried.
            }
            setMessages((current) => appendAgentError(current, `approval-error-${Date.now()}`, cause, "canvasCloudAgent.approvalUnconfirmed"));
        } finally {
            if (approvalRequestRef.current === approvalId) approvalRequestRef.current = null;
            if (currentScope.current === scope) setApprovalSubmitting(false);
        }
    };

    const installSkill = async (skill: Skill) => {
        if (skill.isAdded) return;
        try {
            const result = await addSkill(skill.skillId);
            setSkills((current) => [...current.filter((item) => item.skillId !== skill.skillId), result.skill]);
            setMarketSkills((current) => current.map((item) => (item.skillId === skill.skillId ? result.skill : item)));
            setSelectedSkillIds((current) => (current.includes(skill.skillId) ? current : [...current, skill.skillId]));
        } catch (cause) {
            setMessages((current) => appendAgentError(current, `skill-error-${Date.now()}`, cause, "canvasCloudAgent.skillAddFailed"));
        }
    };

    const setModel = (model: string) => {
        setManualTextModel(model);
    };

    const newConversation = () => {
        const id = nanoid();
        currentScope.current = id;
        activePrefillRef.current = null;
        setPendingHydrated(true);
        setBusy(false);
        pendingSubmission.current = null;
        approvalRequestRef.current = null;
        setApprovalSubmitting(false);
        setActiveConversationId(id);
        setRun(null);
        setMessages([]);
        setPrompt("");
        setApproval(null);
        lastSeqRef.current = 0;
        setView("chat");
    };

    const openConversation = (conversation: CloudAgentConversation) => {
        currentScope.current = conversation.id;
        activePrefillRef.current = null;
        setPendingHydrated(false);
        setBusy(false);
        pendingSubmission.current = null;
        approvalRequestRef.current = null;
        setApprovalSubmitting(false);
        setActiveConversationId(conversation.id);
        setRun(conversation.run);
        setMessages(conversation.messages);
        setPermissionMode(conversation.permissionMode);
        setSelectedSkillIds(conversation.skillIds || []);
        setApproval(null);
        setPrompt("");
        if (conversation.model) setModel(conversation.model);
        setView("chat");
        void loadCloudAgentPendingSubmission(conversation.id, skillScope)
            .then((pending) => {
                if (currentScope.current === conversation.id) {
                    pendingSubmission.current = pending;
                    setPendingHydrated(true);
                    if (pending?.request) setPrompt(conversation.messages.find((item) => item.id === pending.messageId)?.text || pending.request.prompt);
                }
            })
            .catch((cause) => {
                if (currentScope.current === conversation.id) setMessages((current) => appendAgentError(current, `pending-${conversation.id}`, cause, "canvasCloudAgent.pendingLoadFailed"));
            });
    };
    const deleteConversation = (id: string) => {
        const next = conversations.filter((item) => item.id !== id);
        setConversations(next);
        if (id === activeConversationId) newConversation();
        void saveCloudAgentConversations(id === activeConversationId ? null : activeConversationId, next, legacySources.current, skillScope);
    };

    return (
        <>
            {!open && canvasId ? <AgentLauncher theme={theme} statusColor={statusColor} approvalPending={Boolean(approval)} activity={activity} reducedMotion={Boolean(reducedMotion)} onOpen={onOpen} /> : null}
            <AnimatePresence>
                {open ? (
                    <motion.aside
                        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.975 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
                        transition={{ duration: reducedMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
                        className="canvas-agent-panel fixed z-[var(--z-modal-overlay)] flex min-w-0 flex-col overflow-hidden"
                        style={{ ...panelLayout.style, ...({ "--agent-surface-base": theme.node.panel, "--agent-ink": theme.node.text, "--agent-accent": theme.accent.primary, "--agent-shadow-color": theme.spatial.shadow } as CSSProperties) }}
                        aria-label={t("canvasCloudAgent.panelAria")}
                        data-canvas-no-zoom
                        data-canvas-wheel-scroll
                        {...panelLayout.pointerHandlers}
                        onWheel={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                            // Esc 收起面板；斜杠技能菜单、@ 引用菜单和输入法组字已先处理 Esc（preventDefault），此处不抢。
                            if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing) return;
                            event.stopPropagation();
                            onCollapse();
                        }}
                    >
                        <div data-agent-resize="north" className="absolute inset-x-5 top-0 z-10 hidden h-2 cursor-n-resize touch-none sm:block" />
                        <div data-agent-resize="west" className="absolute bottom-5 left-0 top-5 z-10 hidden w-2 cursor-w-resize touch-none sm:block" />
                        <button
                            type="button"
                            aria-label={t("canvasCloudAgent.resizeAria")}
                            title={t("canvasCloudAgent.resizeTitle")}
                            data-agent-resize="northwest"
                            className="absolute left-0 top-0 z-10 hidden size-5 cursor-nw-resize touch-none opacity-50 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 sm:block"
                            onKeyDown={panelLayout.onResizeKeyDown}
                        >
                            <span className="absolute left-1.5 top-1.5 size-2 border-l-2 border-t-2 rounded-tl" style={{ borderColor: theme.node.muted }} />
                        </button>
                        <AnimatePresence mode="wait" initial={false}>
                            {view === "settings" ? (
                                <motion.div key="settings" className="flex min-h-0 flex-1" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
                                    <CanvasCloudAgentSettings
                                        theme={theme}
                                        config={config}
                                        selectedModel={selectedModel}
                                        permissionMode={permissionMode}
                                        contextScope={contextScope}
                                        nodeCount={nodeCount}
                                        installedSkills={installedSkills}
                                        marketSkills={marketSkills}
                                        selectedSkillIds={selectedSkillIds}
                                        skillSearch={skillSearch}
                                        skillsLoading={skillsLoading}
                                        skillHasMore={skillHasMore}
                                        maxCredits={maxCredits}
                                        maxGenerationTasks={maxGenerationTasks}
                                        maxVideoSeconds={maxVideoSeconds}
                                        onBack={() => setView("chat")}
                                        onModelChange={setModel}
                                        onPermissionChange={setPermissionMode}
                                        reasoningMode={reasoningMode}
                                        onReasoningModeChange={setReasoningMode}
                                        profileView={profileView}
                                        profileLoading={profileLoading}
                                        profileSaving={profileSaving}
                                        profileError={profileError}
                                        projectId={domainProjectId}
                                        canvasId={canvasId}
                                        onReloadProfile={reloadProfile}
                                        onSaveProfile={saveProfile}
                                        onContextToggle={(value) => setContextScope((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))}
                                        onSkillSearch={setSkillSearch}
                                        onSkillToggle={(id) => setSelectedSkillIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))}
                                        onSkillInstall={installSkill}
                                        onLoadMoreSkills={loadMoreSkills}
                                        onMaxCreditsChange={setMaxCredits}
                                        onMaxGenerationTasksChange={setMaxGenerationTasks}
                                        onMaxVideoSecondsChange={setMaxVideoSeconds}
                                    />
                                </motion.div>
                            ) : view === "history" ? (
                                <motion.div key="history" className="flex min-h-0 flex-1" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
                                    <AgentHistory conversations={conversations} activeConversationId={activeConversationId} theme={theme} onBack={() => setView("chat")} onNew={newConversation} onOpen={openConversation} onDelete={deleteConversation} />
                                </motion.div>
                            ) : (
                                <motion.div key="chat" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
                                    <AgentHeader
                                        activity={activity}
                                        canvasBound={Boolean(canvasId)}
                                        hasMessages={messages.some((item) => item.role === "user" || item.role === "assistant")}
                                        theme={theme}
                                        statusLabel={activity === "waiting" && !approval && status !== "waiting_approval" ? t("canvasExtra.mediaConv.waitingInput") : statusLabel}
                                        statusColor={statusColor}
                                        nodeCount={nodeCount}
                                        onNew={newConversation}
                                        onHistory={() => setView("history")}
                                        exporting={exporting}
                                        onExport={() => {
                                            if (exporting) return;
                                            setExporting(true);
                                            void (async () => {
                                                let snapshot = run;
                                                let snapshotError: string | undefined;
                                                if (run?.id) {
                                                    try {
                                                        snapshot = (await getAgentRun(run.id, AbortSignal.timeout(15_000))).run;
                                                    } catch (cause) {
                                                        snapshotError = cause instanceof Error ? cause.message : String(cause);
                                                    }
                                                }
                                                const text = buildAgentDebugExport({ canvasId, conversationId: activeConversationId, messages, run: snapshot, approval, model: selectedModel, permissionMode, snapshotError });
                                                saveAs(new Blob([text], { type: "application/json;charset=utf-8" }), `agent-debug-${activeConversationId}-${Date.now()}.json`);
                                            })()
                                                .catch((cause) => setMessages((current) => appendAgentError(current, `export-${Date.now()}`, cause, "canvasCloudAgent.exportFailed")))
                                                .finally(() => setExporting(false));
                                        }}
                                        onSettings={() => setView("settings")}
                                        onResetLayout={panelLayout.reset}
                                        onCollapse={onCollapse}
                                    />
                                    {run && connectionStatus !== "connected" ? (
                                        <div role="status" className="flex items-center justify-between gap-2 px-5 py-2 text-xs" style={{ color: theme.node.muted }}>
                                            <span>{connectionStatus === "disconnected" ? t("canvasCloudAgent.disconnectedNote") : t("canvasCloudAgent.connectingNote")}</span>
                                            {connectionStatus === "disconnected" ? (
                                                <Button size="small" onClick={() => setConnectionEpoch((value) => value + 1)}>
                                                    {t("canvasCloudAgent.reconnect")}
                                                </Button>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    <AgentConversation
                                        key={activeConversationId}
                                        theme={theme}
                                        messages={messages}
                                        onFocusNode={run?.canvasId === canvasId ? onFocusNode : undefined}
                                        references={[...references, ...buildSkillMentionReferences(installedSkills)]}
                                        busy={busy || run?.status === "running" || run?.status === "queued" || run?.status === "waiting_approval"}
                                        onRetry={
                                            !busy && !running && !legacyReadonly
                                                ? () => {
                                                      if ((pendingSubmission.current?.request || activePrefillRef.current) && prompt.trim()) {
                                                          void submit();
                                                          return;
                                                      }
                                                      const lastPrompt = messages.findLast((item) => item.role === "user")?.text;
                                                      if (lastPrompt) void submit(lastPrompt);
                                                  }
                                                : undefined
                                        }
                                        approval={approval}
                                        spentCredits={run?.spentCredits}
                                        nodeCount={nodeCount}
                                        showWelcome={historyHydrated && !run && !messages.some((item) => item.role === "user" || item.role === "assistant")}
                                        welcome={
                                            <AgentWelcome
                                                theme={theme}
                                                nodeCount={nodeCount}
                                                disabled={skillSelectionDisabled}
                                                onChooseSkill={() => setSkillsOpen(true)}
                                                onDraftPrompt={(draft) => setPrompt((current) => (current.trim() ? `${current}\n\n${draft}` : draft))}
                                            />
                                        }
                                        approvalSubmitting={approvalSubmitting || run?.canvasId !== canvasId || connectionStatus !== "connected"}
                                        onApprovalReasonChange={(reason) => setApproval((current) => (current ? { ...current, reason } : current))}
                                        onApprove={(settings) => void submitApproval("approve", settings)}
                                        onReject={() => void submitApproval("reject")}
                                    />
                                    {planVisible ? <AgentPlanBar items={planItems} theme={theme} minimized={planMinimized} onToggle={() => setPlanMinimized((value) => !value)} /> : null}
                                    {historyHydrated && !run && !messages.some((item) => item.role === "user" || item.role === "assistant") ? (
                                        <div className="agent-scene-tray">
                                            <AgentSceneCapsules
                                                buckets={sceneBuckets}
                                                installedIds={new Set(installedSkills.map((skill) => skill.skillId))}
                                                selectedIds={new Set(selectedSkillIds)}
                                                theme={theme}
                                                disabled={skillSelectionDisabled}
                                                onPick={(preset) => void applyRecommendedSkills(preset.presetId, agentPresetCopy(preset, t), preset.skillIds)}
                                                onPickSkill={(skill) => void applyRecommendedSkills(skill.skillId, skill.skillName, [skill.skillId], true)}
                                            />
                                            {recommendationError ? (
                                                <p role="alert" className="mt-2 text-xs">
                                                    {t(recommendationError)}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    {runningElsewhere && (
                                        <p role="status" className="m-0 px-5 py-2 text-xs" style={{ color: theme.node.muted }}>
                                            {t("canvasCloudAgent.turnOnOtherPage")}
                                        </p>
                                    )}
                                    {pendingQuestion ? (
                                        <AgentQuestionBar
                                            question={pendingQuestion}
                                            theme={theme}
                                            disabled={runningElsewhere || legacyReadonly || busy || approvalSubmitting || connectionStatus !== "connected"}
                                            onAnswer={(label) => {
                                                void (async () => {
                                                    if (pendingQuestion.recordDecision && onRecordDecision) await onRecordDecision(`agent-decision-${run?.id ?? activeConversationId}`, agentUpgradeText(locale, "decisionTitle"), label);
                                                    await submit(label);
                                                })().catch((cause) => setMessages((current) => appendAgentError(current, `decision-${Date.now()}`, cause, "canvasExtra.lifecycle.saveFailed")));
                                            }}
                                        />
                                    ) : null}
                                    <AgentChatComposer
                                        prompt={prompt}
                                        disabled={runningElsewhere || legacyReadonly || Boolean(run && connectionStatus !== "connected") || !historyHydrated || !pendingHydrated}
                                        sending={busy}
                                        running={running}
                                        placeholder={t("canvasCloudAgent.composerPlaceholder")}
                                        theme={theme}
                                        onPromptChange={(nextPrompt) => {
                                            if (!nextPrompt.trim()) activePrefillRef.current = null;
                                            setPrompt(nextPrompt);
                                        }}
                                        onSubmit={() => void submit()}
                                        onStop={run?.id && running ? stop : undefined}
                                        stopping={stopping}
                                        references={[...references, ...buildSkillMentionReferences(installedSkills)]}
                                        slashSkills={installedSkills}
                                        includeAssetLibrary={false}
                                        footer={
                                            connectorsVisible ? (
                                                <AgentConnectorsBar onClose={() => setConnectorsVisible(false)} />
                                            ) : (
                                                <button type="button" className="agent-connectors-restore" onClick={() => setConnectorsVisible(true)}>
                                                    {t("canvasAgentEntry.showConnectors")}
                                                </button>
                                            )
                                        }
                                        left={
                                            <ComposerControls
                                                reasoningMode={reasoningSupported ? reasoningMode : "off"}
                                                reasoningSupported={reasoningSupported}
                                                onReasoningModeChange={(value) => {
                                                    if (reasoningSupported) setReasoningMode(value);
                                                }}
                                                config={config}
                                                selectedModel={selectedModel}
                                                permissionMode={permissionMode}
                                                theme={theme}
                                                onModelChange={setModel}
                                                onPermissionChange={setPermissionMode}
                                                skillsOpen={skillsOpen}
                                                onSkillsOpenChange={setSkillsOpen}
                                                selectedSkillCount={selectedSkillIds.length}
                                            />
                                        }
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.aside>
                ) : null}
            </AnimatePresence>
            <CanvasAgentSkillLibraryModal
                open={skillsOpen}
                theme={theme}
                installedSkills={installedSkills}
                marketSkills={marketSkills}
                selectedSkillIds={selectedSkillIds}
                curation={curation}
                categories={skillCategories}
                category={skillTag}
                search={skillSearch}
                loading={skillsLoading}
                hasMore={skillHasMore}
                onClose={() => setSkillsOpen(false)}
                onCategoryChange={setSkillTag}
                onSearch={setSkillSearch}
                onToggle={(id) =>
                    setSelectedSkillIds((current) => {
                        if (current.includes(id)) return current.filter((item) => item !== id);
                        return [...current, id];
                    })
                }
                onInstall={installSkill}
                onLoadMore={loadMoreSkills}
            />
        </>
    );
}

function AgentHeader({
    activity,
    canvasBound,
    theme,
    hasMessages,
    statusLabel,
    statusColor,
    nodeCount,
    onNew,
    onHistory,
    onSettings,
    onCollapse,
    onExport,
    exporting,
    onResetLayout,
}: {
    theme: CanvasTheme;
    activity: DcActivity;
    canvasBound: boolean;
    hasMessages: boolean;
    statusLabel: string;
    statusColor: string;
    nodeCount: number;
    onNew: () => void;
    onHistory: () => void;
    onSettings: () => void;
    onCollapse: () => void;
    onExport: () => void;
    exporting: boolean;
    onResetLayout: () => void;
}) {
    const { t } = useI18n();
    return (
        <header data-agent-drag-handle className="agent-panel-header flex shrink-0 items-center gap-3">
            <DcMotion activity={activity} />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="agent-panel-title">
                        DC · {t("canvasExtra.agentLabel")}
                        {hasMessages ? "" : ` · ${t("canvasCloudAgent.newConversation")}`}
                    </span>
                    <span className="agent-panel-status flex items-center gap-1" style={{ color: statusColor }}>
                        <CircleDot className="size-3" />
                        {statusLabel}
                    </span>
                </div>
                {canvasBound && <div className="agent-panel-context">{t("canvasCloudAgent.currentCanvasNodes", { count: nodeCount })}</div>}
            </div>
            <div className="agent-header-actions flex items-center gap-0.5" style={{ color: theme.node.muted }}>
                <Button type="text" shape="circle" icon={<RotateCcw className="size-4" />} onClick={onResetLayout} aria-label={t("canvasAgentEntry.resetWindow")} title={t("canvasAgentEntry.resetWindow")} />
                <Button type="text" shape="circle" icon={<Download className="size-4" />} loading={exporting} onClick={onExport} aria-label={t("canvasCloudAgent.exportDebugAria")} title={t("canvasCloudAgent.exportDebugTitle")} />
                <Button type="text" shape="circle" icon={<MessageSquarePlus className="size-4" />} onClick={onNew} aria-label={t("canvasCloudAgent.newConversation")} title={t("canvasCloudAgent.newConversation")} />
                <Button type="text" shape="circle" icon={<History className="size-4" />} onClick={onHistory} aria-label={t("canvasCloudAgent.historyConversation")} title={t("canvasCloudAgent.historyConversation")} />
                <Button type="text" shape="circle" icon={<Settings2 className="size-4" />} onClick={onSettings} aria-label={t("canvasCloudAgent.agentSettings")} title={t("canvasCloudAgent.agentSettings")} />
                <Button type="text" shape="circle" icon={<Minus className="size-4" />} onClick={onCollapse} aria-label={t("canvasCloudAgent.collapseAgent")} title={t("canvasCloudAgent.collapse")} />
            </div>
        </header>
    );
}

function AgentHistory({
    conversations,
    activeConversationId,
    theme,
    onBack,
    onNew,
    onOpen,
    onDelete,
}: {
    conversations: CloudAgentConversation[];
    activeConversationId: string;
    theme: CanvasTheme;
    onBack: () => void;
    onNew: () => void;
    onOpen: (conversation: CloudAgentConversation) => void;
    onDelete: (id: string) => void;
}) {
    const { t, locale } = useI18n();
    const [search, setSearch] = useState("");
    const [filtered, setFiltered] = useState<{ source: CloudAgentConversation[]; matches: CloudAgentConversation[] }>();
    const sorted = useMemo(() => sortAgentHistory(conversations), [conversations]);
    useEffect(() => {
        if (!search.trim()) {
            setFiltered(undefined);
            return;
        }
        const controller = new AbortController();
        void filterAgentHistory(conversations, search, controller.signal).then((matches) => {
            if (matches && !controller.signal.aborted) setFiltered({ source: conversations, matches });
        });
        return () => controller.abort();
    }, [conversations, search]);
    const visible = search.trim() && filtered?.source === conversations ? filtered.matches : sorted;
    return (
        <div className="canvas-agent-history-root flex min-h-0 min-w-0 flex-1 flex-col">
            <header data-agent-drag-handle className="agent-panel-header flex shrink-0 items-center gap-2">
                <Button type="text" shape="circle" icon={<ArrowLeft className="size-4" />} onClick={onBack} aria-label={t("canvasCloudAgent.backToChat")} />
                <div className="min-w-0 flex-1">
                    <div className="agent-panel-title">{t("canvasCloudAgent.historyTitle")}</div>
                    <div className="agent-panel-context">{t("canvasCloudAgent.historyScope")}</div>
                </div>
                <Button type="text" shape="circle" icon={<MessageSquarePlus className="size-4" />} onClick={onNew} aria-label={t("canvasCloudAgent.newConversation")} title={t("canvasCloudAgent.newConversation")} />
            </header>
            <div className="shrink-0 px-3 pt-3" data-canvas-no-zoom>
                <Input.Search allowClear value={search} onChange={(event) => setSearch(event.target.value)} aria-label={t("common.search")} placeholder={t("common.search")} />
            </div>
            <div className="canvas-agent-history-scroll thin-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-3">
                {visible.length ? (
                    <div className="space-y-1">
                        {visible.map((conversation, index) => {
                            const preview = truncateConversationPreview(conversationSummary(conversation) || t("canvasCloudAgent.noMessageYet"));
                            const date = agentHistoryDate(conversation.updatedAt, locale);
                            const showDate = !index || date !== agentHistoryDate(visible[index - 1].updatedAt, locale);
                            const active = conversation.id === activeConversationId;
                            return (
                                <div key={conversation.id}>
                                    {showDate && <div className="px-3 py-2 text-xs opacity-60">{date}</div>}
                                    <div
                                        className="canvas-agent-history-item group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors"
                                        style={{ background: active ? theme.toolbar.itemHover : "transparent", color: theme.node.text }}
                                    >
                                        <button type="button" className="canvas-agent-history-open flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(conversation)} aria-current={active ? "page" : undefined}>
                                            <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: theme.node.fill, color: theme.node.muted }}>
                                                <Clock3 className="size-3.5" />
                                            </span>
                                            <span className="canvas-agent-history-text min-w-0 flex-1">
                                                <span className="canvas-agent-history-title block truncate text-[13px] font-medium">{conversation.title}</span>
                                                <span className="canvas-agent-history-preview mt-0.5 block text-[11px] opacity-40" title={preview}>
                                                    {preview}
                                                </span>
                                            </span>
                                            <span className="canvas-agent-history-time shrink-0 text-[10px] opacity-35">{formatConversationTime(conversation.updatedAt)}</span>
                                        </button>
                                        <Popconfirm title={t("canvasCloudAgent.deleteConversationAria", { title: conversation.title })} onConfirm={() => onDelete(conversation.id)} okText={t("common.delete")} cancelText={t("common.cancel")}>
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                className="canvas-agent-history-delete !h-7 !px-2 !text-xs !opacity-80"
                                                icon={<Trash2 className="size-3.5" />}
                                                aria-label={t("canvasCloudAgent.deleteConversationAria", { title: conversation.title })}
                                                title={t("canvasCloudAgent.deleteConversationTitle")}
                                            >
                                                {t("canvasCloudAgent.delete")}
                                            </Button>
                                        </Popconfirm>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                        <History className="size-5 opacity-30" />
                        <div className="mt-3 text-sm font-medium">{t("canvasCloudAgent.historyEmpty")}</div>
                        <div className="mt-1 text-xs opacity-40">{t("canvasCloudAgent.historyEmptyHint")}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function AgentConversation({
    theme,
    messages,
    references,
    busy,
    approval,
    spentCredits,
    approvalSubmitting,
    nodeCount,
    showWelcome,
    welcome,
    onFocusNode,
    onApprovalReasonChange,
    onApprove,
    onReject,
    onRetry,
}: {
    theme: CanvasTheme;
    messages: CloudAgentChatMessage[];
    references: CanvasResourceReference[];
    busy: boolean;
    approval: ApprovalState | null;
    spentCredits?: number;
    approvalSubmitting: boolean;
    nodeCount: number;
    showWelcome: boolean;
    welcome: React.ReactNode;
    onFocusNode?: (nodeId: string) => void;
    onApprovalReasonChange: (reason: string) => void;
    onApprove: (settings?: AgentMediaSettings) => void;
    onReject: () => void;
    onRetry?: () => void;
}) {
    const { t } = useI18n();
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const followRef = useRef(true);
    const lastUserId = messages.findLast((item) => item.role === "user")?.id;
    const [visibleCount, setVisibleCount] = useState(80);
    const batch = latestAgentMediaBatch(messages);
    const startIndex = Math.max(0, messages.length - visibleCount);
    const segments = useMemo(() => buildAgentFeedSegments(messages.slice(startIndex)), [messages, startIndex]);

    // 自己发送时恢复跟随；阅读旧消息时不让流式输出抢走滚动位置。
    useLayoutEffect(() => {
        followRef.current = true;
    }, [lastUserId]);
    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (element && followRef.current) element.scrollTop = element.scrollHeight;
    }, [messages, busy, approval]);
    useEffect(() => {
        const element = scrollRef.current;
        const content = contentRef.current;
        if (!element || !content) return;
        const observer = new ResizeObserver(() => {
            if (followRef.current) element.scrollTop = element.scrollHeight;
        });
        observer.observe(element);
        observer.observe(content);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={scrollRef}
            data-agent-conversation
            className="agent-conversation thin-scrollbar min-h-0 flex-1 overflow-y-auto"
            onScroll={(event) => {
                const element = event.currentTarget;
                followRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
            }}
        >
            {showWelcome ? welcome : null}
            <div ref={contentRef} className="agent-conversation-messages">
                {startIndex > 0 && (
                    <Button
                        size="small"
                        block
                        onClick={() => {
                            followRef.current = false;
                            setVisibleCount((count) => count + 80);
                        }}
                    >
                        {t("canvasExtra.agent.earlier")}
                    </Button>
                )}
                {segments.map((segment) =>
                    segment.kind === "operations" ? (
                        <AgentOperationFeed key={segment.key} items={segment.items} theme={theme} references={references} onFocusNode={onFocusNode} />
                    ) : (
                        <AgentChatMessage
                            key={segment.key}
                            item={segment.item}
                            theme={theme}
                            references={references}
                            onFocusNode={onFocusNode}
                            onRetry={segment.item.role === "error" && segment.item === messages.at(-1) ? onRetry : undefined}
                            retrying={segment.item.role === "error" && busy}
                            isStreaming={busy && !approval && segment.item.streaming === true && segment.item === messages.at(-1)}
                        />
                    ),
                )}
                {batch ? <AgentMediaBatchBar batch={batch} theme={theme} onFocusNode={onFocusNode} /> : null}
                {approval ? (
                    <ApprovalCard
                        key={approval.approvalId}
                        approval={approval}
                        spentCredits={spentCredits}
                        theme={theme}
                        submitting={approvalSubmitting}
                        onFocusNode={onFocusNode}
                        onReasonChange={onApprovalReasonChange}
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                ) : null}
                {busy && !approval ? <AgentWorkingMessage theme={theme} label={t("canvasCloudAgent.workingOnCanvas")} /> : null}
            </div>
        </div>
    );
}

function ComposerControls({
    reasoningMode,
    reasoningSupported,
    onReasoningModeChange,
    config,
    selectedModel,
    permissionMode,
    theme,
    onModelChange,
    onPermissionChange,
    skillsOpen,
    onSkillsOpenChange,
    selectedSkillCount,
}: {
    reasoningMode: AgentReasoningMode;
    reasoningSupported: boolean;
    onReasoningModeChange: (value: AgentReasoningMode) => void;
    config: ReturnType<typeof useEffectiveConfig>;
    selectedModel: string;
    permissionMode: AgentPermissionMode;
    theme: CanvasTheme;
    onModelChange: (model: string) => void;
    onPermissionChange: (mode: AgentPermissionMode) => void;
    skillsOpen: boolean;
    onSkillsOpenChange: (open: boolean) => void;
    selectedSkillCount: number;
}) {
    const permissionVisual = agentPermissionVisual(permissionMode);
    const { t } = useI18n();
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-0.5">
            <ModelPicker
                config={config}
                value={selectedModel}
                capability="text"
                onChange={onModelChange}
                variant="creation"
                className="!h-8 !min-w-0 !w-36 !max-w-full !border-0 !bg-transparent !px-1.5 !shadow-none"
                popoverClassName="agent-model-picker-popover"
                showSelectedPrice={false}
                showOptionPrices
                placeholder={t("canvasCloudAgent.selectTextModel")}
            />
            {reasoningSupported ? (
                <Dropdown trigger={["click"]} placement="topLeft" menu={{ items: reasoningMenuItems(t, reasoningMode, onReasoningModeChange) }}>
                    <button
                        type="button"
                        aria-label={t("canvasCloudAgent.reasoningAria")}
                        title={t("canvasCloudAgent.reasoningTitle")}
                        className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25"
                        style={{ color: reasoningMode === "off" ? theme.node.muted : theme.accent.primary, background: reasoningMode === "off" ? "transparent" : theme.node.fill }}
                    >
                        <Sparkles className="size-3.5" />
                        {reasoningModeLabel(t, reasoningMode)}
                    </button>
                </Dropdown>
            ) : null}
            <Dropdown trigger={["click"]} placement="topLeft" menu={{ items: agentPermissionMenuItems(t, permissionMode, onPermissionChange) }}>
                <button
                    type="button"
                    className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25"
                    style={{ color: theme.node.muted, background: "transparent" }}
                    aria-label={t("canvasCloudAgent.permissionAria")}
                >
                    <ShieldCheck className="size-3.5" style={{ color: permissionVisual.color }} />
                    <span className="max-w-20 truncate">{agentPermissionLabel(t, permissionMode)}</span>
                </button>
            </Dropdown>
            <button
                type="button"
                className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25"
                style={{ color: selectedSkillCount ? theme.accent.primary : theme.node.muted, background: skillsOpen ? theme.node.fill : "transparent" }}
                aria-label={t("canvasCloudAgent.skillsAria", { enabled: selectedSkillCount ? t("canvasCloudAgent.skillsAriaEnabled", { count: selectedSkillCount }) : "" })}
                aria-expanded={skillsOpen}
                aria-haspopup="dialog"
                title={t("canvasCloudAgent.skillsTitle")}
                onClick={() => onSkillsOpenChange(true)}
            >
                <Sparkles className="size-3.5" />
                <span className="max-w-28 truncate">{t("canvasCloudAgent.skillsLabel", { count: selectedSkillCount })}</span>
            </button>
        </div>
    );
}

type ReasoningLabelKeys = Record<AgentReasoningMode, MessageKey>;
const reasoningLabelKeys: ReasoningLabelKeys = { off: "canvasCloudAgent.reasoning.off", auto: "canvasCloudAgent.reasoning.auto", deep: "canvasCloudAgent.reasoning.deep" };
type ReasoningTranslateFn = (key: MessageKey) => string;

function reasoningModeLabel(t: ReasoningTranslateFn, mode: AgentReasoningMode) {
    return t(reasoningLabelKeys[mode]);
}

function reasoningMenuItems(t: ReasoningTranslateFn, mode: AgentReasoningMode, onChange: (value: AgentReasoningMode) => void) {
    return (Object.keys(reasoningLabelKeys) as AgentReasoningMode[]).map((value) => ({
        key: value,
        label: reasoningModeLabel(t, value),
        icon: value === mode ? <Check className="size-3.5" /> : undefined,
        onClick: () => onChange(value),
    }));
}

function ApprovalCard({
    approval,
    spentCredits,
    theme,
    submitting,
    onFocusNode,
    onReasonChange,
    onApprove,
    onReject,
}: {
    approval: ApprovalState;
    spentCredits?: number;
    theme: CanvasTheme;
    submitting: boolean;
    onFocusNode?: (nodeId: string) => void;
    onReasonChange: (value: string) => void;
    onApprove: (settings?: AgentMediaSettings) => void;
    onReject: () => void;
}) {
    const { t } = useI18n();
    const [showReason, setShowReason] = useState(Boolean(approval.reason));
    const [mediaSettings, setMediaSettings] = useState<AgentMediaSettings>();
    const imageApproval = agentImageApproval(approval.detail);
    const action = agentApprovalPresentation(approval.detail);
    const quoteNeedsRefresh = Boolean(imageApproval && mediaSettings && !agentMediaSettingsEqual(imageApproval, mediaSettings));
    return (
        <section className="canvas-agent-approval-card" aria-label={action.title}>
            <div className="canvas-agent-approval-header">
                <span className="canvas-agent-approval-icon" aria-hidden="true">
                    <ShieldCheck className="size-4" />
                </span>
                <h3>{action.title}</h3>
                <span className="canvas-agent-approval-badge">{t("canvasCloudAgent.approvalBadge")}</span>
            </div>
            <p className="canvas-agent-approval-description" style={{ color: theme.node.muted }}>
                {action.description}
            </p>
            {action.items.length ? (
                <div className="canvas-agent-approval-items" aria-label={t("canvasCloudAgent.approvalNodesAria")}>
                    {action.items.map((item, index) => (
                        <ApprovalPreviewItemView
                            key={`${item.operation}-${item.nodeId || item.nodeTitle || index}-${index}`}
                            item={imageApproval ? { ...item, details: item.details?.filter((detail) => !/^(模型|画幅|质量)[：:]/.test(detail)) } : item}
                            theme={theme}
                            onFocusNode={onFocusNode}
                            t={t}
                        />
                    ))}
                </div>
            ) : (
                <div className="canvas-agent-approval-empty" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgent.approvalEmpty")}
                </div>
            )}
            {imageApproval ? <CanvasAgentImageApprovalSettings initial={imageApproval} value={mediaSettings} onChange={setMediaSettings} theme={theme} disabled={submitting} /> : null}
            {typeof spentCredits === "number" && Number.isFinite(spentCredits) && spentCredits > 0 ? (
                <p className="canvas-agent-approval-quote" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgent.approval.spent", { credits: spentCredits.toLocaleString(undefined, { maximumFractionDigits: 2 }) })}
                </p>
            ) : null}
            {action.quote ? (
                <p className="canvas-agent-approval-quote" style={{ color: theme.node.text }}>
                    {action.quote.source === "platform" ? t("canvasCloudAgent.approval.quote", { credits: formatCredits(action.quote.amountMicrocredits) }) : t("canvasCloudAgent.approval.externalQuote")}
                    {quoteNeedsRefresh ? <span style={{ color: theme.node.muted }}> · {t("canvasCloudAgent.approval.quoteNeedsRefresh")}</span> : null}
                </p>
            ) : action.kind === "plan" ? (
                <p className="canvas-agent-approval-quote" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgent.approval.planPricingPending")}
                </p>
            ) : null}
            <button type="button" className="canvas-agent-approval-reason-toggle" aria-expanded={showReason} onClick={() => setShowReason((value) => !value)} disabled={submitting}>
                {showReason ? t("canvasCloudAgent.approval.reasonToggleCollapse") : t("canvasCloudAgent.approval.reasonToggleFill")}
            </button>
            {showReason ? (
                <Input.TextArea
                    className="canvas-agent-approval-reason"
                    value={approval.reason}
                    onChange={(event) => onReasonChange(event.target.value)}
                    placeholder={t("canvasCloudAgent.approval.reasonPlaceholder")}
                    autoSize={{ minRows: 2, maxRows: 3 }}
                    maxLength={2000}
                    disabled={submitting}
                />
            ) : null}
            <div className="canvas-agent-approval-actions">
                <button type="button" className="canvas-agent-approval-reject" disabled={submitting} onClick={onReject}>
                    {t("canvasCloudAgent.approval.reject")}
                </button>
                <button type="button" className="canvas-agent-approval-approve" disabled={submitting} onClick={() => onApprove(mediaSettings)}>
                    {submitting ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                    {submitting ? t("canvasCloudAgent.approval.submitting") : quoteNeedsRefresh ? t("canvasCloudAgent.approval.updateQuote") : t("canvasCloudAgent.approval.approve")}
                </button>
            </div>
        </section>
    );
}

function ApprovalPreviewItemView({ item, theme, onFocusNode, t }: { item: ReturnType<typeof agentApprovalPresentation>["items"][number]; theme: CanvasTheme; onFocusNode?: (nodeId: string) => void; t: (key: MessageKey) => string }) {
    const operationLabel =
        item.operation === "director_scene_create"
            ? t("previs.createScene")
            : item.operation === "director_apply_patch"
              ? t("previs.editScene")
              : t(`canvasCloudAgent.approval.op.${item.operation === "generate_media" ? "generate" : item.operation}` as MessageKey);
    const renderNode = (title: string | undefined, id: string | undefined, typeLabel: string | undefined, role: "source" | "target" | "node") => {
        if (!title) return null;
        const content = (
            <>
                <span className="canvas-agent-approval-node-title">{title}</span>
                {typeLabel ? <span className="canvas-agent-approval-node-type">{typeLabel}</span> : null}
            </>
        );
        return id && onFocusNode ? (
            <button type="button" className="canvas-agent-approval-node canvas-agent-approval-node-button" onClick={() => onFocusNode(id)} title={t("canvasCloudAgent.approval.locateNode")}>
                {content}
            </button>
        ) : (
            <span className={`canvas-agent-approval-node canvas-agent-approval-node-${role}`}>{content}</span>
        );
    };
    return (
        <article className="canvas-agent-approval-item">
            <div className="canvas-agent-approval-item-main">
                <span className={`canvas-agent-approval-operation canvas-agent-approval-operation-${item.operation}`}>{operationLabel}</span>
                {item.operation === "connect_nodes" ? (
                    <div className="canvas-agent-approval-connection">
                        {renderNode(item.nodeTitle, item.nodeId, item.nodeTypeLabel, "source")}
                        <span className="canvas-agent-approval-arrow" aria-hidden="true">
                            →
                        </span>
                        {renderNode(item.targetNodeTitle, item.targetNodeId, undefined, "target")}
                    </div>
                ) : (
                    <div className="canvas-agent-approval-node-summary">
                        {renderNode(item.nodeTitle, item.nodeId, item.nodeTypeLabel, "node")}
                        {item.resultTitle ? (
                            <>
                                <span className="canvas-agent-approval-change-arrow" aria-hidden="true">
                                    {t("canvasCloudAgent.approval.changeTo")}
                                </span>
                                <span className="canvas-agent-approval-result-title">《{item.resultTitle}》</span>
                            </>
                        ) : null}
                    </div>
                )}
            </div>
            {item.fields?.length ? (
                <div className="canvas-agent-approval-field-list">
                    {t("canvasCloudAgent.approval.fieldsPrefix")}
                    {item.fields.map((field) => (
                        <span key={field}>{field}</span>
                    ))}
                </div>
            ) : null}
            {item.details?.length ? (
                <div className="canvas-agent-approval-detail-list">
                    {item.details.map((detail) => (
                        <span key={detail}>{detail}</span>
                    ))}
                </div>
            ) : null}
            <div className="canvas-agent-approval-summary">{item.summary}</div>
        </article>
    );
}

function positiveNumber(value: string) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : undefined;
}
function truncateConversationPreview(value: string, max = 96) {
    const compact = markdownPlainText(value);
    return compact.length > max ? `${compact.slice(0, max)}…` : compact || agentToolText("canvasCloudAgent.noMessageYet");
}

function formatConversationTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    return date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}
export function applyAgentEvent(
    event: AgentEvent,
    setMessages: Dispatch<SetStateAction<CloudAgentChatMessage[]>>,
    setRun: Dispatch<SetStateAction<AgentRun | null>>,
    setApproval: Dispatch<SetStateAction<ApprovalState | null>>,
    setPrompt?: Dispatch<SetStateAction<string>>,
) {
    const payload = event.payload || {};
    const text = String(payload.text || payload.summary || payload.message || "");
    if (event.type === "tool_completed" && (payload.toolName === "director_preview" || payload.toolName === "previs_preview") && Date.now() - Date.parse(event.createdAt) < 30_000) {
        const result = payload.result as Record<string, unknown> | undefined;
        if (result?.execution === "browser_director_viewport" || result?.execution === "browser_previs_viewport")
            dispatchDirectorPreview({
                canvasId: String(result.canvasId || ""),
                sceneId: String(result.sceneId || ""),
                shotId: String(result.shotId || ""),
                previewRequestId: String(result.previewRequestId || payload.callId || ""),
                duration: Number(result.duration),
                fps: Number(result.fps),
            });
    }
    if (event.type === "run_status") {
        const snapshotApproval = payload.approval && typeof payload.approval === "object" ? (payload.approval as AgentRun["approval"]) : undefined;
        setRun((current) =>
            current
                ? {
                      ...current,
                      status: String(payload.status || current.status) as AgentRun["status"],
                      updatedAt: event.createdAt,
                      revision: Number(payload.revision || 0),
                      cleanupPending: Boolean(payload.cleanupPending),
                      failureMessage: String(payload.failureMessage || ""),
                      failureDetail: payload.failureDetail as AgentRun["failureDetail"],
                      skills: payload.skills as AgentRun["skills"],
                      spentCredits: Number(payload.spentCredits || 0),
                      step: Number(payload.step || 0),
                      approval: snapshotApproval,
                  }
                : current,
        );
        if (payload.status === "failed") setMessages((current) => upsertAgentRunFailure(current, event, String(payload.failureMessage || ""), payload.failureDetail));
        if (snapshotApproval && !snapshotApproval.decision && snapshotApproval.approvalId) {
            setApproval((current) => ({ approvalId: snapshotApproval.approvalId, detail: snapshotApproval, reason: current?.approvalId === snapshotApproval.approvalId ? current.reason : snapshotApproval.reason || "" }));
        } else {
            setApproval(null);
        }
        return;
    }
    if (event.type === "approval_decided") {
        setApproval(null);
        if (payload.decision === "reject") {
            setMessages((current) =>
                appendUniqueMessage(current, {
                    id: event.eventId,
                    role: "system",
                    text: text || agentToolText("canvasCloudAgent.approval.rejectedNote"),
                }),
            );
        }
        return;
    }
    if (event.type === "progress_summary") {
        setMessages((current) => appendUniqueMessage(current, { id: event.eventId, role: "system", text: text || agentToolText("canvasCloudAgent.event.planning") }));
        return;
    }
    if (event.type === "assistant_delta") {
        setMessages((current) => upsertTextMessage(current, String(payload.messageId || "assistant"), text, true));
        return;
    }
    if (event.type === "reasoning_delta" || event.type === "reasoning_message") {
        const id = String(payload.messageId || `${event.runId}:reasoning`);
        setMessages((current) => upsertTextMessage(current, id, text, event.type === "reasoning_delta").map((item) => (item.id === id ? { ...item, reasoning: true } : item)));
        return;
    }
    if (event.type === "media_batch_progress") {
        const id = `batch-${event.runId}-${String(payload.batchId || "")}`;
        setMessages((current) => {
            const previous = current.find((item) => item.id === id);
            const mediaBatch = mergeAgentMediaBatchProgress(previous?.mediaBatch, payload);
            if (!mediaBatch) return current;
            const message: CloudAgentChatMessage = { id, role: "assistant", text: "", mediaBatch };
            return previous ? current.map((item) => (item.id === id ? message : item)) : [...current, message];
        });
        return;
    }
    if (event.type === "plan_updated" && Array.isArray(payload.items)) {
        const id = `plan-${event.runId}`;
        const planItems = payload.items as CloudAgentPlanItem[];
        setMessages((current) => {
            const index = current.findIndex((entry) => entry.id === id);
            const message: CloudAgentChatMessage = { id, role: "tool", text: "", planItems };
            if (index < 0) return [...current, message];
            const next = [...current];
            next[index] = message;
            return next;
        });
        return;
    }
    if (event.type === "user_interjection") {
        if (!text) return;
        setMessages((current) => appendUniqueMessage(current, { id: String(payload.messageId || event.eventId), role: "user", text, interjection: "sent" }));
        return;
    }
    if (event.type === "user_interjection_dropped") {
        const messageId = String(payload.messageId || event.eventId);
        setMessages((current) => {
            const marked = current.map((item) => (item.id === messageId ? { ...item, interjection: "undelivered" as const } : item));
            return appendUniqueMessage(marked, { id: `interjection-dropped-${messageId}`, role: "system", text: agentToolText("cloudAgent.p0ThisInterjectionDidNotReachTheModel", { p0: agentToolText("cloudAgent.thisTurnHasEnded") }) });
        });
        setPrompt?.((current) => (current.trim() ? current : text));
        return;
    }
    if (event.type === "user_question") {
        const options = Array.isArray(payload.options)
            ? (payload.options as Array<{ label?: unknown; detail?: unknown }>).map((option) => ({ label: String(option?.label || "").trim(), detail: option?.detail === undefined ? undefined : String(option.detail) })).filter((option) => option.label)
            : [];
        const question = String(payload.question || "").trim();
        const fields = Array.isArray(payload.fields) ? (payload.fields as AgentQuestionField[]).filter((field) => field && typeof field.id === "string" && typeof field.title === "string").slice(0, 16) : [];
        if (!question || (options.length < 2 && !fields.length)) return;
        const id = `question-${event.runId}:${event.seq ?? event.eventId}`;
        setMessages((current) => appendUniqueMessage(current, { id, role: "assistant", text: "", question: { question, options, fields, recordDecision: payload.recordDecision === true, allowFreeform: payload.allowFreeform !== false } }));
        return;
    }
    if (event.type === "assistant_message") {
        setMessages((current) => upsertTextMessage(current, String(payload.messageId || event.eventId), text, false));
        return;
    }
    if (event.type === "assistant_snapshot") {
        setMessages((current) => upsertTextMessage(current, String(payload.messageId || event.eventId), text, false));
        return;
    }
    if (event.type === "approval_requested") {
        const approvalId = String(payload.approvalId || "");
        setApproval((current) => ({ approvalId, detail: payload, reason: current?.approvalId === approvalId ? current.reason : "" }));
        return;
    }
    if (event.type === "canvas_updated" && Array.isArray(payload.actions)) {
        if (payload.operation === "generate_media_submit" || payload.operation === "generate_media_complete") return;
        const { canvasPatch: _patch, ...detail } = payload;
        const id = payload.callId ? `canvas-${event.runId}-${payload.callId}` : event.eventId;
        setMessages((current) => appendUniqueMessage(current, { id, role: "tool", title: "canvas_apply_ops", text: text || agentToolText("canvasCloudAgent.event.canvasOpsDone"), detail: { ...detail, eventType: event.type } }));
        return;
    }
    if (event.type === "tool_completed" && payload.toolName === "canvas_apply_ops" && payload.callId) {
        const id = `canvas-${event.runId}-${payload.callId}`;
        setMessages((current) => appendUniqueMessage(current, { id, role: "tool", title: "canvas_apply_ops", text: text || agentToolText("canvasCloudAgent.event.canvasOpsDone"), detail: { ...payload, eventType: event.type } }));
        return;
    }
    if (event.type === "generation_task_created") {
        const message: CloudAgentChatMessage = { id: event.eventId, role: "tool", title: "generate_media", text: text || event.type, detail: { ...payload, eventType: event.type } };
        setMessages((current) => upsertMediaToolTrace(current, message));
        return;
    }
    if (event.type.startsWith("tool_")) {
        if (isHiddenAgentToolStep(String(payload.toolName || ""), text, { ...payload, eventType: event.type })) return;
        const message: CloudAgentChatMessage = {
            id: event.eventId,
            role: "tool",
            title: String(payload.toolName || payload.title || agentToolText("canvasCloudAgent.event.toolExecution")),
            text: text || event.type,
            detail: { ...payload, eventType: event.type },
        };
        if (payload.toolName === "generate_media") {
            setMessages((current) => upsertMediaToolTrace(current, message));
        } else {
            setMessages((current) => appendUniqueMessage(current, message));
        }
        return;
    }
    if (event.type === "run_failed" || event.type === "error") {
        setMessages((current) => upsertAgentRunFailure(current, event, text, payload));
        setRun((current) => (current ? { ...current, status: "failed", failureMessage: text, failureDetail: payload, approval: undefined } : current));
        setApproval(null);
    }
}
function toolDetailRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toolDetailNodeIds(detail: unknown): Set<string> {
    const payload = toolDetailRecord(detail);
    const ids = new Set<string>();
    for (const value of [payload.nodeId, toolDetailRecord(payload.result).nodeId]) {
        if (typeof value === "string" && value) ids.add(value);
    }
    if (Array.isArray(payload.actions)) {
        for (const action of payload.actions) {
            const nodeId = toolDetailRecord(action).nodeId;
            if (typeof nodeId === "string" && nodeId) ids.add(nodeId);
        }
    }
    if (typeof payload.arguments === "string") {
        try {
            const args = toolDetailRecord(JSON.parse(payload.arguments));
            if (Array.isArray(args.ops)) {
                for (const op of args.ops) {
                    const nodeId = toolDetailRecord(op).id;
                    if (typeof nodeId === "string" && nodeId) ids.add(nodeId);
                }
            }
        } catch {
            // Tool arguments are diagnostic data; a malformed value must not break the event feed.
        }
    }
    return ids;
}

function toolDetailTaskIds(detail: unknown): Set<string> {
    const payload = toolDetailRecord(detail);
    const ids = new Set<string>();
    for (const value of [payload.taskId, toolDetailRecord(payload.result).taskId]) {
        if (typeof value === "string" && value) ids.add(value);
    }
    return ids;
}

function mergeToolDetails(previous: unknown, next: unknown): Record<string, unknown> {
    const previousDetail = toolDetailRecord(previous);
    const nextDetail = toolDetailRecord(next);
    return {
        ...previousDetail,
        ...nextDetail,
        actions: Array.isArray(nextDetail.actions) ? nextDetail.actions : previousDetail.actions,
        arguments: nextDetail.arguments || previousDetail.arguments,
    };
}

function upsertMediaToolTrace(current: CloudAgentChatMessage[], message: CloudAgentChatMessage): CloudAgentChatMessage[] {
    const nextNodeIds = toolDetailNodeIds(message.detail);
    const nextTaskIds = toolDetailTaskIds(message.detail);
    const index = current.findIndex((item) => {
        if (item.role !== "tool") return false;
        const itemToolName = item.title || "";
        if (itemToolName !== "canvas_apply_ops" && itemToolName !== "generate_media") return false;
        const itemNodeIds = toolDetailNodeIds(item.detail);
        const itemTaskIds = toolDetailTaskIds(item.detail);
        return [...nextNodeIds].some((id) => itemNodeIds.has(id)) || [...nextTaskIds].some((id) => itemTaskIds.has(id));
    });
    if (index < 0) return appendUniqueMessage(current, message);
    const next = [...current];
    const previous = next[index];
    next[index] = {
        ...previous,
        ...message,
        id: previous.id,
        detail: mergeToolDetails(previous.detail, message.detail),
    };
    return next;
}

function appendUniqueMessage(current: CloudAgentChatMessage[], message: CloudAgentChatMessage) {
    return current.some((item) => item.id === message.id) ? current : [...current, message];
}
function upsertTextMessage(current: CloudAgentChatMessage[], id: string, text: string, append: boolean): CloudAgentChatMessage[] {
    const index = current.findIndex((item) => item.id === id);
    if (index < 0) return [...current, { id, role: "assistant" as const, text, streaming: append }];
    if (!append && current[index].text === text && !current[index].streaming) return current;
    const next = [...current];
    next[index] = { ...next[index], text: append ? `${next[index].text}${text}` : text, streaming: append };
    return next;
}

function appendAgentError(current: CloudAgentChatMessage[], id: string, cause: unknown, fallback?: string) {
    const message = agentErrorPresentation(cause, fallback);
    const last = current.at(-1);
    if (last?.role === "error" && last.title === message.title && last.text === message.text) return current;
    return appendUniqueMessage(current, { id, role: "error", ...message });
}
