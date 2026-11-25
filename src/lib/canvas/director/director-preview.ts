import type { DirectorScene, DirectorShot } from "../../../types/director";

/** 预览来源的判定结果。image 之外都不渲染 <img>。 */
export type DirectorPreviewSource = { kind: "image"; url: string; storageKey?: string } | { kind: "loading" } | { kind: "empty" };

/** 读取画布节点正文和持久化资源键；刷新后正文可能被清理，但 storageKey 仍可恢复预览。 */
export type DirectorNodeContentReader = (nodeId: string | undefined) => string | { content?: string; storageKey?: string } | undefined;

function usableContent(read: DirectorNodeContentReader, nodeId: string | undefined) {
    if (!nodeId) return null;
    const value = read(nodeId);
    if (!value) return null;
    const content = (typeof value === "string" ? value : value.content)?.trim() || "";
    const storageKey = typeof value === "string" ? undefined : value.storageKey;
    if (!content && !storageKey) return null;
    return { url: content, storageKey };
}

/** 取当前镜头：优先 metadata 指定，其次场景第一个。 */
export function resolveDirectorActiveShot(scene: DirectorScene | null, shotId: string | undefined): DirectorShot | undefined {
    if (!scene) return undefined;
    return scene.shots?.find((item) => item.id === shotId) || scene.shots?.[0];
}

/**
 * 预览来源优先级（严格自上而下）：
 * 1. node.metadata.directorPreviewNodeId 指向的画布节点正文
 * 2. 当前 DirectorShot.previewNodeId 指向的画布节点正文（补 metadata 丢失）
 * 3. scene 为 null：场景尚在准备（loading）
 * 4. 其余：诚实空态
 * 不改动任何 scene/node 状态，只做读取判定。
 */
export function resolveDirectorPreviewSource(input: { scene: DirectorScene | null; shot: DirectorShot | undefined; previewNodeId: string | undefined; readNodeContent: DirectorNodeContentReader }): DirectorPreviewSource {
    const fromMetadata = usableContent(input.readNodeContent, input.previewNodeId);
    if (fromMetadata) return { kind: "image", ...fromMetadata };
    const fromShot = usableContent(input.readNodeContent, input.shot?.previewNodeId);
    if (fromShot) return { kind: "image", ...fromShot };
    if (!input.scene) return { kind: "loading" };
    return { kind: "empty" };
}

/**
 * 加载失败的门控：记录「失败的那个 URL」而不是布尔标记。
 * 语义边界：新给出的坏 URL 仍会先渲染一次，浏览器随后才发出 onError —— 无法避免这一帧。
 * 本门控保证的是：同一个已失败的 URL 不会被反复渲染，且换成另一个 URL 时自动重试，
 * 无需外部手动清理标记。
 */
export function gateDirectorPreviewFailure(source: DirectorPreviewSource, failedUrl: string | null): DirectorPreviewSource {
    if (source.kind !== "image" || !failedUrl) return source;
    const sourceKey = source.url || source.storageKey || "";
    return sourceKey === failedUrl ? { kind: "empty" } : source;
}

export type DirectorPreviewRequest = {
    canvasId?: string;
    sceneId?: string;
    shotId?: string;
    previewRequestId?: string;
    duration?: number;
    fps?: number;
};

// Retain the live request while the lazy workbench mounts. Historical events
// never enqueue browser work; the panel only dispatches live completions.
let pendingPreview: DirectorPreviewRequest | null = null;
const dispatchedPreviews = new Set<string>();
export function dispatchDirectorPreview(request: DirectorPreviewRequest) {
    const key = directorPreviewRequestKey(request);
    if (dispatchedPreviews.has(key)) return;
    dispatchedPreviews.add(key);
    if (dispatchedPreviews.size > 64) dispatchedPreviews.delete(dispatchedPreviews.values().next().value!);
    pendingPreview = request;
    window.dispatchEvent(new CustomEvent("director:preview-requested", { detail: request }));
}
export function pendingDirectorPreview() {
    return pendingPreview;
}
export function consumeDirectorPreview(request: DirectorPreviewRequest) {
    if (pendingPreview && directorPreviewRequestKey(pendingPreview) === directorPreviewRequestKey(request)) pendingPreview = null;
}

/** 用后端 request id 去重；旧事件没有 request id 时退回到稳定的请求参数组合。 */
export function directorPreviewRequestKey(request: DirectorPreviewRequest) {
    const requestId = request.previewRequestId?.trim();
    if (requestId) return `id:${requestId}`;
    return ["fallback", request.canvasId?.trim() || "", request.sceneId?.trim() || "", request.shotId?.trim() || "", Number.isFinite(request.duration) ? String(request.duration) : "", Number.isFinite(request.fps) ? String(request.fps) : ""].join(":");
}

/** Agent 事件只有命中当前画布、场景和活动镜头时才允许触发浏览器录制。 */
export function isDirectorPreviewRequestForWorkbench(input: { request: DirectorPreviewRequest; canvasId?: string; sceneId?: string; activeShotId?: string }) {
    const requestSceneId = input.request.sceneId?.trim();
    if (!requestSceneId || requestSceneId !== input.sceneId) return false;
    const requestCanvasId = input.request.canvasId?.trim();
    if (!input.canvasId || requestCanvasId !== input.canvasId) return false;
    const requestShotId = input.request.shotId?.trim();
    if (requestShotId && requestShotId !== input.activeShotId) return false;
    return true;
}
