import { createElement, useCallback, type Dispatch, type SetStateAction } from "react";
import { App } from "antd";
import { nanoid } from "nanoid";
import { currentLocaleText } from "@/i18n/current-locale-text";

import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { batchInputColumns, batchReferenceColumns, createBatchRowsFromColumns, createInheritedBatchRow } from "@/lib/canvas/canvas-batch-table";
import { createCanvasNode } from "@/lib/canvas/canvas-project-domain";
import { buildGenerationConfig, resetGenerationTaskMetadata } from "@/lib/canvas/canvas-project-generation";
import { navigateToSettings } from "@/lib/settings-navigation";
import { requireCanvasGenerationAccount } from "@/services/guest-canvas-handoff";
import { modelDisplayName, useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasBatchRow, type CanvasBatchTableData, type CanvasConnection, type CanvasGenerationBatchMode, type CanvasNodeData } from "@/types/canvas";

type Options = {
    projectId: string;
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    enqueueGenerationBatch: (sourceNodeId: string, mode: CanvasGenerationBatchMode, targets: Array<{ rowId: string; nodeId: string }>, options?: { concurrency?: number }) => string | undefined;
};

export function useCanvasBatchTable({ projectId, nodesRef, connectionsRef, setNodes, setConnections, setSelectedNodeIds, enqueueGenerationBatch }: Options) {
    const { message, modal } = App.useApp();
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);

    const patchTable = useCallback(
        (nodeId: string, patch: Partial<CanvasBatchTableData>) => {
            setNodes((current) => current.map((node) => (node.id !== nodeId ? node : { ...node, metadata: { ...node.metadata, batchTable: { operation: "try_on", concurrency: 10, rows: [], ...node.metadata?.batchTable, ...patch } } })));
        },
        [setNodes],
    );

    const updateRow = useCallback(
        (nodeId: string, rowId: string, patch: Partial<CanvasBatchRow>) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            if (!node?.metadata?.batchTable) return;
            patchTable(nodeId, { rows: node.metadata.batchTable.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)) });
        },
        [nodesRef, patchTable],
    );

    const addRow = useCallback(
        (nodeId: string) => {
            const table = nodesRef.current.find((item) => item.id === nodeId)?.metadata?.batchTable;
            if (!table) return;
            patchTable(nodeId, { rows: [...table.rows, createInheritedBatchRow(table.operation, table.rows)] });
        },
        [nodesRef, patchTable],
    );

    const removeRow = useCallback(
        (nodeId: string, rowId: string) => {
            const table = nodesRef.current.find((item) => item.id === nodeId)?.metadata?.batchTable;
            if (!table) return;
            patchTable(nodeId, { rows: table.rows.filter((row) => row.id !== rowId) });
        },
        [nodesRef, patchTable],
    );

    const addReferenceColumn = useCallback(
        (nodeId: string) => {
            const table = nodesRef.current.find((item) => item.id === nodeId)?.metadata?.batchTable;
            if (!table) return;
            const columns = batchReferenceColumns(table);
            if (columns.length >= 6) return message.info(currentLocaleText("canvasExtra.batchTable.maxReferences", { count: 6 }));
            const nextIndex = columns.length + 1;
            patchTable(nodeId, { referenceColumns: [...columns, { id: `reference-${nanoid()}`, label: currentLocaleText("canvasExtra.batchTable.reference", { number: nextIndex }) }] });
        },
        [message, nodesRef, patchTable],
    );

    const fillRowsFromConnections = useCallback(
        (nodeId: string) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            const table = node?.metadata?.batchTable;
            if (!node || !table) return;
            const nodeById = new Map(nodesRef.current.map((item) => [item.id, item]));
            const columns = batchInputColumns(node, connectionsRef.current).map((column) =>
                column.filter((inputNodeId) => {
                    const input = nodeById.get(inputNodeId);
                    return input?.type === CanvasNodeType.Image && Boolean(input.metadata?.content || input.metadata?.storageKey);
                }),
            );
            if (!columns.some((column) => column.length)) return message.warning(currentLocaleText("canvasExtra.batchTable.connectImagesFirst"));
            const rows = createBatchRowsFromColumns(table.operation, columns, table.rows);
            if (!rows.length) return message.warning(currentLocaleText("canvasExtra.batchTable.tryOnNeedsTwoImages"));
            patchTable(nodeId, { rows });
            const added = Math.max(0, rows.length - table.rows.length);
            message.success(added ? currentLocaleText("canvasExtra.batchTable.syncedAdded", { count: added }) : currentLocaleText("canvasExtra.batchTable.synced"));
        },
        [connectionsRef, message, nodesRef, patchTable],
    );

    const generateRows = useCallback(
        async (nodeId: string, requestedRowIds?: string[]) => {
            const sourceNode = nodesRef.current.find((item) => item.id === nodeId);
            const table = sourceNode?.metadata?.batchTable;
            if (!sourceNode || !table) return;
            try {
                if (!(await requireCanvasGenerationAccount(projectId))) return;
            } catch (error) {
                message.error(error instanceof Error ? error.message : currentLocaleText("miscPages.guestPrepareFailed"));
                return;
            }
            const imageModel = effectiveConfig.imageModel || effectiveConfig.model;
            if (!isAiConfigReady(effectiveConfig, imageModel)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            const activeNodeIds = new Set(
                (sourceNode.metadata?.generationBatches || [])
                    .filter((batch) => batch.mode === "batch_image")
                    .flatMap((batch) => batch.items.filter((item) => ["waiting", "submitting", "queued", "running"].includes(item.status)).map((item) => item.nodeId)),
            );
            const requested = requestedRowIds?.length ? new Set(requestedRowIds) : null;
            const rows = table.rows.filter((row) => {
                if (!row.enabled || (requested && !requested.has(row.id)) || !row.prompt.trim()) return false;
                if (table.operation === "try_on" && row.inputNodeIds.length < 2) return false;
                if (!row.inputNodeIds.length || row.inputNodeIds.some((id) => !nodesRef.current.some((node) => node.id === id && node.type === CanvasNodeType.Image && Boolean(node.metadata?.content || node.metadata?.storageKey)))) return false;
                const output = row.outputNodeId ? nodesRef.current.find((node) => node.id === row.outputNodeId) : undefined;
                if (output && activeNodeIds.has(output.id)) return false;
                // 操作列的单行生成允许对已完成结果重新生成；顶部批量按钮仍只提交未完成项。
                if (requested) return true;
                return !output?.metadata?.content;
            });
            if (!rows.length) return message.info(currentLocaleText("canvasExtra.batchTable.noPendingTasks"));
            // 每行固定只出 1 张图：不能继承全局“每次生成张数”，否则 10 行可能按 40 张扣费，而确认框只写了 10 个任务。
            // 尺寸/质量在确认时定下并写入每个输出节点，确认框展示的就是实际提交与计费的参数。
            const generationConfig = buildGenerationConfig(effectiveConfig, undefined, "image");
            const imageResolution = /^(1k|2k|4k)$/i.test(generationConfig.quality || "") ? generationConfig.quality.toUpperCase() : currentLocaleText("canvasExtra.batchTable.resolutionBySize");
            const confirmed = await new Promise<boolean>((resolve) =>
                modal.confirm({
                    title: currentLocaleText("canvasExtra.batchTable.confirmTitle", { count: rows.length }),
                    content: createElement(
                        "div",
                        { style: { whiteSpace: "pre-line" } },
                        currentLocaleText("canvasExtra.batchTable.confirmDetails", {
                            model: modelDisplayName(effectiveConfig, generationConfig.model) || generationConfig.model,
                            count: rows.length,
                            size: generationConfig.size || currentLocaleText("canvasExtra.batchTable.defaultValue"),
                            quality: generationConfig.quality || currentLocaleText("canvasExtra.batchTable.defaultValue"),
                            resolution: imageResolution,
                            concurrency: table.concurrency,
                        }),
                    ),
                    okText: currentLocaleText("canvasExtra.batchTable.confirmGenerate"),
                    cancelText: currentLocaleText("canvasExtra.batchTable.cancel"),
                    centered: true,
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                }),
            );
            if (!confirmed) return;

            const imageSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const nextNodes = [...nodesRef.current];
            let nextConnections = [...connectionsRef.current];
            const outputByRowId = new Map<string, string>();
            const targets: Array<{ rowId: string; nodeId: string }> = [];
            rows.forEach((row, index) => {
                const existingIndex = row.outputNodeId ? nextNodes.findIndex((node) => node.id === row.outputNodeId && node.type === CanvasNodeType.Image) : -1;
                const metadata = {
                    ...(existingIndex >= 0 ? resetGenerationTaskMetadata(nextNodes[existingIndex].metadata) : {}),
                    // 已有结果的行重新生成时必须原地替换：否则执行器会另建节点承接任务，
                    // 批次仍盯着这个旧节点，判定“未完成”后每 2 秒再提交一次、反复扣费。
                    ...(existingIndex >= 0 ? { generationResultPlacement: "replace-node" as const } : {}),
                    prompt: row.prompt.trim(),
                    composerContent: row.prompt.trim(),
                    model: generationConfig.model,
                    size: generationConfig.size,
                    quality: generationConfig.quality,
                    transparentBackground: generationConfig.transparentBackground,
                    count: 1,
                    generationMode: "image" as const,
                    generationType: "edit" as const,
                    workflowKind: "final" as const,
                    workflowTitle: currentLocaleText(table.operation === "try_on" ? "canvasExtra.batchTable.tryOnTask" : "canvasExtra.batchTable.creativeTask", { number: index + 1 }),
                    status: "idle" as const,
                    batchSourceNodeId: nodeId,
                    batchRowId: row.id,
                    batchOperation: table.operation,
                    batchInputNodeIds: row.inputNodeIds,
                };
                const output =
                    existingIndex >= 0
                        ? { ...nextNodes[existingIndex], metadata }
                        : createCanvasNode(CanvasNodeType.Image, { x: sourceNode.position.x + sourceNode.width + 120 + imageSpec.width / 2, y: sourceNode.position.y + index * (imageSpec.height + 32) + imageSpec.height / 2 }, metadata);
                output.title = currentLocaleText(table.operation === "try_on" ? "canvasExtra.batchTable.tryOnNode" : "canvasExtra.batchTable.creativeNode", { number: index + 1 });
                if (existingIndex >= 0) nextNodes[existingIndex] = output;
                else nextNodes.push(output);
                nextConnections = nextConnections.filter((connection) => connection.toNodeId !== output.id);
                row.inputNodeIds.forEach((inputNodeId) => nextConnections.push({ id: nanoid(), fromNodeId: inputNodeId, toNodeId: output.id }));
                nextConnections.push({ id: nanoid(), fromNodeId: sourceNode.id, toNodeId: output.id, relation: "batch-output", storyboardRowId: row.id });
                outputByRowId.set(row.id, output.id);
                targets.push({ rowId: row.id, nodeId: output.id });
            });
            const sourceIndex = nextNodes.findIndex((node) => node.id === sourceNode.id);
            nextNodes[sourceIndex] = { ...sourceNode, metadata: { ...sourceNode.metadata, batchTable: { ...table, rows: table.rows.map((row) => (outputByRowId.has(row.id) ? { ...row, outputNodeId: outputByRowId.get(row.id) } : row)) } } };
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            setSelectedNodeIds(new Set(targets.map((target) => target.nodeId)));
            if (enqueueGenerationBatch(nodeId, "batch_image", targets, { concurrency: table.concurrency })) message.success(currentLocaleText("canvasExtra.batchTable.queued", { count: targets.length }));
        },
        [connectionsRef, effectiveConfig, enqueueGenerationBatch, isAiConfigReady, message, modal, nodesRef, projectId, setConnections, setNodes, setSelectedNodeIds],
    );

    return { addReferenceColumn, addRow, fillRowsFromConnections, generateRows, patchTable, removeRow, updateRow };
}
