import { useEffect, useRef, useState } from "react";
import { App, Button, Input, Select, Space } from "antd";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { useI18n } from "@/i18n/use-i18n";
import { useDirectorPrevisV2 } from "@/hooks/use-director-previs-v2";
import { getActiveUserScope } from "@/lib/user-scope";
import { bindDirectorDescriptionReferences, deriveDirectorDescription, emptyDirectorDescription, mergeDirectorDescription } from "@/lib/canvas/director/director-description";
import { generateDirectorDescription } from "@/services/director-description";
import { requireCanvasGenerationAccount } from "@/services/guest-canvas-handoff";
import { listLogicalModels, type PublicLogicalModel } from "@/services/api/logical-models";
import type { CanvasNodeData } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";

export function DirectorDescriptionForm({ canvasId, nodes, scene, onGenerated }: { canvasId?: string; nodes: CanvasNodeData[]; scene?: DirectorScene; onGenerated: (scene: DirectorScene) => void }) {
    useI18n();
    const previsV2 = useDirectorPrevisV2();
    const { modal, message } = App.useApp();
    const [description, setDescription] = useState("");
    const [mode, setMode] = useState<"append" | "replace">("append");
    const [models, setModels] = useState<PublicLogicalModel[]>([]);
    const [modelId, setModelId] = useState("");
    const [busy, setBusy] = useState(false);
    const lifetime = useRef(new AbortController());
    const running = useRef(false);
    const latest = useRef({ canvasId, scene, nodes });
    latest.current = { canvasId, scene, nodes };
    const hasDescription = Boolean(description.trim());
    useEffect(() => {
        const controller = new AbortController();
        lifetime.current = controller;
        return () => controller.abort();
    }, [canvasId, scene?.id]);
    useEffect(() => {
        if (!hasDescription || !canvasId) return;
        let current = true;
        void listLogicalModels()
            .then(({ models }) => {
                if (!current) return;
                const text = models.filter((m) => m.capability === "text" && m.available);
                setModels(text);
                setModelId((id) => (text.some((m) => m.id === id) ? id : text[0]?.id || ""));
            })
            .catch(() => {
                if (current) setModels([]);
            });
        return () => {
            current = false;
        };
    }, [hasDescription, canvasId]);
    const confirm = (content: string) =>
        new Promise<boolean>((resolve) => {
            const signal = lifetime.current.signal;
            const dialog = modal.confirm({
                title: t("directorD5.title"),
                content,
                okText: t("directorD5.confirm"),
                cancelText: t("directorD5.cancel"),
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
                afterClose: () => signal.removeEventListener("abort", abort),
            });
            const abort = () => {
                dialog.destroy();
                resolve(false);
            };
            signal.addEventListener("abort", abort, { once: true });
            if (signal.aborted) abort();
        });
    const generate = async (ai: boolean) => {
        if (running.current) return;
        if (ai && canvasId) {
            try {
                if (!(await requireCanvasGenerationAccount(canvasId))) return;
            } catch (error) {
                message.error(error instanceof Error ? error.message : t("miscPages.guestPrepareFailed"));
                return;
            }
        }
        running.current = true;
        setBusy(true);
        const snapshot = JSON.stringify(scene);
        const scope = getActiveUserScope();
        const signal = lifetime.current.signal;
        const assertCurrent = () => {
            signal.throwIfAborted();
            if (latest.current.canvasId !== canvasId || JSON.stringify(latest.current.scene) !== snapshot || getActiveUserScope() !== scope) throw new Error(t("directorD5.changed"));
        };
        try {
            if (scene && mode === "replace" && !(await confirm(t("directorD5.replaceWarning")))) return;
            assertCurrent();
            let result: DirectorScene | null | undefined;
            if (ai) {
                result = await generateDirectorDescription(
                    { description, canvasId: canvasId || "", modelId, ...(previsV2 && (scene?.previs || /地铁|地鐵|月台|站台|subway|metro platform|地下鉄|지하철|metrô/i.test(description)) ? { protocol: "previs-v2" as const } : {}) },
                    {
                        signal,
                        assertCurrent,
                        confirm: async () => true,
                        failed: (_id, refunded) => message.warning(t(refunded ? "directorD5.refunded" : "directorD5.failed")),
                    },
                );
                if (result === undefined) return;
            }
            assertCurrent();
            const currentNodes = latest.current.nodes;
            const generated = bindDirectorDescriptionReferences(result || (description.trim() ? deriveDirectorDescription(description, currentNodes) : emptyDirectorDescription("", currentNodes)), currentNodes);
            const next = scene ? mergeDirectorDescription(scene, generated, mode) : generated;
            onGenerated(!previsV2 && scene?.previs ? { ...next, previs: scene.previs } : next);
            setDescription("");
        } catch (error) {
            if (!signal.aborted) message.error(error instanceof Error ? error.message : t("directorD5.failed"));
        } finally {
            running.current = false;
            if (!signal.aborted) setBusy(false);
        }
    };
    return (
        <div className="flex shrink-0 flex-col gap-2 p-3" data-director-description data-canvas-no-zoom data-canvas-wheel-scroll>
            <Input.TextArea aria-label={t("directorD5.title")} placeholder={t("directorD5.example")} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} autoSize={{ minRows: 1, maxRows: 3 }} disabled={busy} />
            <Space wrap>
                {scene && (
                    <Select
                        aria-label={t("directorD5.mode")}
                        value={mode}
                        onChange={setMode}
                        disabled={busy}
                        options={[
                            { value: "append", label: t("directorD5.append") },
                            { value: "replace", label: t("directorD5.replace") },
                        ]}
                    />
                )}
                {hasDescription && (
                    <Select
                        aria-label={t("directorD5.model")}
                        value={modelId || undefined}
                        onChange={setModelId}
                        disabled={busy}
                        placeholder={t("directorD5.model")}
                        options={models.map((model) => ({ value: model.id, label: model.name }))}
                        style={{ minWidth: 140 }}
                    />
                )}
                <Button loading={busy} disabled={!hasDescription || !modelId || !canvasId} onClick={() => void generate(true)}>
                    {t("directorD5.quoteButton")}
                </Button>
                <Button type="primary" disabled={busy || !hasDescription} onClick={() => void generate(false)}>
                    {t("directorD5.free")}
                </Button>
            </Space>
        </div>
    );
}
