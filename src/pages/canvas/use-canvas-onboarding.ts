import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type ViewportTransform } from "@/types/canvas";
import { applyNodeConfigPatch, createCanvasNode } from "@/lib/canvas/canvas-project-domain";
import { type AiConfig } from "@/stores/use-config-store";
import { compileCanvasStylePreset } from "@/lib/canvas/canvas-style-system";
import { createStyleProfileSnapshot, serializeStyleProfile } from "@/lib/canvas/style-profile";
import { buildNodeMentionReferences, canvasNodeMentionToken, replaceCanvasMentionToken } from "@/lib/canvas/canvas-resource-references";
import { ONBOARDING_PRESET_STORIES } from "@/lib/canvas/canvas-onboarding-template";
import { onboardingGenerationDefaults } from "@/lib/canvas/canvas-onboarding-defaults";
import type { OnboardingStep } from "@/lib/canvas/canvas-onboarding-flow";
import type { CoachRevealArea } from "@/components/onboarding/coach-mark";
import { unionCoachRects } from "@/lib/coach-mark-layout";

type Options = {
    active: boolean;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    nodesRef: { current: CanvasNodeData[] };
    viewportRef: { current: ViewportTransform };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setDialogNodeId: Dispatch<SetStateAction<string | null>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    moveViewportTo: (viewport: ViewportTransform, immediate?: boolean) => void;
    defaultTextModel: string;
    config: AiConfig;
};

