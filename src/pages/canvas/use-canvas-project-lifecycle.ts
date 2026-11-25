import { markAgentCanvasEntrance } from "@/lib/canvas/agent-canvas-entrance";
import { mergeAgentCanvasEditor } from "@/lib/canvas/agent-canvas-patch";
import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { App } from "antd";
import { useShallow } from "zustand/react/shallow";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { useNavigate } from "react-router";

import { canvasAppearanceBaseTheme, canvasAppearanceForTheme, DEFAULT_CANVAS_BACKGROUND_MODE, normalizeCanvasAppearance, type CanvasAppearance } from "@/lib/canvas/canvas-appearance";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import { removeCanvasDrawing } from "@/lib/canvas/canvas-drawing-storage";
import { normalizeCanvasNodeTimestamps } from "@/lib/canvas/canvas-node-timestamps";
import { hydrateAssistantImages, resetInterruptedGeneration } from "@/lib/canvas/canvas-project-generation";
import { listAddedSkills, type Skill } from "@/services/api/skills";
import { checkpointCanvasOnPageHide, deleteCanvasProjectsWithRemoteSync, loadCanvasProjectForEditing, localSavedRemotePendingMessage, saveRemoteUserDataNow, subscribeAgentCanvasRefresh, openOrCreateBlankCanvas } from "@/services/user-data-sync";
import { flushCanvasTextEdits } from "@/services/canvas-text-edits";
import { getActiveUserScope } from "@/lib/user-scope";
import { flushCanvasStorePersistence, useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useCanvasThemeStore } from "@/stores/canvas/use-canvas-theme-store";
import { useSyncProgressStore } from "@/stores/use-sync-progress-store";
import { readCanvasSyncDrafts } from "@/services/canvas-sync-drafts";
import { useUserStore } from "@/stores/use-user-store";
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData, ViewportTransform } from "@/types/canvas";
import type { CanvasHistorySnapshot } from "./use-canvas-history";
import { canvasEditorOwnsProject, resolveCanvasEditorPersistPatch, sameCanvasHistorySnapshot } from "./canvas-editor-ownership";
import { canvasTitleSource, firstCanvasTitleCandidate, heuristicCanvasTitle, isDefaultCanvasTitle, isCanvasTitleContentCandidate } from "@/lib/canvas/canvas-auto-title";
import { generateCanvasTitle } from "@/services/api/canvas-title";

type UseCanvasProjectLifecycleOptions = {
    flushTextEdits: () => Promise<void>;
    projectId: string;
    projectLoaded: boolean;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    canvasAppearance: CanvasAppearance;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    viewport: ViewportTransform;
    nodesRef: MutableRefObject<CanvasNodeData[]>;
    connectionsRef: MutableRefObject<CanvasConnection[]>;
    chatSessionsRef: MutableRefObject<CanvasAssistantSession[]>;
    activeChatIdRef: MutableRefObject<string | null>;
    viewportRef: MutableRefObject<ViewportTransform>;
    historyPausedRef: MutableRefObject<boolean>;
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setChatSessions: Dispatch<SetStateAction<CanvasAssistantSession[]>>;
    setActiveChatId: Dispatch<SetStateAction<string | null>>;
    setCanvasAppearance: Dispatch<SetStateAction<CanvasAppearance>>;
    setBackgroundMode: Dispatch<SetStateAction<CanvasBackgroundMode>>;
    setShowImageInfo: Dispatch<SetStateAction<boolean>>;
    setViewport: Dispatch<SetStateAction<ViewportTransform>>;
    setProjectLoaded: Dispatch<SetStateAction<boolean>>;
    resetHistory: (snapshot: CanvasHistorySnapshot) => void;
    cleanupAssetImages: (options?: unknown) => void;
    cleanupCanvasFiles: (extra?: unknown) => void;
};

