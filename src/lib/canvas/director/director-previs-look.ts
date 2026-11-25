import { ACESFilmicToneMapping, SRGBColorSpace } from "three/src/constants.js";
import type { DirectorObject, DirectorVec3 } from "@/types/director";

// 外观参数改动时手动递增，令已有预演缓存失效。
export const PREVIS_LOOK_VERSION = 7;

export const PREVIS_PALETTE = {
    actorShell: "#d8d6c9",
    actorJoint: "#272c2c",
    studioGrid: "#83796a",
    studioGridSection: "#6b6256",
    lensTrail: "#bea168",
    lensMarker: "#eee8dc",
    actor: "#ededed",
    wall: "#e1e1e1",
    ground: "#d5d5d5",
    prop: "#e5e5e5",
    background: "#eeeeee",
    propDetail: "#c6c6c6",
    rug: "#b7b7b7",
    rugThread: "#c6c6c6",
    paper: "#f3f3f3",
    glass: "#dcdcdc",
    light: "#ffffff",
    hemisphereGround: "#a5a5a5",
    shadow: "#000000",
    gridCell: "#c6cdd7",
    gridSection: "#9ba5b4",
    route: "#61d2ad",
    routeEnd: "#f08b6a",
    routeProgress: "#f0d36a",
    camera: "#78a9ff",
    cameraWarning: "#ed6060",
    selected: "#4f8cff",
    selectedBone: "#ffcc00",
    cameraAccents: ["#5eead4", "#78a9ff", "#f6c667", "#ec8db7", "#a98bff", "#ff9b72"],
    cameraBody: "#182534",
    cameraBodySelected: "#1f3343",
    cameraEdge: "#3d5064",
    cameraLens: "#0f1824",
    cameraLensSelected: "#111e2b",
    cameraGlint: "#ecffff",
    cameraViewfinder: "#101b28",
    cameraBase: "#101a27",
} as const;

export const PREVIS_MATERIAL = { roughness: 0.85, metalness: 0 } as const;

export const PREVIS_LIGHTING = {
    key: { position: [4, 6, 4] as DirectorVec3, color: PREVIS_PALETTE.light, intensity: 2.4, castShadow: true },
    fill: { position: [-4, 3, -2] as DirectorVec3, color: PREVIS_PALETTE.light, intensity: 0.84, castShadow: false },
    hemisphere: { skyColor: PREVIS_PALETTE.light, groundColor: PREVIS_PALETTE.hemisphereGround, intensity: 0.65 },
    ambientIntensity: 0.25,
    beautyAmbientScale: 0.35,
    shadow: { radius: 4, normalBias: 0.008, extent: 8 },
    contact: { position: [0, -0.008, 0] as DirectorVec3, scale: 18, opacity: 0.38, blur: 1.1, far: 0.65, frames: Infinity, color: PREVIS_PALETTE.shadow },
} as const;

export const PREVIS_QUALITY = {
    high: { maxDpr: 1.5, shadowMapSize: 1024, contactShadows: true, contactResolution: 512, contactSmooth: true, environmentEffects: true },
    low: { maxDpr: 1, shadowMapSize: 512, contactShadows: true, contactResolution: 256, contactSmooth: false, environmentEffects: false },
} as const;

export function resolvePrevisQuality(devicePixelRatio: number) {
    const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const tier = ratio <= 1 ? "low" : "high";
    const quality = PREVIS_QUALITY[tier];
    return { ...quality, tier, dpr: Math.max(1, Math.min(ratio, quality.maxDpr)) };
}

// primitive 没有表面角色字段；薄盒沿最短轴区分地面与墙面，不依赖名称或模板 ID。
export function resolvePrevisPrimitiveColor(object: Pick<DirectorObject, "primitive" | "transform">) {
    if (object.primitive === "plane") return PREVIS_PALETTE.wall;
    if (object.primitive === "box") {
        const [x, y, z] = object.transform.scale.map(Math.abs);
        if (y < Math.min(x, z) * 0.25) return PREVIS_PALETTE.ground;
        if (Math.min(x, z) < y * 0.25) return PREVIS_PALETTE.wall;
    }
    return PREVIS_PALETTE.prop;
}

export const PREVIS_OUTPUT_COLOR_SPACE = SRGBColorSpace;
export const PREVIS_TONE_MAPPING = ACESFilmicToneMapping;
export const PREVIS_EXPOSURE = 1.0;