export function useCanvasOnboarding(options: Options) {
    const { t } = useI18n();
    const { nodes, connections, active, setNodes, nodesRef, defaultTextModel } = options;
    const text = nodes.find((node) => node.type === CanvasNodeType.Text && !node.metadata?.workflowKind) || null;
    const script = text ? nodes.find((node) => node.type === CanvasNodeType.Script && connections.some((edge) => edge.fromNodeId === text.id && edge.toNodeId === node.id)) || null : null;
    const firstShot = script?.metadata?.storyboard?.rows[0];
    const image = firstShot ? nodes.find((node) => node.id === firstShot.imageNodeId && node.type === CanvasNodeType.Image && connections.some((edge) => edge.fromNodeId === script?.id && edge.toNodeId === node.id)) || null : null;
    const video = image ? nodes.find((node) => node.type === CanvasNodeType.Video && connections.some((edge) => edge.fromNodeId === image.id && edge.toNodeId === node.id)) || null : null;
    const presets = onboardingGenerationDefaults(options.config);
    const imageModel = presets.image.model;
    const videoModel = presets.video.model;

    useEffect(() => {
        if (!active) return;
        let changed = false;
        let next = nodesRef.current.map((node) => {
            const model = node.id === text?.id ? defaultTextModel : node.id === image?.id ? imageModel : videoModel;
            if ((node.metadata?.onboardingDefaultsApplied && (node.metadata.model || !model)) || ![text?.id, image?.id, video?.id].includes(node.id)) return node;
            changed = true;
            const story = t(ONBOARDING_PRESET_STORIES[0].textKey as MessageKey);
            let promptText = node.metadata?.composerContent || node.metadata?.prompt || "";
            if (node.id === video?.id) {
                for (const reference of buildNodeMentionReferences(node, nodesRef.current, connections)) {
                    for (const token of [canvasNodeMentionToken(reference.nodeId), `@${reference.label}`, `@${reference.title}`]) promptText = replaceCanvasMentionToken(promptText, token, "");
                }
            }
            const defaults =
                node.id === text?.id
                    ? { ...(!node.metadata?.composerContent && !node.metadata?.prompt ? { prompt: story, composerContent: story } : {}), ...(!node.metadata?.model && defaultTextModel ? { model: defaultTextModel } : {}) }
                    : node.id === image?.id
                      ? presets.image
                      : {
                            ...presets.video,
                            ...(!promptText.trim() && firstShot
                                ? {
                                      prompt: firstShot.videoMotionPrompt || firstShot.plotDescription,
                                      composerContent: [node.metadata?.composerContent, firstShot.videoMotionPrompt || firstShot.plotDescription].filter(Boolean).join("\n"),
                                  }
                                : {}),
                        };
            return applyNodeConfigPatch(node, { ...defaults, onboardingDefaultsApplied: true });
        });
        // The normal storyboard pipeline requires a real project style. Seed the same
        // preset/profile contract used by the style picker, without weakening validation.
        if (script && !next.some((node) => node.metadata?.workflowKind === "styleboard")) {
            const preset = compileCanvasStylePreset({ world: "suspense", tone: "dark", medium: "live-action", character: "realistic" });
            const profile = createStyleProfileSnapshot(preset);
            const style = createCanvasNode(
                CanvasNodeType.Text,
                { x: script.position.x, y: script.position.y - 1800 },
                {
                    workflowKind: "styleboard",
                    content: profile.prompt,
                    prompt: profile.prompt,
                    stylePresetId: profile.presetId,
                    styleProfileJson: serializeStyleProfile(profile),
                    status: "success",
                },
            );
            style.title = t("canvasExtra.canvas.projectStyleTitle", { title: profile.title });
            next = [...next, style];
            changed = true;
        }
        if (changed) {
            nodesRef.current = next;
            setNodes(next);
        }
    }, [active, text?.id, script?.id, image?.id, video?.id, defaultTextModel, imageModel, videoModel, presets.video.seconds, presets.video.vquality, presets.video.generateAudio, nodesRef, setNodes, t]);

    const onStepChange = useCallback(
        (step: OnboardingStep) => {
            const node = step === 2 || step === 3 ? text : step === 4 || step === 5 ? script : step === 6 || step === 7 ? image : step === 8 ? video : null;
            if (!node) return;
            options.setSelectedNodeIds(new Set([node.id]));
            options.setDialogNodeId([2, 6, 8].includes(step) ? node.id : null);
        },
        [text, script, image, video, options.setDialogNodeId, options.setSelectedNodeIds],
    );

    const onReveal = useCallback(
        (element: HTMLElement, area: CoachRevealArea) => {
            const nodeElements = area.context.filter((item) => item.matches("[data-node-id]"));
            if (!nodeElements.length) {
                element.scrollIntoView({ block: "center", inline: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
                return;
            }
            // Fit whole nodes and the unscaled editor together, leaving room for the
            // coach card, node toolbar and application chrome before panning.
            const current = options.viewportRef.current;
            const container = document.querySelector("[data-canvas-viewport]")?.getBoundingClientRect();
            const originX = container?.left || 0, originY = container?.top || 0;
            const world = unionCoachRects(nodeElements.map((item) => {
                const r = item.getBoundingClientRect();
                return { x: (r.x - originX - current.x) / current.k, y: (r.y - originY - current.y) / current.k, width: r.width / current.k, height: r.height / current.k };
            }))!;
            const panel = area.context.find((item) => item.matches("[data-canvas-node-panel]"));
            const panelHeight = panel?.getBoundingClientRect().height || 0;
            const panelWidth = panel?.getBoundingClientRect().width || 0;
            const inset = window.innerWidth > 640 && window.innerWidth < 1120 ? 12 : 24;
            const safe = { x: inset, y: area.top, width: window.innerWidth - area.right - inset, height: window.innerHeight - area.bottom - area.top };
            const attached = nodeElements.at(-1)!.getBoundingClientRect();
            const panelAnchor = (attached.x + attached.width / 2 - originX - current.x) / current.k;
            const mobile = window.innerWidth <= 640;
            const portSpace = (scale: number) => mobile ? element.matches("[data-canvas-connection-rail]") ? Math.max(48, 55 * scale) : 0 : 30;
            const extent = (scale: number) => ({ left: Math.min(world.x * scale, panel && !mobile ? panelAnchor * scale - panelWidth / 2 : Infinity), right: Math.max((world.x + world.width) * scale + portSpace(scale), panel && !mobile ? panelAnchor * scale + panelWidth / 2 : -Infinity) });
            let k = Math.min(1, Math.max(60, safe.height - panelHeight - 24) / world.height);
            {
                let low = 0, high = k;
                for (let i = 0; i < 24; i++) {
                    const mid = (low + high) / 2, fit = extent(mid);
                    if (fit.right - fit.left <= safe.width) low = mid;
                    else high = mid;
                }
                k = low;
            }
            k = Math.max(k, area.minimumScale || 0);
            const nodeSpace = safe.height - panelHeight - (panel ? 24 : 0);
            const fit = extent(k);
            // At the minimum touch zoom, retain the output port in the safe area
            // even when a wide source image cannot fit in the mobile viewport.
            const x = safe.x + Math.min((safe.width - (fit.right - fit.left)) / 2, safe.width - (fit.right - fit.left)) - fit.left;
            const next = { x: x - originX, y: safe.y + Math.max(0, (nodeSpace - world.height * k) / 2) - world.y * k - originY, k };
            if (!panel && !area.minimumScale) {
                // Remove clipped neighboring slivers only when the guided nodes
                // and their ports can stay completely inside the same safe area.
                for (const neighbor of document.querySelectorAll<HTMLElement>("[data-node-id]")) {
                    if (nodeElements.includes(neighbor)) continue;
                    const rect = neighbor.getBoundingClientRect();
                    const left = (rect.left - originX - current.x) / current.k * k + next.x + originX;
                    const right = left + rect.width / current.k * k;
                    const shift = left < 0 && right > 0 ? -right - 16 : right > window.innerWidth && left < window.innerWidth ? window.innerWidth - left + 16 : 0;
                    if (fit.left + next.x + originX + shift >= safe.x && fit.right + next.x + originX + shift <= safe.x + safe.width) next.x += shift;
                }
            }
            if (Math.abs(next.x - current.x) > 1 || Math.abs(next.y - current.y) > 1 || Math.abs(next.k - current.k) > 0.001) options.moveViewportTo(next, true);
            const table = nodeElements.flatMap((item) => [...item.querySelectorAll<HTMLElement>("[data-canvas-wheel-scroll]")]);
            for (const scroll of table) { scroll.scrollLeft = 0; scroll.scrollTop = 0; }
        },
        [options.viewportRef, options.moveViewportTo],
    );

    return { text, script, image, video, onStepChange, onReveal };
}