export function useCanvasProjectLifecycle({
    flushTextEdits,
    projectId,
    projectLoaded,
    nodes,
    connections,
    chatSessions,
    activeChatId,
    canvasAppearance,
    backgroundMode,
    showImageInfo,
    viewport,
    nodesRef,
    connectionsRef,
    chatSessionsRef,
    activeChatIdRef,
    viewportRef,
    historyPausedRef,
    setNodes,
    setConnections,
    setChatSessions,
    setActiveChatId,
    setCanvasAppearance,
    setBackgroundMode,
    setShowImageInfo,
    setViewport,
    setProjectLoaded,
    resetHistory,
    cleanupAssetImages,
    cleanupCanvasFiles,
}: UseCanvasProjectLifecycleOptions) {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const hydrated = useCanvasStore((state) => state.hydrated);
    const sessionHydrated = useUserStore((state) => state.hydrated);
    const openProject = useCanvasStore((state) => state.openProject);
    const updateProject = useCanvasStore((state) => state.updateProject);
    const renameProject = useCanvasStore((state) => state.renameProject);
    // The editor owns nodes/connections. Persisting each keystroke must not echo
    // that same snapshot back through a second subscription to the whole project.
    const currentProject = useCanvasStore(useShallow((state) => {
        const project = state.projects.find((project) => project.id === projectId);
        if (!project) return undefined;
        const { id, title, titleSource, importSource, projectId: domainProjectId, starterMode, directorScenes, timeline } = project;
        return { id, title, titleSource, importSource, projectId: domainProjectId, starterMode, directorScenes, timeline };
    }));
    const [addedSkills, setAddedSkills] = useState<Skill[]>([]);
    const [loadError, setLoadError] = useState("");
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [agentCreatedNodes, setAgentCreatedNodes] = useState<{ projectId: string; nodes: CanvasNodeData[] } | null>(null);
    const viewportSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleGenerationRef = useRef(new Set<string>());

    const observedContentRef = useRef<CanvasHistorySnapshot | null>(null);
    const loadLatestRef = useRef(false);
    const historyRestoreRef = useRef<{ snapshotId: string; revision: number; resolve: () => void; reject: (error: unknown) => void } | null>(null);
    const pendingReloadRef = useRef<{ resolve: () => void; reject: (error: unknown) => void } | null>(null);
    const editorReadyRef = useRef(false);
    const creatingProjectFromIdRef = useRef("");
    // 编辑器 React 状态属于哪个画布。state 与 setNodes 等同批提交，保证 effect 看到的
    // nodes/connections 与归属一致；ref 供定时器和命令式保存在触发时校验。
    const [editorProjectId, setEditorProjectId] = useState<string | null>(null);
    const editorProjectIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!hydrated || !sessionHydrated) return;
        let cancelled = false;
        // Keep load intent on the refs until this attempt finishes. React Strict
        // Mode remounts the effect; consuming the flags here would turn "load
        // latest" into a normal open and immediately recreate the conflict.
        const latest = loadLatestRef.current;
        const historyRestore = historyRestoreRef.current;
        const pendingReload = pendingReloadRef.current;
        const keepEditor = editorReadyRef.current && (latest || Boolean(historyRestore));
        let appliedProject: CanvasProject | null = null;
        if (!keepEditor) {
            editorReadyRef.current = false;
            setProjectLoaded(false);
            setLoadError("");
            observedContentRef.current = null;
            editorProjectIdRef.current = null;
            setEditorProjectId(null);
        }
        const applyRestoredProject = (targetProject: CanvasProject) => {
            if (cancelled || targetProject === appliedProject) return;
            appliedProject = targetProject;
            const fallbackTheme = useCanvasThemeStore.getState().theme;
            const restoredAppearance = targetProject.appearance
                ? normalizeCanvasAppearance(targetProject.appearance, fallbackTheme)
                : canvasAppearanceForTheme(fallbackTheme);
            const initialNodes = normalizeCanvasNodeTimestamps(resetInterruptedGeneration(targetProject.nodes), {
                createdAt: targetProject.createdAt,
                updatedAt: targetProject.updatedAt,
            });
            const snapshot: CanvasHistorySnapshot = {
                nodes: initialNodes,
                connections: targetProject.connections,
                chatSessions: targetProject.chatSessions || [],
                activeChatId: targetProject.activeChatId || null,
                canvasAppearance: restoredAppearance,
                backgroundMode: targetProject.backgroundMode || DEFAULT_CANVAS_BACKGROUND_MODE,
                showImageInfo: targetProject.showImageInfo || false,
            };
            observedContentRef.current = snapshot;
            chatSessionsRef.current = snapshot.chatSessions;
            activeChatIdRef.current = snapshot.activeChatId;
            nodesRef.current = snapshot.nodes;
            connectionsRef.current = snapshot.connections;
            viewportRef.current = targetProject.viewport;
            setNodes(snapshot.nodes);
            setConnections(snapshot.connections);
            setChatSessions(snapshot.chatSessions);
            setActiveChatId(snapshot.activeChatId);
            setCanvasAppearance(snapshot.canvasAppearance);
            useCanvasThemeStore.getState().setTheme(canvasAppearanceBaseTheme(snapshot.canvasAppearance, fallbackTheme));
            setBackgroundMode(snapshot.backgroundMode);
            setShowImageInfo(snapshot.showImageInfo);
            setViewport(targetProject.viewport);
            resetHistory(snapshot);
            editorProjectIdRef.current = targetProject.id;
            setEditorProjectId(targetProject.id);
            editorReadyRef.current = true;
            setProjectLoaded(true);
        };

        const load = async () => {
            const cachedProject = useCanvasStore.getState().projects.find((p) => p.id === projectId);
            if (!latest && !historyRestore && cachedProject) {
                // 本地已有该画布的持久化缓存（包括空白新画布）：先以本地数据渲染。
                applyRestoredProject(cachedProject);
            }
            const loadedProject = await loadCanvasProjectForEditing(projectId, { latest, historyRestore: historyRestore || undefined, onLoad: applyRestoredProject });
            if (cancelled) return;
            if (historyRestoreRef.current === historyRestore) {
                historyRestoreRef.current = null;
                historyRestore?.resolve();
            }
            if (!loadedProject) {
                if (!cachedProject) navigate("/canvas", { replace: true });
                return;
            }
            const project = useCanvasStore.getState().projects.find((p) => p.id === projectId) || loadedProject;

            // 画布媒体由节点自己的视口观察器按需加载；打开时遍历并解析全部节点会让大画布形成 N+1 资源读取。
            void hydrateAssistantImages(project.chatSessions || [])
                .then((hydratedSessions) => {
                    if (!cancelled) setChatSessions((current) => {
                        const merged = mergeHydratedSessions(current, hydratedSessions);
                        if (observedContentRef.current?.chatSessions === current) observedContentRef.current = { ...observedContentRef.current, chatSessions: merged };
                        return merged;
                    });
                })
                .catch(() => {
                    if (!cancelled) message.warning(currentLocaleText("canvasExtra.lifecycle.assistantRestoreFailed"));
                });
        };
        void load()
            .then(() => {
                if (cancelled) return;
                loadLatestRef.current = false;
                if (pendingReloadRef.current === pendingReload) {
                    pendingReloadRef.current = null;
                    pendingReload?.resolve();
                }
            })
            .catch((error) => {
                if (cancelled) return;
                loadLatestRef.current = false;
                if (historyRestoreRef.current === historyRestore) {
                    historyRestoreRef.current = null;
                    historyRestore?.reject(error);
                }
                if (pendingReloadRef.current === pendingReload) {
                    pendingReloadRef.current = null;
                    pendingReload?.reject(error);
                }
                if (useSyncProgressStore.getState().syncingProjects[projectId]?.phase !== "conflict") useSyncProgressStore.getState().setProjectProgress(projectId, { phase: "error", message: error instanceof Error ? error.message : currentLocaleText("canvasExtra.cloudSync.cloudReadFailed") });
                const detail = error instanceof Error ? error.message : currentLocaleText("canvasExtra.lifecycle.loadFailed");
                if (keepEditor) message.error(detail);
                else setLoadError(detail);
            });
        return () => {
            cancelled = true;
        };
    }, [hydrated, sessionHydrated, loadAttempt, message, navigate, openProject, projectId, resetHistory, setActiveChatId, setBackgroundMode, setCanvasAppearance, setChatSessions, setConnections, setNodes, setShowImageInfo, setViewport]);

    useEffect(() => {
        if (!projectLoaded) return;
        let cancelled = false;
        listAddedSkills()
            .then(({ skills }) => {
                if (!cancelled) setAddedSkills(skills);
            })
            .catch(() => {
                if (!cancelled) setAddedSkills([]);
            });
        return () => {
            cancelled = true;
        };
    }, [projectLoaded]);

    useEffect(() => subscribeAgentCanvasRefresh((project, previous, options) => {
        if (!projectLoaded || project.id !== projectId) return;
        // Merge only server-changed fields so dragging/editing other nodes can
        // continue while Agent media tasks complete. Same-field conflicts fail.
        const merged = previous ? mergeAgentCanvasEditor(previous, project, nodesRef.current, connectionsRef.current) : project;
        if (observedContentRef.current) {
            const observed = observedContentRef.current;
            // Advance only the observed server fields; edits in live refs still
            // differ from this baseline and must be persisted by the effect below.
            const baseline = previous ? mergeAgentCanvasEditor(previous, project, observed.nodes, observed.connections) : project;
            observedContentRef.current = { ...observed, nodes: baseline.nodes, connections: baseline.connections };
        }
        const oldNodes = new Set(nodesRef.current.map(node => node.id));
        const oldEdges = new Set(connectionsRef.current.map(edge => edge.id));
        markAgentCanvasEntrance(merged.nodes.filter(node => !oldNodes.has(node.id)).map(node => node.id), merged.connections.filter(edge => !oldEdges.has(edge.id)).map(edge => edge.id));
        nodesRef.current = merged.nodes;
        connectionsRef.current = merged.connections;
        setNodes(merged.nodes);
        setConnections(merged.connections);
        const previousIds = new Set(previous?.nodes.map((node) => node.id));
        const created = project.nodes.filter((node) => !previousIds.has(node.id));
        if (created.length && options?.focusCreatedNodes !== false) setAgentCreatedNodes({ projectId: project.id, nodes: created });
    }), [projectId, projectLoaded, nodesRef, connectionsRef, setNodes, setConnections]);

    useEffect(() => {
        const snapshot = { nodes, connections, chatSessions, activeChatId, canvasAppearance, backgroundMode, showImageInfo };
        const { advanceObserved, patch } = resolveCanvasEditorPersistPatch({
            projectId,
            projectLoaded,
            // 画布内切换时同一次提交里 state 仍是旧画布的内容，归属不一致必须跳过。
            editorProjectId,
            historyPaused: historyPausedRef.current,
            observed: observedContentRef.current,
            snapshot,
            stored: useCanvasStore.getState().projects.find((project) => project.id === projectId),
        });
        if (advanceObserved) observedContentRef.current = snapshot;
        if (patch) updateProject(projectId, patch);
    }, [activeChatId, backgroundMode, canvasAppearance, chatSessions, connections, editorProjectId, historyPausedRef, nodes, projectId, projectLoaded, showImageInfo, updateProject]);

    useEffect(() => {
        if (!canvasEditorOwnsProject({ projectLoaded, editorProjectId, projectId })) return;
        if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        viewportSaveTimerRef.current = setTimeout(() => {
            viewportSaveTimerRef.current = null;
            if (editorProjectIdRef.current !== projectId) return;
            updateProject(projectId, { viewport: viewportRef.current });
        }, 500);
        return () => {
            if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        };
    }, [editorProjectId, projectId, projectLoaded, updateProject, viewport, viewportRef]);

    useEffect(() => {
        const scope = getActiveUserScope();
        return () => {
            if (!projectLoaded) return;
            if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
            // Save the old editor before its cells unmount. An individual cell
            // must never write its discarded draft into a replacement identity.
            if (getActiveUserScope() !== scope || editorProjectIdRef.current !== projectId) return;
            flushCanvasTextEdits();
            updateProject(projectId, {
                nodes: nodesRef.current,
                connections: connectionsRef.current,
                chatSessions: chatSessionsRef.current,
                activeChatId: activeChatIdRef.current,
                viewport: viewportRef.current,
            });
        };
    }, [projectId, projectLoaded, updateProject, viewportRef, nodesRef, connectionsRef, chatSessionsRef, activeChatIdRef]);

    const createAndOpenProject = useCallback(() => {
        if (creatingProjectFromIdRef.current === projectId) return;
        creatingProjectFromIdRef.current = projectId;
        const { id, sync } = openOrCreateBlankCanvas(currentLocaleText("canvasExtra.library.freeCanvasName", { number: useCanvasStore.getState().projects.length + 1 }));
        if (id === projectId) creatingProjectFromIdRef.current = "";
        navigate(`/canvas/${id}`);
        void sync.then(({ syncError }) => {
            if (syncError) message.warning(currentLocaleText("canvasExtra.library.cloudSyncFailed"));
        });
    }, [message, navigate, projectId]);

    const deleteCurrentProject = useCallback(async () => {
        let drawingIds = nodesRef.current.flatMap((node) => node.type === "drawing" && node.metadata?.drawingId ? [node.metadata.drawingId] : []);
        try {
            const drafts = await readCanvasSyncDrafts(projectId);
            const preserved = new Set(drafts.flatMap((draft) => draft.project.nodes.flatMap((node) => node.metadata?.drawingId ? [node.metadata.drawingId] : [])));
            drawingIds = drawingIds.filter((id) => !preserved.has(id));
            await deleteCanvasProjectsWithRemoteSync([projectId]);
        } catch (error) {
            message.error(currentLocaleText("canvasExtra.lifecycle.deleteFailed"));
            return;
        }
        if (drawingIds.length) {
            void Promise.all(drawingIds.map((drawingId) => removeCanvasDrawing(projectId, drawingId)))
                .catch(() => message.warning(currentLocaleText("canvasExtra.lifecycle.drawingCacheCleanFailed")));
        }
        cleanupAssetImages();
        navigate("/canvas");
    }, [cleanupAssetImages, message, navigate, nodesRef, projectId]);

    const renameCurrentProject = useCallback((title: string) => {
        renameProject(projectId, title);
    }, [projectId, renameProject]);

    const persistEditorSnapshot = useCallback(() => {
        flushCanvasTextEdits();
        if (editorProjectIdRef.current !== projectId) {
            // 编辑器尚未载入当前画布（切换中）：没有属于它的本地编辑可写。
            return;
        }
        const snapshot = { nodes: nodesRef.current, connections: connectionsRef.current, chatSessions, activeChatId, canvasAppearance, backgroundMode, showImageInfo };
        if (observedContentRef.current && !sameCanvasHistorySnapshot(observedContentRef.current, snapshot)) {
            updateProject(projectId, {
                nodes: nodesRef.current,
                connections: connectionsRef.current,
                chatSessions,
                activeChatId,
                appearance: canvasAppearance,
                backgroundMode,
                showImageInfo,
                viewport: viewportRef.current,
            });
            observedContentRef.current = snapshot;
        }
        updateProject(projectId, { viewport: viewportRef.current });
    }, [activeChatId, backgroundMode, canvasAppearance, chatSessions, connectionsRef, nodesRef, projectId, showImageInfo, updateProject, viewportRef]);

    const persistLocalEdits = useCallback(async () => {
        persistEditorSnapshot();
        await flushCanvasStorePersistence();
    }, [persistEditorSnapshot]);

    useEffect(() => {
        if (!projectLoaded) return;
        const scope = getActiveUserScope();
        const checkpoint = () => {
            if (getActiveUserScope() !== scope || editorProjectIdRef.current !== projectId) return;
            persistEditorSnapshot();
            checkpointCanvasOnPageHide(projectId);
            void flushCanvasStorePersistence().catch((error) => console.error("画布离页持久化失败", error));
        };
        const hidden = () => { if (document.visibilityState === "hidden") checkpoint(); };
        // Capture runs before lease-release listeners, so the journal includes
        // the last cell value and the node IDs whose leases must be resumed.
        window.addEventListener("pagehide", checkpoint, true);
        window.addEventListener("beforeunload", checkpoint, true);
        document.addEventListener("visibilitychange", hidden, true);
        return () => {
            window.removeEventListener("pagehide", checkpoint, true);
            window.removeEventListener("beforeunload", checkpoint, true);
            document.removeEventListener("visibilitychange", hidden, true);
        };
    }, [persistEditorSnapshot, projectId, projectLoaded]);

    useEffect(() => {
        if (!projectLoaded || !currentProject || canvasTitleSource(currentProject) === "user" || !isDefaultCanvasTitle(currentProject.title) || titleGenerationRef.current.has(projectId)) return;
        const candidate = firstCanvasTitleCandidate(nodes) || chatSessions.flatMap((session) => session.messages).find((message) => message.role === "user" && isCanvasTitleContentCandidate(message.text))?.text || "";
        if (candidate.trim().length < 10) return;
        titleGenerationRef.current.add(projectId);
        let cancelled = false;
        const timer = setTimeout(() => controller.abort(), 3000);
        const controller = new AbortController();
        void generateCanvasTitle(candidate, controller.signal)
            .then(({ title }) => {
                if (cancelled) return;
                const latest = useCanvasStore.getState().projects.find((project) => project.id === projectId);
                if (!latest || canvasTitleSource(latest) === "user" || !isDefaultCanvasTitle(latest.title)) return;
                const resolved = title.trim() || heuristicCanvasTitle(candidate);
                if (resolved) renameProject(projectId, resolved, "auto");
            })
            .catch(() => {
                if (cancelled) return;
                const latest = useCanvasStore.getState().projects.find((project) => project.id === projectId);
                if (!latest || canvasTitleSource(latest) === "user" || !isDefaultCanvasTitle(latest.title)) return;
                const fallback = heuristicCanvasTitle(candidate);
                if (fallback) renameProject(projectId, fallback, "auto");
            })
            .finally(() => clearTimeout(timer));
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [chatSessions, currentProject, nodes, projectId, projectLoaded, renameProject]);

    const reloadLatestCanvasProject = useCallback(async () => {
        await persistLocalEdits();
        return new Promise<void>((resolve, reject) => {
            pendingReloadRef.current?.reject(new Error(currentLocaleText("canvasExtra.cloudSync.reloadSuperseded")));
            loadLatestRef.current = true;
            pendingReloadRef.current = { resolve, reject };
            setLoadAttempt((value) => value + 1);
        });
    }, [persistLocalEdits]);

    const restoreCanvasProjectVersion = useCallback(async (snapshotId: string, revision: number) => {
        await persistLocalEdits();
        return new Promise<void>((resolve, reject) => {
            historyRestoreRef.current?.reject(new Error(currentLocaleText("canvasExtra.cloudSync.restoreSuperseded")));
            historyRestoreRef.current = { snapshotId, revision, resolve, reject };
            setLoadAttempt((value) => value + 1);
        });
    }, [persistLocalEdits]);

    const saveCanvasProject = useCallback(async (options: { requireRemote?: boolean } = {}): Promise<boolean> => {
        try {
            await persistLocalEdits();
        } catch {
            message.error(currentLocaleText("canvasExtra.lifecycle.saveFailed"));
            return false;
        }
        try {
            await flushTextEdits();
            await saveRemoteUserDataNow(projectId);
            message.success({ key: "canvas-layout-saved", content: currentLocaleText("canvasExtra.lifecycle.layoutSaved") });
        } catch (error) {
            // 本地 IndexedDB 已写入；云端失败只排队重试，不能把导入方的画布状态回滚。
            message.warning(localSavedRemotePendingMessage(currentLocaleText("canvasExtra.lifecycle.layoutSavedLocally"), error));
            // Imports can retain their durable local result; sharing requires cloud success.
            return options.requireRemote === false;
        }
        return true;
    }, [flushTextEdits, message, persistLocalEdits, projectId]);

    const clearCanvasFiles = useCallback(() => {
        cleanupCanvasFiles({ projectId, nodes: [], chatSessions: [] });
    }, [cleanupCanvasFiles, projectId]);

    return {
        loadError,
        retryLoad: () => setLoadAttempt((attempt) => attempt + 1),
        addedSkills,
        agentCreatedNodes: agentCreatedNodes?.projectId === projectId ? agentCreatedNodes.nodes : null,
        clearCanvasFiles,
        createAndOpenProject,
        currentProject,
        deleteCurrentProject,
        renameCurrentProject,
        reloadLatestCanvasProject,
        restoreCanvasProjectVersion,
        saveCanvasProject,
        persistLocalEdits,
        updateProject,
    };
}


function mergeHydratedSessions(currentSessions: CanvasAssistantSession[], hydratedSessions: CanvasAssistantSession[]) {
    const hydratedById = new Map(hydratedSessions.map((session) => [session.id, session]));
    return currentSessions.map((session) => {
        const hydrated = hydratedById.get(session.id);
        if (!hydrated) return session;
        const hydratedMessages = new Map(hydrated.messages.map((message) => [message.id, message]));
        return {
            ...session,
            messages: session.messages.map((message) => {
                const hydratedMessage = hydratedMessages.get(message.id);
                if (!hydratedMessage || !message.references?.length) return message;
                const hydratedReferences = new Map((hydratedMessage.references || []).map((reference) => [reference.id, reference]));
                return {
                    ...message,
                    references: message.references.map((reference) => {
                        const hydratedReference = hydratedReferences.get(reference.id);
                        return hydratedReference ? { ...reference, dataUrl: hydratedReference.dataUrl, storageKey: hydratedReference.storageKey } : reference;
                    }),
                };
            }),
        };
    });
}
