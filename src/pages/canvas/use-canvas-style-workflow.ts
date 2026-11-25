import { findAvailableGenerationGroupPosition } from "@/lib/canvas/canvas-generation-layout";
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { currentLocaleText } from "@/i18n/current-locale-text";

import type { CanvasStylePreset } from "@/components/canvas/canvas-style-picker-modal";
import { createCanvasNode } from "@/lib/canvas/canvas-project-domain";
import { createStyleProfileSnapshot, serializeStyleProfile } from "@/lib/canvas/style-profile";
import { updateProject as updateDomainProject } from "@/services/api/projects";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeMetadata, type Position } from "@/types/canvas";
import { getActiveUserScope } from "@/lib/user-scope";

type UseCanvasStyleWorkflowOptions = {
    canvasId: string;
    domainProjectId?: string;
    nodesRef: { current: CanvasNodeData[] };
    selectedNodeIdsRef: { current: Set<string> };
    getCanvasCenter: () => Position;
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setDialogNodeId: Dispatch<SetStateAction<string | null>>;
    setStylePickerOpen: Dispatch<SetStateAction<boolean>>;
};

export function useCanvasStyleWorkflow({ canvasId, domainProjectId, nodesRef, selectedNodeIdsRef, getCanvasCenter, setNodes, setSelectedNodeIds, setSelectedConnectionId, setDialogNodeId, setStylePickerOpen }: UseCanvasStyleWorkflowOptions) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const liveContext = useRef({ canvasId, domainProjectId, mounted: true });
    liveContext.current = { canvasId, domainProjectId, mounted: liveContext.current.mounted };
    const applyingRef = useRef(false);
    useEffect(() => { liveContext.current.mounted = true; return () => { liveContext.current.mounted = false; }; }, []);

    const applyCanvasStyle = useCallback(
        (preset: CanvasStylePreset, profileJson: string) => {
            const current = nodesRef.current.find((node) => node.type === CanvasNodeType.Text && node.metadata?.workflowKind === "styleboard");
            const metadata: CanvasNodeMetadata = {
                content: preset.prompt,
                prompt: preset.prompt,
                status: "success",
                workflowKind: "styleboard",
                workflowTitle: currentLocaleText("canvasExtra.style.projectStyleTitle"),
                workflowDescription: preset.description,
                stylePresetId: preset.id,
                styleProfileJson: profileJson,
                fontSize: 14,
            };
            let styleNode: CanvasNodeData;
            if (current) {
                styleNode = { ...current, title: currentLocaleText("canvasExtra.style.styleNodeTitle", { title: preset.title }), metadata: { ...current.metadata, ...metadata } };
                nodesRef.current = nodesRef.current.map((node) => (node.id === current.id ? styleNode : node));
            } else {
                styleNode = createCanvasNode(CanvasNodeType.Text, getCanvasCenter(), metadata);
                styleNode.title = currentLocaleText("canvasExtra.style.styleNodeTitle", { title: preset.title });
                styleNode.width = 420;
                styleNode.height = 240;
                // 视口中心常已有节点，画风节点按最近空位放置，避免盖住正在编辑的内容。
                styleNode.position = findAvailableGenerationGroupPosition(nodesRef.current, styleNode.position, { width: styleNode.width, height: styleNode.height });
                nodesRef.current = [...nodesRef.current, styleNode];
            }
            setNodes(nodesRef.current);
            const selection = new Set([styleNode.id]);
            selectedNodeIdsRef.current = selection;
            setSelectedNodeIds(selection);
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            setStylePickerOpen(false);
            message.success(currentLocaleText("canvasExtra.style.styleApplied", { title: preset.title }));
        },
        [getCanvasCenter, message, nodesRef, selectedNodeIdsRef, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds, setStylePickerOpen],
    );

    const persistStyleMutation = useMutation({
        mutationFn: ({ preset, profileJson }: { preset: CanvasStylePreset; profileJson: string }) => {
            if (!domainProjectId) throw new Error(currentLocaleText("canvasExtra.style.canvasNotLinkedToProject"));
            return updateDomainProject(domainProjectId, { stylePresetId: preset.id, styleProfileJson: profileJson });
        },
    });

    const applyCanvasStyleAsync = useCallback(async (preset: CanvasStylePreset) => {
        if (applyingRef.current) throw new Error(currentLocaleText("canvasExtra.style.styleSaving"));
        const scope = getActiveUserScope();
        applyingRef.current = true;
        try {
            const profileJson = serializeStyleProfile(preset.profile || createStyleProfileSnapshot(preset));
            if (domainProjectId) {
                await persistStyleMutation.mutateAsync({ preset, profileJson });
                void queryClient.invalidateQueries({ queryKey: ["project", domainProjectId] });
            }
            if (!liveContext.current.mounted || liveContext.current.canvasId !== canvasId || liveContext.current.domainProjectId !== domainProjectId || getActiveUserScope() !== scope) throw new Error(currentLocaleText("canvasExtra.style.contextChanged"));
            applyCanvasStyle(preset, profileJson);
        } finally { applyingRef.current = false; }
    }, [canvasId, domainProjectId, persistStyleMutation.mutateAsync, queryClient, applyCanvasStyle]);

    const selectCanvasStyle = useCallback(
        (preset: CanvasStylePreset) => {
            void applyCanvasStyleAsync(preset).catch((error) => message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.style.styleSaveFailed")));
        },
        [applyCanvasStyleAsync, message],
    );

    return { selectCanvasStyle, applyCanvasStyleAsync, styleApplying: persistStyleMutation.isPending };
}
