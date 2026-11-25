import { useEffect, useRef, useState } from "react";
import { App, Button, Input, Select } from "antd";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { useI18n } from "@/i18n/use-i18n";
import { useDirectorPrevisV2 } from "@/hooks/use-director-previs-v2";
import { getActiveUserScope } from "@/lib/user-scope";
import { directorUpstreamNodes } from "@/lib/canvas/director/director-context";
import { listLogicalModels, type PublicLogicalModel } from "@/services/api/logical-models";
import { generateDirectorPlan } from "@/services/director-plan";
import type { CanvasConnection, CanvasNodeData } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";

export function DirectorPlanForm({ canvasId, nodeId, nodes, connections, scene, prepare, onGenerated }: { canvasId?: string; nodeId?: string; nodes: CanvasNodeData[]; connections: CanvasConnection[]; scene: DirectorScene; prepare: () => Promise<DirectorScene>; onGenerated: (scene: DirectorScene) => void }) {
    useI18n();
    const previsV2 = useDirectorPrevisV2();
    const { message } = App.useApp();
    const [prompt, setPrompt] = useState("");
    const [sourceNodeId, setSourceNodeId] = useState(() => nodes.find((node) => node.id === nodeId)?.metadata?.directorSourceStoryboardNodeId || "");
    const [sourceRowId, setSourceRowId] = useState(() => nodes.find((node) => node.id === nodeId)?.metadata?.directorSourceStoryboardRowId || "");
    const [models, setModels] = useState<PublicLogicalModel[]>([]);
    const [modelId, setModelId] = useState("");
    const [busy, setBusy] = useState(false);
    const running = useRef(false);
    const lifetime = useRef(new AbortController());
    const latest = useRef({ scene, nodes, connections, sourceNodeId, sourceRowId });
    latest.current = { scene, nodes, connections, sourceNodeId, sourceRowId };
    const upstream = directorUpstreamNodes(nodes, connections, nodeId);
    const source = nodes.find((node) => node.id === sourceNodeId);
    const rows = source?.metadata?.storyboard?.rows || [];
    useEffect(() => {
        const controller = new AbortController();
        lifetime.current = controller;
        void listLogicalModels().then(({ models }) => {
            if (controller.signal.aborted) return;
            const available = models.filter((model) => model.available && model.capability === "text");
            setModels(available);
            setModelId(available[0]?.id || "");
        }).catch(() => { if (!controller.signal.aborted) setModels([]); });
        return () => controller.abort();
    }, [canvasId, scene.id]);
    const generate = async () => {
        if (running.current || !canvasId || !modelId) return;
        running.current = true; setBusy(true);
        const scope = getActiveUserScope();
        const contextSnapshot = () => {
            const current = latest.current;
            const related = directorUpstreamNodes(current.nodes, current.connections, nodeId);
            const explicit = current.nodes.find((node) => node.id === current.sourceNodeId);
            return JSON.stringify([current.scene, related, explicit, current.sourceNodeId, current.sourceRowId]);
        };
        let snapshot = contextSnapshot();
        const signal = lifetime.current.signal;
        const assertCurrent = () => {
            signal.throwIfAborted();
            if (scope !== getActiveUserScope() || snapshot !== contextSnapshot()) throw new Error(t("previs.ai.changed"));
        };
        try {
            const savedScene = await prepare();
            // Saving may canonicalize the stage. Freeze the acknowledged scene, not the old render closure.
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            snapshot = contextSnapshot();
            assertCurrent();
            const editing = previsV2 && savedScene.previs?.segments.some((segment) => !segment.legacyShotId);
            const result = await generateDirectorPlan({ canvasId, nodeId, scene: savedScene, modelId, prompt: prompt.trim() || t(editing ? "previs.ai.editCurrent" : "previs.ai.fromSources"), sourceNodeId, sourceRowId, ...(editing ? { protocol: "previs-v2-edit" as const } : {}) }, {
                signal, assertCurrent,
                confirm: async () => true,
            });
            if (result) {
                onGenerated("scene" in result ? result.scene : result);
                setPrompt("");
                if ("warnings" in result && result.warnings.length) message.warning(result.warnings.join("\n"));
                else message.success(t("previs.ai.applied"));
            }
        } catch (error) { if (!signal.aborted) message.error(error instanceof Error ? error.message : t("previs.ai.failed")); }
        finally { running.current = false; if (!signal.aborted) setBusy(false); }
    };
    return <div className="flex shrink-0 flex-col gap-2 p-3" data-canvas-no-zoom data-canvas-wheel-scroll>
        <Input.TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label={t("previs.ai.title")} placeholder={t("previs.ai.placeholder")} maxLength={2000} autoSize={{ minRows: 1, maxRows: 3 }} disabled={busy} />
        <div className="flex flex-wrap items-center gap-2">
            <Select aria-label={t("previs.ai.source")} value={sourceNodeId} disabled={busy} onChange={(id) => { setSourceNodeId(id); setSourceRowId(""); }} options={[{ value: "", label: t("previs.ai.connected", { count: upstream.length }) }, ...nodes.filter((node) => node.type === "script" || node.type === "text").map((node) => ({ value: node.id, label: node.title }))]} />
            {rows.length > 0 && <Select aria-label={t("previs.ai.row")} value={sourceRowId} disabled={busy} onChange={setSourceRowId} options={[{ value: "", label: t("previs.ai.allRows") }, ...rows.map((row) => ({ value: row.id, label: `${row.shotNumber}. ${row.plotDescription.slice(0, 40)}` }))]} />}
            <Select aria-label={t("previs.ai.model")} value={modelId || undefined} disabled={busy} placeholder={t("previs.ai.model")} onChange={setModelId} options={models.map((model) => ({ value: model.id, label: model.name }))} />
            <Button loading={busy} disabled={!modelId || !canvasId || (!prompt.trim() && (Boolean(previsV2 && scene.previs?.segments.some((segment) => !segment.legacyShotId)) || (!source && !upstream.length)))} onClick={() => void generate()}>{t("previs.ai.submit")}</Button>
            <span className="text-xs text-[var(--pd-t2)]">{t("previs.ai.free")}</span>
        </div>
    </div>;
}
