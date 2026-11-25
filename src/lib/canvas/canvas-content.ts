import { canonicalize } from "json-canonicalize";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";

const documentNodes = new WeakMap<CanvasProject["nodes"], CanvasProject["nodes"]>();
function nodesWithoutProgress(nodes: CanvasProject["nodes"]) {
    const cached = documentNodes.get(nodes);
    if (cached) return cached;
    const content = nodes.map((node) => {
        if (!node?.metadata) return node;
        const { taskProgress: _progress, taskStage: _stage, taskUpdatedAt: _updated, fileUploadProgress: _upload, ...metadata } = node.metadata;
        return { ...node, metadata };
    });
    documentNodes.set(nodes, content);
    return content;
}

// These fields describe local viewing / synchronization, not an edit to the document.
export function canvasContentSnapshot(project: CanvasProject) {
    const { viewport: _viewport, updatedAt: _updatedAt, revision: _revision, remoteContentHash: _hash, coverSnapshot: _legacyCover, ...content } = project;
    // Explicit presentation is document content; automatic cover candidates stay in read models.
    // Task identity, terminal status and results remain durable. Polling ticks
    // are read models and must not create a new cloud revision on every update.
    return { ...content, nodes: nodesWithoutProgress(content.nodes), projectId: content.projectId || undefined };
}

export function sameCanvasContent(left: CanvasProject | undefined, right: CanvasProject | undefined) {
    if (left === right) return true;
    if (!left || !right) return false;
    const a = canvasContentSnapshot(left) as Record<string, unknown>;
    const b = canvasContentSnapshot(right) as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((key) => sameCanonicalValue(a[key], b[key]));
}

function sameCanonicalValue(left: unknown, right: unknown): boolean {
    if (left === right) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
        if (left.length !== right.length) return false;
        for (let index = 0; index < left.length; index++) {
            if (!sameCanonicalValue(left[index] ?? null, right[index] ?? null)) return false;
        }
        return true;
    }
    if (left && right && typeof left === "object" && typeof right === "object" && Object.getPrototypeOf(left) === Object.prototype && Object.getPrototypeOf(right) === Object.prototype) {
        const a = left as Record<string, unknown>,
            b = right as Record<string, unknown>;
        if (typeof a.toJSON === "function" || typeof b.toJSON === "function") return canonicalize(a) === canonicalize(b);
        const keys = Object.keys(a).filter((key) => a[key] !== undefined);
        // JSON omits undefined object fields. Walk only changed references, down
        // to the edited row/field, without serializing the rest of its metadata.
        return keys.length === Object.keys(b).filter((key) => b[key] !== undefined).length && keys.every((key) => Object.hasOwn(b, key) && sameCanonicalValue(a[key], b[key]));
    }
    return canonicalize(left) === canonicalize(right);
}

/** A remote snapshot changes only the nodes whose actual data changed. */
export function shareUnchangedCanvasNodes(previous: CanvasProject["nodes"] | undefined, next: CanvasProject["nodes"]) {
    if (!previous) return next;
    const byId = new Map(previous.map((node) => [node.id, node]));
    return next.map((node) => {
        const before = byId.get(node.id);
        return before && sameCanonicalValue(before, node) ? before : node;
    });
}

type ContentSnapshot = ReturnType<typeof canvasContentSnapshot>;
const contentHashes = new WeakMap<CanvasProject["nodes"], { content: ContentSnapshot; hash: Promise<string> }>();

// Store updates are immutable. Reuse a hash across viewport/revision-only copies;
// any content field/reference change invalidates it. Weak keys bound its lifetime.
export function canvasContentHash(project: CanvasProject): Promise<string> {
    const content = canvasContentSnapshot(project);
    const cached = contentHashes.get(project.nodes);
    if (cached && sameContentReferences(cached.content, content)) return cached.hash;
    const hash = hashContent(content);
    contentHashes.set(project.nodes, { content, hash });
    void hash.catch(() => {
        if (contentHashes.get(project.nodes)?.hash === hash) contentHashes.delete(project.nodes);
    });
    return hash;
}

function sameContentReferences(a: ContentSnapshot, b: ContentSnapshot) {
    const keys = Object.keys(a) as (keyof ContentSnapshot)[];
    return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

async function hashContent(content: ContentSnapshot) {
    const serialized = canonicalize(content);
    // LAN HTTP deployments may lack Web Crypto. Keep an exact baseline there;
    // a lossy checksum could incorrectly discard an unsaved draft during login.
    if (!globalThis.crypto?.subtle) return `json:${serialized}`;
    const bytes = new TextEncoder().encode(serialized);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
