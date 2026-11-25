import { memo, useId, useMemo } from "react";
import { canvasCoverViewport } from "@/lib/canvas/canvas-cover-layout";
import { resourceFileUrl, resourceIdFromStorageKey } from "@/services/api/resources";
import { CanvasNodeType, type CanvasNodeData, type CanvasConnection } from "@/types/canvas";
import { resolveCanvasAppearance, resolveCanvasGridColor, type CanvasAppearance } from "@/lib/canvas/canvas-appearance";
import { canvasThemes, type CanvasBackgroundMode } from "@/lib/canvas-theme";
import { useCanvasThemeStore } from "@/stores/canvas/use-canvas-theme-store";
import { CanvasReadonlyNodeContent } from "./canvas-readonly-node-content";
import { canvasConnectionPath } from "./canvas-connections";
import "./canvas-cover-preview.css";

export const COVER_NODE_LIMIT = 120;
export const COVER_CONNECTION_LIMIT = 180;

export function projectPreviewMedia(nodes: CanvasNodeData[], last = false) {
    const candidates = last ? [...nodes].reverse() : nodes;
    for (const node of candidates) {
        if (node.type !== CanvasNodeType.Image) continue;
        const storageKey = node.metadata?.storageKey;
        const id = resourceIdFromStorageKey(storageKey);
        const url = id ? resourceFileUrl(id) : node.metadata?.previewContent || node.metadata?.content;
        if (url) return { url, storageKey };
    }
    return undefined;
}

/** Sample across the whole canvas, retaining endpoints and original coordinates. */
export function coverVisibleNodes(nodes: CanvasNodeData[]) {
    if (nodes.length <= COVER_NODE_LIMIT) return nodes;
    return Array.from({ length: COVER_NODE_LIMIT }, (_, i) => nodes[Math.round(i * (nodes.length - 1) / (COVER_NODE_LIMIT - 1))]);
}

export const CanvasCoverPreview = memo(function CanvasCoverPreview({ nodes, connections = [], appearance, backgroundMode = "dots" }: { nodes: CanvasNodeData[]; connections?: CanvasConnection[]; appearance?: CanvasAppearance; backgroundMode?: CanvasBackgroundMode }) {
    const fallback = useCanvasThemeStore(state => state.theme);
    const resolved = resolveCanvasAppearance(appearance, fallback);
    const theme = canvasThemes[resolved.baseTheme];
    const pattern = useId();
    const view = useMemo(() => canvasCoverViewport(nodes, 640, 360), [nodes]);
    const visible = useMemo(() => coverVisibleNodes(nodes), [nodes]);
    const byId = useMemo(() => new Map(visible.map(node => [node.id, node])), [visible]);
    if (!view) return null;
    const grid = resolveCanvasGridColor(appearance, fallback, backgroundMode);
    const spacing = 48;
    return <svg className="canvas-cover-preview" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid meet" aria-hidden style={{ background: resolved.background }}>
        {backgroundMode !== "blank" ? <><defs><pattern id={pattern} width={spacing} height={spacing} patternUnits="userSpaceOnUse">{backgroundMode === "dots" ? <circle cx="1" cy="1" r=".8" fill={grid} /> : <path d={`M0,0 H${spacing} M0,0 V${spacing}`} stroke={grid} strokeWidth="1" />}</pattern></defs><rect width="640" height="360" fill={`url(#${pattern})`} opacity={backgroundMode === "dots" ? .34 : .46} /></> : null}
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {visible.filter(node => node.type === CanvasNodeType.Frame).map(node => <g key={node.id} data-cover-frame-id={node.id}><rect x={node.position.x} y={node.position.y} width={node.width} height={node.height} rx="16" fill={theme.frame.fill} stroke={theme.frame.stroke} /><text x={node.position.x + 16} y={node.position.y + 24} fill={theme.node.label} fontSize="14">{node.title}</text></g>)}
            {connections.slice(0, COVER_CONNECTION_LIMIT).map(edge => {
                const from = byId.get(edge.fromNodeId), to = byId.get(edge.toNodeId);
                if (!from || !to) return null;
                return <path key={edge.id} d={canvasConnectionPath(edge, from, to).pathD} fill="none" stroke={theme.node.muted} strokeWidth={Math.min(3, 1 / view.k)} opacity=".5" />;
            })}
            {visible.filter(node => node.type !== CanvasNodeType.Frame).map(node => <foreignObject key={node.id} x={node.position.x} y={node.position.y} width={node.width} height={node.height} data-cover-node-id={node.id}>
                <div className="canvas-cover-preview-node" style={{ background: node.type === CanvasNodeType.Image ? "transparent" : theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text }}>
                    <CanvasReadonlyNodeContent node={node} theme={theme} />
                </div>
            </foreignObject>)}
        </g>
    </svg>;
});
