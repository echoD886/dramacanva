import type { DirectorVec3 } from "@/types/director";
import previsTemplates from "./previs-templates.json";

export type DirectorAssetAnchor = { position: DirectorVec3; yaw?: number };
export type DirectorAssetEntry = {
    id: string;
    type: "prop" | "template-part";
    version: number;
    size: DirectorVec3;
    localBounds: { min: DirectorVec3; max: DirectorVec3 };
    groundAnchor: DirectorVec3;
    anchors: Record<string, DirectorAssetAnchor>;
};

/** XZ 平面的米制坐标；孔洞为不可行走的障碍投影，边界本身不属于内部。 */
export type DirectorGroundPolygon = { outline: [number, number][]; holes: [number, number][][] };
export type DirectorTemplateMetadata = {
    id: string;
    version: number;
    walkableArea: DirectorGroundPolygon;
    obstacles: { objectId: string; assetId: string; polygon: [number, number][] }[];
    size: DirectorVec3;
    anchors: Record<string, { position: DirectorVec3; kind: "ground" | "seat"; objectId?: string }>;
    actorSpawns: DirectorVec3[];
    objects: { id: string; assetId: string; position: DirectorVec3 }[];
};

function asset(id: string, min: DirectorVec3, max: DirectorVec3, anchors: DirectorAssetEntry["anchors"] = {}, type: DirectorAssetEntry["type"] = "prop"): DirectorAssetEntry {
    return { id, type, version: 1, size: max.map((value, axis) => Number((value - min[axis]).toFixed(6))) as DirectorVec3, localBounds: { min, max }, groundAnchor: [0, min[1], 0], anchors };
}

// 局部范围包住完整几何（含把手、支架、悬挂件）；原点保留各道具的渲染约定。
export const DIRECTOR_ASSET_REGISTRY: Readonly<Record<string, DirectorAssetEntry>> = {
    plant: asset("plant", [-0.44, 0, -0.44], [0.44, 1.475, 0.44]),
    rug: asset("rug", [-2.4, -0.01, -1.6], [2.4, 0.011, 1.6]),
    "ceiling-light": asset("ceiling-light", [-1, -0.042, -0.06], [1, 0.24, 0.06]),
    "conference-table": asset("conference-table", [-1.3, 0, -0.65], [1.3, 0.76, 0.65]),
    "office-chair": asset("office-chair", [-0.35, 0, -0.35], [0.35, 1.15, 0.35], { seatAnchor: { position: [0, 0.62, 0.04], yaw: 0 }, approachPoint: { position: [0, 0, 0.9], yaw: Math.PI } }),
    sofa: asset("sofa", [-1.12, 0, -0.46], [1.12, 0.95, 0.44], { seatAnchor: { position: [0, 0.675, 0.04], yaw: 0 }, approachPoint: { position: [0, 0, 1.05], yaw: Math.PI } }),
    bed: asset("bed", [-0.925, 0.075, -1.13], [0.925, 1.025, 1.1]),
    door: asset("door", [-0.545, 0, -0.06], [0.545, 2.385, 0.08]),
    window: asset("window", [-1.15, -0.93, -0.05], [1.15, 0.8725, 0.17]),
    whiteboard: asset("whiteboard", [-0.825, -0.56, -0.0325], [0.825, 0.525, 0.125]),
    car: asset("car", [-0.965, 0.02, -2.15], [0.965, 1.47, 2.18]),
    phone: asset("phone", [-0.0375, 0, -0.0045], [0.0375, 0.15, 0.007]),
    cup: asset("cup", [-0.075, 0, -0.075], [0.089, 0.146, 0.075]),
    document: asset("document", [-0.15, -0.009, -0.11], [0.15, 0.01775, 0.1115]),
    bench: asset("bench", [-1.2, 0, -0.3], [1.2, 1.1, 0.3], { seatAnchor: { position: [0, 0.63, 0.05], yaw: 0 }, approachPoint: { position: [0, 0, 0.95], yaw: Math.PI } }),
    "platform-column": asset("platform-column", [-0.225, 0, -0.225], [0.225, 3.4, 0.225]),
    "platform-ground": asset("platform-ground", [-8, -0.1, -3], [8, 0.1, 3], {}, "template-part"),
    "platform-edge": asset("platform-edge", [-8, -0.05, -0.1], [8, 0.05, 0.1], {}, "template-part"),
    "platform-background-wall": asset("platform-background-wall", [-8, -1.7, -0.1], [8, 1.7, 0.1], {}, "template-part"),
};

export function getDirectorAsset(id: string): DirectorAssetEntry | undefined {
    return Object.hasOwn(DIRECTOR_ASSET_REGISTRY, id) ? DIRECTOR_ASSET_REGISTRY[id] : undefined;
}

export const PREVIS_TEMPLATES = previsTemplates as unknown as DirectorTemplateMetadata[];
export const SUBWAY_PLATFORM_TEMPLATE = PREVIS_TEMPLATES[0];
